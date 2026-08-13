import { prisma } from "@/lib/db";

// Engine 2 — Opportunity Engine. Builds on the alert rules in alerts.ts (see
// docs/ARCHITECTURE.md §7) by ranking individual leads instead of just counting them.
// Every opportunity is derived from real lead/appointment/sale fields already in the
// database — nothing here is predicted, scraped, or ML-ranked. Where an effect size
// isn't legitimately estimable from the data on hand, the field says so ("UNKNOWN")
// rather than inventing a number.

export type OpportunityCategory = "URGENT_FOLLOWUP" | "STALE_LEAD" | "HIGH_VALUE_GAP";
export type OpportunityPriority = "DO_NOW" | "DO_NEXT" | "TEST" | "BACKLOG" | "REJECT";

export interface Opportunity {
  leadId: string;
  customerName: string;
  category: OpportunityCategory;
  // Internal ranking signal only (recency + a small high-value-interest bonus) — not
  // presented as a precise business-impact score, since the data doesn't support that
  // precision. Used purely to order the list.
  score: number;
  what: string;
  why: string;
  evidence: string;
  estimatedEffect: string;
  requiredAction: string;
  owner: string;
  priority: OpportunityPriority;
  measurementPlan: string;
}

export interface LeadForOpportunity {
  id: string;
  status: string;
  createdAt: Date;
  firstResponseAt: Date | null;
  appointmentId: string | null;
  interestType: string | null;
  assignedTo: string | null;
  customerName: string;
}

const UNANSWERED_BASE_SCORE = 50;
const STALE_BASE_SCORE = 20;
const HIGH_VALUE_INTEREST_BONUS = 20;

function isHighValueInterest(interestType: string | null): boolean {
  return !!interestType && /new rv/i.test(interestType);
}

// Pure function — no I/O — so it can be exercised directly in tests with fixed leads and
// a fixed `now`.
export function rankLeadOpportunities(leads: LeadForOpportunity[], now: Date = new Date()): Opportunity[] {
  const opportunities: Opportunity[] = [];

  for (const lead of leads) {
    const ageHours = (now.getTime() - lead.createdAt.getTime()) / (1000 * 60 * 60);
    const owner = lead.assignedTo ?? "UNASSIGNED";

    if (lead.status === "NEW" && !lead.firstResponseAt) {
      let score = UNANSWERED_BASE_SCORE + Math.min(ageHours, 48);
      if (isHighValueInterest(lead.interestType)) score += HIGH_VALUE_INTEREST_BONUS;
      opportunities.push({
        leadId: lead.id,
        customerName: lead.customerName,
        category: "URGENT_FOLLOWUP",
        score,
        what: `Lead unanswered for ${Math.floor(ageHours)}h${lead.interestType ? ` (${lead.interestType})` : ""}`,
        why: "Unanswered leads are the most time-sensitive point in the funnel — response time directly affects whether this lead becomes an appointment.",
        evidence: `Created ${lead.createdAt.toISOString()}; no firstResponseAt recorded.`,
        estimatedEffect: "UNKNOWN — depends on this lead's eventual outcome, not yet known.",
        requiredAction: "Contact this lead now.",
        owner,
        priority: "DO_NOW",
        measurementPlan: "Track time from lead creation to firstResponseAt once contacted.",
      });
      continue;
    }

    if (["CONTACTED", "ENGAGED"].includes(lead.status) && !lead.appointmentId) {
      const ageDays = ageHours / 24;
      if (ageDays >= 3) {
        let score = STALE_BASE_SCORE + Math.min(ageDays, 14);
        if (isHighValueInterest(lead.interestType)) score += HIGH_VALUE_INTEREST_BONUS;
        opportunities.push({
          leadId: lead.id,
          customerName: lead.customerName,
          category: "STALE_LEAD",
          score,
          what: `${lead.status} for ${Math.floor(ageDays)}d with no appointment scheduled`,
          why: "A contacted lead that never reaches an appointment is stalling at the stage where most funnel drop-off happens.",
          evidence: `Status ${lead.status}; created ${lead.createdAt.toISOString()}; no appointmentId on file.`,
          estimatedEffect: "UNKNOWN — depends on this lead's eventual outcome, not yet known.",
          requiredAction: "Follow up to schedule an appointment, or move to LOST/NURTURE if unresponsive.",
          owner,
          priority: "DO_NEXT",
          measurementPlan: "Track whether this lead reaches APPOINTMENT status within 7 days of this follow-up.",
        });
      }
      continue;
    }
  }

  return opportunities.sort((a, b) => b.score - a.score);
}

// `sampleOnly` defaults to false (real data only) — see the note on getLeadsForMetrics
// in src/lib/metrics.ts for why management-facing lists must not blend sample records
// into the real opportunity queue.
export async function getTopOpportunities(limit = 10, sampleOnly = false): Promise<Opportunity[]> {
  const leads = await prisma.lead.findMany({
    where: { isSampleData: sampleOnly, status: { in: ["NEW", "CONTACTED", "ENGAGED", "SOLD_RO_OPENED"] } },
    include: { sales: true, customer: true },
  });

  const nameFor = (customer: { firstName: string; lastName: string } | null) =>
    customer ? `${customer.firstName} ${customer.lastName}` : "Unknown";

  const rankable: LeadForOpportunity[] = leads.map((l) => ({
    id: l.id,
    status: l.status,
    createdAt: l.createdAt,
    firstResponseAt: l.firstResponseAt,
    appointmentId: l.appointmentId,
    interestType: l.interestType,
    assignedTo: l.assignedTo,
    customerName: nameFor(l.customer),
  }));

  const opportunities = rankLeadOpportunities(rankable);

  // SOLD_RO_OPENED with no linked sale is a data-entry gap with real gross profit at
  // stake — same condition alerts.ts already flags in aggregate, ranked here per-lead.
  for (const lead of leads) {
    if (lead.status === "SOLD_RO_OPENED" && lead.sales.length === 0) {
      opportunities.push({
        leadId: lead.id,
        customerName: nameFor(lead.customer),
        category: "HIGH_VALUE_GAP",
        score: 90,
        what: "Marked SOLD/RO OPENED but has no linked sale record",
        why: "Without a linked Sale record, this deal's revenue and gross profit are invisible to every dashboard metric that reads from the sales table.",
        evidence: "Lead status is SOLD_RO_OPENED; 0 linked Sale records.",
        estimatedEffect: "UNKNOWN — depends on the actual deal value, which isn't entered.",
        requiredAction: "Enter the sale record (price, front gross, F&I gross) for this deal.",
        owner: lead.assignedTo ?? "UNASSIGNED",
        priority: "DO_NOW",
        measurementPlan: "Confirm a Sale record exists for this lead and its totals reconcile with the deal.",
      });
    }
  }

  return opportunities.sort((a, b) => b.score - a.score).slice(0, limit);
}
