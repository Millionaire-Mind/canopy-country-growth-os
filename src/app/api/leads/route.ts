import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";

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

  const body = await request.json();

  const {
    firstName,
    lastName,
    email,
    phone,
    source = "UNKNOWN",
    department = "UNKNOWN",
    interestType,
    landingPage,
  } = body ?? {};

  if (!firstName || !lastName) {
    return NextResponse.json({ error: "firstName and lastName are required." }, { status: 400 });
  }

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
