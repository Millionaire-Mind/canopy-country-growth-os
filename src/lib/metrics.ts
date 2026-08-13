import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// Engine 1 — Measurement & Revenue Intelligence.
// These functions compute only what the current data can support. Anything that would
// require an unconnected integration (e.g. GA4 visitor counts) is returned as `null` so
// the UI can render "DATA REQUIRED" instead of a fabricated number.

export function rate(numerator: number, denominator: number): number | null {
  if (!denominator) return null;
  return numerator / denominator;
}

export function formatRate(r: number | null): string {
  if (r === null) return "DATA REQUIRED";
  return `${(r * 100).toFixed(1)}%`;
}

// Prisma returns money columns as Decimal instances (decimal.js), not numbers — `+` on
// two Decimals concatenates their string forms instead of adding, so every read site has
// to convert explicitly. See prisma/schema.prisma's Decimal comment.
export function toNum(d: Prisma.Decimal | number | null | undefined): number {
  if (d === null || d === undefined) return 0;
  return typeof d === "number" ? d : d.toNumber();
}

const QUALIFIED_STATUSES = ["ENGAGED", "APPOINTMENT", "SHOWED", "SOLD_RO_OPENED"];

export interface LeadForCohort {
  status: string;
  appointment: { showed: boolean | null } | null;
  sales: unknown[];
}

export interface CohortFunnelCounts {
  totalLeads: number;
  qualifiedLeads: number;
  leadsWithAppointment: number;
  leadsShowed: number;
  leadsShowedAndSold: number;
  leadsSold: number;
}

// Pure, DB-free cohort counting — the actual fix for the false-100%-Show→Close bug.
// Each count below is derived from the SAME set of leads at each stage — never as a
// ratio of two independently-counted tables. Two unrelated tables can each report "1"
// (one appointment showed; one sale happened) while representing two different people,
// which would render a false 100% Show → Close rate. Counting through the lead relation
// instead of `appointment.count()` / `sale.count()` is what prevents that. See the seed
// fixture (Dana shows without buying, Priya buys without an appointment on file) and
// tests/cohort-funnel.test.ts for the regression case this guards against.
export function computeCohortFunnel(leads: LeadForCohort[]): CohortFunnelCounts {
  let qualifiedLeads = 0;
  let leadsWithAppointment = 0;
  let leadsShowed = 0;
  let leadsShowedAndSold = 0;
  let leadsSold = 0;

  for (const lead of leads) {
    if (QUALIFIED_STATUSES.includes(lead.status)) qualifiedLeads++;
    const hasSale = lead.sales.length > 0;
    if (hasSale) leadsSold++;
    if (lead.appointment) {
      leadsWithAppointment++;
      if (lead.appointment.showed) {
        leadsShowed++;
        if (hasSale) leadsShowedAndSold++;
      }
    }
  }

  return {
    totalLeads: leads.length,
    qualifiedLeads,
    leadsWithAppointment,
    leadsShowed,
    leadsShowedAndSold,
    leadsSold,
  };
}

// Leads + their appointment/sales relations, shared by getFunnelSnapshot and
// getAcquisitionPerformance so a single dashboard render issues this query once instead
// of twice (see src/app/(dashboard)/page.tsx).
//
// `sampleOnly` defaults to false (real data only). Management metrics must never
// silently blend sample/demo records into a number presented as real — see Phase 1 of
// the V1 correction pass. Pass `sampleOnly: true` only for an explicitly-labeled SAMPLE
// DATA PREVIEW view (used when no real data exists yet), never for the default numbers.
export function getLeadsForMetrics(opts: { sampleOnly?: boolean } = {}) {
  return prisma.lead.findMany({
    where: { isSampleData: !!opts.sampleOnly },
    include: { appointment: true, sales: true },
  });
}

type LeadsForMetrics = Awaited<ReturnType<typeof getLeadsForMetrics>>;

