import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseCsv, validateCsvFileSize, validateCsvRows, CsvValidationError, CSV_LIMITS } from "@/lib/csv";
import { requireSession } from "@/lib/require-session";

// Google Search Console CSV export fallback — used until a live GSC API connection
// exists (see docs/INTEGRATIONS.md). GSC's own "Export > CSV" from the Performance
// report uses these column names. Expected columns: url (or page), query, clicks,
// impressions, ctr, position, date (optional, ISO — defaults to today).
// pageType/businessLine are not in a GSC export, so a newly-seen url is catalogued as
// "UNKNOWN" rather than guessed — matching how Lead.source/Lead.department already
// handle unknown attribution.

export async function POST(request: NextRequest) {
  const { session, response } = await requireSession();
  if (!session) return response;

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
    const url = (row.url || row.page || "").trim();
    const query = row.query?.trim();

    if (!url || !query) {
      errors.push(`Row ${i + 2}: missing url/page or query — skipped.`);
      continue;
    }

    const clicks = Number(row.clicks) || 0;
    const impressions = Number(row.impressions) || 0;
    const ctr = row.ctr && !isNaN(Number(row.ctr)) ? Number(row.ctr) : null;
    const position = row.position && !isNaN(Number(row.position)) ? Number(row.position) : null;
    const dateInput = row.date ? new Date(row.date) : new Date();
    const date = isNaN(dateInput.getTime()) ? new Date() : dateInput;

    try {
      await prisma.$transaction(async (tx) => {
        const page = await tx.webPage.upsert({
          where: { url },
          create: {
            url,
            pageType: "UNKNOWN",
            businessLine: "UNKNOWN",
            isSampleData: false,
          },
          update: {},
        });

        await tx.searchPerformance.create({
          data: {
            date,
            pageId: page.id,
            query,
            clicks,
            impressions,
            ctr,
            position,
            isSampleData: false,
          },
        });
      });
      imported += 1;
    } catch {
      errors.push(`Row ${i + 2}: failed to import — see server logs.`);
    }
  }

  return NextResponse.json({ imported, errors });
}
