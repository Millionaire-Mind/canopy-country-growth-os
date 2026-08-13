import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseCsv } from "@/lib/csv";

// V1 CSV lead importer — the documented fallback for any CRM without an API integration
// (see docs/INTEGRATIONS.md). Expected columns: firstName, lastName, email, phone,
// source, department, interestType, landingPage, createdAt (ISO date, optional).
// Unknown/missing source is stored as "UNKNOWN" — never guessed.

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  const text = await file.text();
  const rows = parseCsv(text);

  if (rows.length === 0) {
    return NextResponse.json({ error: "CSV had no data rows." }, { status: 400 });
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

    const createdAt = row.createdAt ? new Date(row.createdAt) : new Date();
    if (isNaN(createdAt.getTime())) {
      errors.push(`Row ${i + 2}: unparseable createdAt "${row.createdAt}" — used current time instead.`);
    }

    const customer = await prisma.customer.create({
      data: {
        firstName,
        lastName,
        email: row.email || null,
        phone: row.phone || null,
        isSampleData: false,
      },
    });

    await prisma.lead.create({
      data: {
        customerId: customer.id,
        createdAt: isNaN(createdAt.getTime()) ? new Date() : createdAt,
        source: row.source || "UNKNOWN",
        department: row.department || "UNKNOWN",
        interestType: row.interestType || null,
        landingPage: row.landingPage || null,
        isSampleData: false,
      },
    });

    imported += 1;
  }

  return NextResponse.json({ imported, errors });
}