export async function getFunnelSnapshot(preloadedLeads?: LeadsForMetrics, sampleOnly = false) {
  const isSampleData = sampleOnly;
  const [leads, salesCount, serviceOrders, saleAgg, serviceRevenueAgg] = await Promise.all([
    preloadedLeads ? Promise.resolve(preloadedLeads) : getLeadsForMetrics({ sampleOnly }),
    // Total RV sales transactions, independent of lead linkage — a walk-in sale with no
    // lead on file still counts toward the RV Sales tile, just not toward funnel rates.
    // Filtered to the same real/sample scope as the leads above.
    prisma.sale.count({ where: { isSampleData } }),
    prisma.serviceOrder.count({ where: { isSampleData } }),
    prisma.sale.aggregate({
      where: { isSampleData },
      _sum: { totalGross: true, salePrice: true, frontGross: true, fiGross: true },
    }),
    prisma.serviceOrder.aggregate({ where: { isSampleData }, _sum: { revenue: true, grossProfit: true } }),
  ]);

  const { qualifiedLeads, leadsWithAppointment, leadsShowed, leadsShowedAndSold, leadsSold } =
    computeCohortFunnel(leads);

  const frontGross = toNum(saleAgg._sum.frontGross);
  const fiGross = toNum(saleAgg._sum.fiGross);
  const serviceGrossProfit = toNum(serviceRevenueAgg._sum.grossProfit);
  const revenue = toNum(saleAgg._sum.salePrice) + toNum(serviceRevenueAgg._sum.revenue);
  const grossProfit = toNum(saleAgg._sum.totalGross) + serviceGrossProfit;

  return {
    // No GA4 connection yet — visitors is a real "DATA REQUIRED" gap, not a guess.
    visitors: null as number | null,
    leads: leads.length,
    qualifiedLeads,
    appointments: leadsWithAppointment,
    shows: leadsShowed,
    // RV Sales and Repair Orders are two different businesses (vehicle sales vs. service
    // department) — kept as separate tiles rather than summed into one "Sales/ROs" number
    // that would blur which line of business is actually converting.
    sales: salesCount,
    serviceOrders,
    revenue,
    grossProfit,
    grossProfitBreakdown: {
      frontGross,
      fiGross,
      serviceGrossProfit,
    },
    rates: {
      leadToQualified: rate(qualifiedLeads, leads.length),
      leadToAppointment: rate(leadsWithAppointment, leads.length),
      appointmentToShow: rate(leadsShowed, leadsWithAppointment),
      // Numerator is leads that BOTH showed AND have a linked sale — not "total shows"
      // vs. "total sales" pulled from independent tables. See comment above.
      showToSale: rate(leadsShowedAndSold, leadsShowed),
      leadToSale: rate(leadsSold, leads.length),
    },
  };
}

export interface AcquisitionRow {
  source: string;
  leads: number;
  appointments: number;
  shows: number;
  salesOrROs: number;
  revenue: number;
  grossProfit: number;
  conversionRate: number | null;
}

export async function getAcquisitionPerformance(
  preloadedLeads?: LeadsForMetrics,
  sampleOnly = false
): Promise<AcquisitionRow[]> {
  const leads = preloadedLeads ?? (await getLeadsForMetrics({ sampleOnly }));

  const bySource = new Map<string, AcquisitionRow>();

  for (const lead of leads) {
    const source = lead.source || "UNKNOWN";
    if (!bySource.has(source)) {
      bySource.set(source, {
        source,
        leads: 0,
        appointments: 0,
        shows: 0,
        salesOrROs: 0,
        revenue: 0,
        grossProfit: 0,
        conversionRate: null,
      });
    }
    const row = bySource.get(source)!;
    row.leads += 1;
    if (lead.appointment) {
      row.appointments += 1;
      if (lead.appointment.showed) row.shows += 1;
    }
    for (const sale of lead.sales) {
      row.salesOrROs += 1;
      row.revenue += toNum(sale.salePrice);
      row.grossProfit += toNum(sale.totalGross);
    }
  }

  for (const row of bySource.values()) {
    row.conversionRate = rate(row.salesOrROs, row.leads);
  }

  return Array.from(bySource.values()).sort((a, b) => b.leads - a.leads);
}
