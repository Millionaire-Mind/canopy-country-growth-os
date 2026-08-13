import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";

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
  const { session, response } = await requireSession();
  if (!session) return response;

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed JSON body." }, { status: 400 });
  }
  const { status, assignedTo } = (body as Record<string, unknown>) ?? {};

  if (status !== undefined && typeof status !== "string") {
    return NextResponse.json({ error: "status must be a string." }, { status: 400 });
  }
  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  if (assignedTo !== undefined && assignedTo !== null && typeof assignedTo !== "string") {
    return NextResponse.json({ error: "assignedTo must be a string or null." }, { status: 400 });
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
  // A status change is a tracked contact action — record it. Never backfilled from
  // createdAt elsewhere, so this PATCH is the only place lastContactAt is set.
  if (status) {
    data.lastContactAt = new Date();
  }

  const lead = await prisma.lead.update({ where: { id }, data });
  return NextResponse.json(lead);
}
