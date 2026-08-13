import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const VALID_STATUSES = [
  "NEW",
  "CONTACTED",
  "ENGAGED",
  "APPOINTMENT",
  "SHOWED",
  "SOLD_RO_OPENED",
  "LOST",
  "NURTURE",
];

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();
  const { status, assignedTo } = body ?? {};

  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (status) data.status = status;
  if (assignedTo !== undefined) data.assignedTo = assignedTo;
  // First status change out of NEW counts as the first human response, if not already set.
  if (status && status !== "NEW" && !existing.firstResponseAt) {
    data.firstResponseAt = new Date();
  }

  const lead = await prisma.lead.update({ where: { id }, data });
  return NextResponse.json(lead);
}
