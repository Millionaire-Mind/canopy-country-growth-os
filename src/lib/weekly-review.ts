import { prisma } from "@/lib/db";
import { rate, toNum, computeCohortFunnel } from "@/lib/metrics";
import { getTopOpportunities } from "@/lib/opportunities";

// Screen — Weekly Growth Review. Real data only (isSampleData: false) — this is a
// management report, not a demo. Sections follow the original V1 specification exactly:
// Revenue Performance, Funnel Performance, Acquisition, Demand Capture, Demand
// Creation, Lead Handling, Retention, Experiments, Next Three Actions.

export interface FunnelWindow {
  leads: number;
  appointments: number;
  shows: number;
  sales: number;
  showToSaleRate: number | null;
}

async function getFunnelWindow(start: Date, end: Date): Promise<FunnelWindow> {
  const leads = await prisma.lead.findMany({
    where: { isSampleData: false, createdAt: { gte: start, lt: end } },
    include: { appointment: true, sales: true },
  });
  const { leadsWithAppointment, leadsShowed, leadsShowedAndSold, leadsSold } = computeCohortFunnel(leads);
  return {
    leads: leads.length,
    appointments: leadsWithAppointment,
    shows: leadsShowed,
    sales: leadsSold,
    showToSaleRate: rate(leadsShowedAndSold, leadsShowed),
  };
}

async function getRevenueWindow(start: Date, end: Date) {
  const [saleAgg, serviceAgg] = await Promise.all([
    prisma.sale.aggregate({
      where: { isSampleData: false, saleDate: { gte: start, lt: end } },
      _sum: { salePrice: true, totalGross: true },
    }),
    prisma.serviceOrder.aggregate({
      where: { isSampleData: false, openDate: { gte: start, lt: end } },
      _sum: { revenue: true, grossProfit: true },
    }),
  ]);
  return {
    revenue: toNum(saleAgg._sum.salePrice) + toNum(serviceAgg._sum.revenue),
    grossProfit: toNum(saleAgg._sum.totalGross) + toNum(serviceAgg._sum.grossProfit),
  };
}

async function getAcquisitionWindow(start: Date, end: Date) {
  const leads = await prisma.lead.findMany({
    where: { isSampleData: false, createdAt: { gte: start, lt: end } },
    select: { source: true },
  });
  const bySource = new Map<string, number>();
  for (const lead of leads) {
    const source = lead.source || "UNKNOWN";
    bySource.set(source, (bySource.get(source) ?? 0) + 1);
  }
  return Array.from(bySource.entries())
    .map(([source, leads]) => ({ source, leads }))
    .sort((a, b) => b.leads - a.leads);
}

async function getDemandCaptureWindow(start: Date, end: Date) {
  const perf = await prisma.searchPerformance.findMany({
    where: { isSampleData: false, date: { gte: start, lt: end } },
    select: { clicks: true, impressions: true },
  });
  if (perf.length === 0) return { dataRequired: true as const };
  return {
    dataRequired: false as const,
    clicks: perf.reduce((sum, p) => sum + p.clicks, 0),
    impressions: perf.reduce((sum, p) => sum + p.impressions, 0),
  };
}

async function getDemandCreationWindow() {
  const activeCampaigns = await prisma.campaign.count({
    where: { isSampleData: false, priority: { in: ["DO_NOW", "DO_NEXT"] } },
  });
  if (activeCampaigns === 0) return { dataRequired: true as const };
  return { dataRequired: false as const, activeCampaigns };
}

async function getLeadHandlingWindow(start: Date, end: Date) {
  const leads = await prisma.lead.findMany({
    where: { isSampleData: false, createdAt: { gte: start, lt: end }, firstResponseAt: { not: null } },
    select: { createdAt: true, firstResponseAt: true },
  });
  const unansweredOverdue = await prisma.lead.count({
    where: {
      isSampleData: false,
      status: "NEW",
      firstResponseAt: null,
      createdAt: { lte: new Date(Date.now() - 4 * 60 * 60 * 1000) },
    },
  });
  if (leads.length === 0) {
    return { avgResponseTimeHours: null, unansweredOverdue };
  }
  const totalHours = leads.reduce(
    (sum, l) => sum + (l.firstResponseAt!.getTime() - l.createdAt.getTime()) / (1000 * 60 * 60),
    0
  );
  return { avgResponseTimeHours: totalHours / leads.length, unansweredOverdue };
}

async function getRetentionWindow() {
  const upcoming = await prisma.lifecycleEvent.count({
    where: { isSampleData: false, status: { in: ["PENDING", "ELIGIBLE"] } },
  });
  if (upcoming === 0) return { dataRequired: true as const };
  return { dataRequired: false as const, upcomingLifecycleEvents: upcoming };
}

async function getExperimentsWindow() {
  const testCampaigns = await prisma.campaign.count({ where: { isSampleData: false, priority: "TEST" } });
  if (testCampaigns === 0) return { dataRequired: true as const };
  return { dataRequired: false as const, testCampaigns };
}

export interface WeeklyGrowthReview {
  start: Date;
  end: Date;
  revenuePerformance: {
    thisWeek: { revenue: number; grossProfit: number };
    lastWeek: { revenue: number; grossProfit: number };
  };
  funnelPerformance: { thisWeek: FunnelWindow; lastWeek: FunnelWindow };
  acquisition: { source: string; leads: number }[];
  demandCapture: Awaited<ReturnType<typeof getDemandCaptureWindow>>;
  demandCreation: Awaited<ReturnType<typeof getDemandCreationWindow>>;
  leadHandling: Awaited<ReturnType<typeof getLeadHandlingWindow>>;
  retention: Awaited<ReturnType<typeof getRetentionWindow>>;
  experiments: Awaited<ReturnType<typeof getExperimentsWindow>>;
  nextThreeActions: string[];
}

export async function getWeeklyGrowthReview(now: Date = new Date()): Promise<WeeklyGrowthReview> {
  const end = now;
  const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfPriorWeek = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    revenueThisWeek,
    revenueLastWeek,
    funnelThisWeek,
    funnelLastWeek,
    acquisition,
    demandCapture,
    demandCreation,
    leadHandling,
    retention,
    experiments,
    topOpportunities,
  ] = await Promise.all([
    getRevenueWindow(start, end),
    getRevenueWindow(startOfPriorWeek, start),
    getFunnelWindow(start, end),
    getFunnelWindow(startOfPriorWeek, start),
    getAcquisitionWindow(start, end),
    getDemandCaptureWindow(start, end),
    getDemandCreationWindow(),
    getLeadHandlingWindow(start, end),
    getRetentionWindow(),
    getExperimentsWindow(),
    getTopOpportunities(3, false),
  ]);

  return {
    start,
    end,
    revenuePerformance: { thisWeek: revenueThisWeek, lastWeek: revenueLastWeek },
    funnelPerformance: { thisWeek: funnelThisWeek, lastWeek: funnelLastWeek },
    acquisition,
    demandCapture,
    demandCreation,
    leadHandling,
    retention,
    experiments,
    // Same opportunity/prioritization logic as the Daily Executive Brief — not an
    // unrelated list, per the original specification.
    nextThreeActions: topOpportunities.map((o) => o.requiredAction),
  };
}

// Signed percent change, null when there's no baseline to compare against (division by
// zero is a DATA REQUIRED case, not a 0% or ±Infinity change).
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / previous;
}
