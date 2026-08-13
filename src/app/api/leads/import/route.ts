import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseCsv, validateCsvFileSize, validateCsvRows, CsvValidationError, CSV_LIMITS } from "@/lib/csv";
import { requireSession } from "@/lib/require-session";

// V1 CSV lead importer — the documented fallback for any CRM without an API integration
// (see docs/INTEGRATIONS.md). Expected columns: firstName, lastName, email, phone,
// source, department, interestType, landingPage, createdAt (ISO date, optional).
// Unknown/missing source is stored as "UNKNOWN" — never guessed.

export async function POST(request: NextRequest) {
  const { session, response } = await requireSession();
  if (!session) return response;

  // Reject by Content-Length before the multipart body is fully buffered into memory —
  // the per-file size check below still applies, but this stops a request from being
  // parsed at all if the whole payload is already implausibly large.
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > CSV_LIMITS.maxFileSizeBytes * 2) {
    return NextResponse.json({ error: "Request body too large." }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Malformed upload — expected multipart form data." }, { status: 400 });
  }
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  try {
    validateCsvFileSize(file);
  } catch (err) {
    if (err instanceof CsvValidationError) {
      return NextResponse.json({ error: err.message }, { status: 413 });
    }
    throw err;
  }

  const text = await file.text();
  const rows = parseCsv(text);

  if (rows.length === 0) {
    return NextResponse.json({ error: "CSV had no data rows." }, { status: 400 });
  }

  try {
    validateCsvRows(rows);
  } catch (err) {
    if (err instanceof CsvValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  let imported = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const firstName = row.firstName?.trim();
    const lastName = row.lastName?.trim();

    if (!firstName || !lastName) {
      errors.push(`Row ${i + 2}: missing firstName or lastName — skipped.`);
      continue;
    }

    const createdAtInput = row.createdAt ? new Date(row.createdAt) : new Date();
    const createdAt = isNaN(createdAtInput.getTime()) ? new Date() : createdAtInput;
    if (isNaN(createdAtInput.getTime()) && row.createdAt) {
      errors.push(`Row ${i + 2}: unparseable createdAt — used current time instead.`);
    }

    // Customer + lead are created together per row so a mid-row failure never leaves an
    // orphaned customer with no lead attached.
    try {
      await prisma.$transaction(async (tx) => {
        const customer = await tx.customer.create({
          data: {
            firstName,
            lastName,
            email: row.email || null,
            phone: row.phone || null,
            isSampleData: false,
          },
        });

        await tx.lead.create({
          data: {
            customerId: customer.id,
            createdAt,
            source: row.source || "UNKNOWN",
            department: row.department || "UNKNOWN",
            interestType: row.interestType || null,
            landingPage: row.landingPage || null,
            isSampleData: false,
          },
        });
      });
      imported += 1;
    } catch {
      // Never echo raw row content (may contain a customer's PII) back into the response.
      errors.push(`Row ${i + 2}: failed to import — see server logs.`);
    }
  }

  return NextResponse.json({ imported, errors, rowLimit: CSV_LIMITS.maxRows });
}
