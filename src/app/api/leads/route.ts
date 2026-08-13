import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export async function GET() {
  const { session, response } = await requireSession();
  if (!session) return response;

  const leads = await prisma.lead.findMany({
    include: { customer: true, appointment: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(leads);
}

// Manual single-lead creation, e.g. for a future website-form webhook (see
// docs/INTEGRATIONS.md). Not wired to any live source in V1.
export async function POST(request: NextRequest) {
  const { session, response } = await requireSession();
  if (!session) return response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed JSON body." }, { status: 400 });
  }

  const raw = (body as Record<string, unknown>) ?? {};
  const firstName = asOptionalString(raw.firstName);
  const lastName = asOptionalString(raw.lastName);

  if (!firstName || !lastName) {
    return NextResponse.json({ error: "firstName and lastName are required." }, { status: 400 });
  }

  const email = asOptionalString(raw.email);
  const phone = asOptionalString(raw.phone);
  const source = asOptionalString(raw.source) ?? "UNKNOWN";
  const department = asOptionalString(raw.department) ?? "UNKNOWN";
  const interestType = asOptionalString(raw.interestType);
  const landingPage = asOptionalString(raw.landingPage);

  const customer = await prisma.customer.create({
    data: { firstName, lastName, email, phone, isSampleData: false },
  });

  const lead = await prisma.lead.create({
    data: {
      customerId: customer.id,
      source,
      department,
      interestType,
      landingPage,
      isSampleData: false,
    },
  });

  return NextResponse.json(lead, { status: 201 });
}
