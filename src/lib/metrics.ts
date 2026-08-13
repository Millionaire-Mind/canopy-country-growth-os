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

export async function getFunnelSnapshot() {
  const [leads, qualifiedLeads, appointments, shows, sales, serviceOrders, saleAgg] =
    await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({
        where: { status: { in: ["ENGAGED", "APPOINTMENT", "SHOWED", "SOLD_RO_OPENED"] } },
      }),
      prisma.appointment.count(),
      prisma.appointment.count({ where: { showed: true } }),
      prisma.sale.count(),
      prisma.serviceOrder.count(),
      prisma.sale.aggregate({ _sum: { totalGross: true, salePrice: true } }),
    ]);

  const serviceRevenueAgg = await prisma.serviceOrder.aggregate({
    _sum: { revenue: true, grossProfit: true },
  });

  return {
    // No GA4 connection yet — visitors is a real "DATA REQUIRED" gap, not a guess.
    visitors: null as number | null,
    leads,
    qualifiedLeads,
    appointments,
    shows,
    sales,
    serviceOrders,
    revenue: (saleAgg._sum.salePrice ?? 0) + (serviceRevenueAgg._sum.revenue ?? 0),
    grossProfit: (saleAgg._sum.totalGross ?? 0) + (serviceRevenueAgg._sum.grossProfit ?? 0),
    rates: {
      leadToQualified: rate(qualifiedLeads, leads),
      leadToAppointment: rate(appointments, leads),
      appointmentToShow: rate(shows, appointments),
      showToSale: rate(sales, shows),
      leadToSale: rate(sales, leads),
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

export async function getAcquisitionPerformance(): Promise<AcquisitionRow[]> {
  const leads = await prisma.lead.findMany({
    include: { appointment: true, sales: true },
  });

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
      row.revenue += sale.salePrice ?? 0;
      row.grossProfit += sale.totalGross ?? 0;
    }
  }

  for (const row of bySource.values()) {
    row.conversionRate = rate(row.salesOrROs, row.leads);
  }

  return Array.from(bySource.values()).sort((a, b) => b.leads - a.leads);
}
