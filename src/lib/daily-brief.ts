import { prisma } from "@/lib/db";
import { toNum } from "@/lib/metrics";
import { getTopOpportunities, type Opportunity } from "@/lib/opportunities";
import { requiresAction } from "@/lib/lead-format";

// Screen 1 — Daily Executive Brief. Defaults to real (isSampleData: false) records only
// — see the note on getLeadsForMetrics in src/lib/metrics.ts for why. Pass
// `sampleOnly: true` only for an explicitly-labeled SAMPLE DATA PREVIEW render.

export interface DailyBriefMoney {
  salesRevenue: number;
  serviceRevenue: number;
  grossProfit: number;
  dataRequired: boolean; // true when there is no Sale/ServiceOrder data at all in this scope
}

export interface DailyBriefLeak {
  description: string;
  count: number;
}

export interface DailyBrief {
  money: DailyBriefMoney;
  leaks: DailyBriefLeak[];
  opportunities: Opportunity[]; // top 3
  leadsNeedingAction: { count: number; sample: string[] };
  search: { dataRequired: true } | { dataRequired: false; queriesTracked: number; totalClicks: number };
  customerBase: { dataRequired: true } | { dataRequired: false; upcomingOpportunities: number };
  recommendedActions: string[]; // top 3, derived from the same opportunity evidence
}

const UNANSWERED_THRESHOLD_HOURS = 4;

export async function getDailyBrief(sampleOnly = false): Promise<DailyBrief> {
  const isSampleData = sampleOnly;
  const now = new Date();
  const unansweredCutoff = new Date(now.getTime() - UNANSWERED_THRESHOLD_HOURS * 60 * 60 * 1000);

  const [saleAgg, serviceAgg, saleCount, serviceOrderCount, actionableLeads, searchPerf, lifecycleUpcoming] =
    await Promise.all([
      prisma.sale.aggregate({ where: { isSampleData }, _sum: { salePrice: true, totalGross: true } }),
      prisma.serviceOrder.aggregate({ where: { isSampleData }, _sum: { revenue: true, grossProfit: true } }),
      prisma.sale.count({ where: { isSampleData } }),
      prisma.serviceOrder.count({ where: { isSampleData } }),
      prisma.lead.findMany({
        where: { isSampleData, status: { in: ["NEW", "CONTACTED", "ENGAGED"] } },
        select: { id: true, status: true, firstResponseAt: true, appointmentId: true, customer: true },
      }),
      prisma.searchPerformance.findMany({ where: { isSampleData }, select: { clicks: true, query: true } }),
      prisma.lifecycleEvent.count({
        where: { isSampleData, status: { in: ["PENDING", "ELIGIBLE"] } },
      }),
    ]);

  const soldWithoutSale = await prisma.lead.count({
    where: { isSampleData, status: "SOLD_RO_OPENED", sales: { none: {} } },
  });
  const showedNoOutcome = await prisma.appointment.count({
    where: { isSampleData, showed: true, outcome: null },
  });
  const unansweredOverdue = await prisma.lead.count({
    where: {
      isSampleData,
      status: "NEW",
      firstResponseAt: null,
      createdAt: { lte: unansweredCutoff },
    },
  });

  const money: DailyBriefMoney = {
    salesRevenue: toNum(saleAgg._sum.salePrice),
    serviceRevenue: toNum(serviceAgg._sum.revenue),
    grossProfit: toNum(saleAgg._sum.totalGross) + toNum(serviceAgg._sum.grossProfit),
    dataRequired: saleCount === 0 && serviceOrderCount === 0,
  };

  const leaks: DailyBriefLeak[] = [];
  if (unansweredOverdue > 0) {
    leaks.push({
      description: `Lead(s) unanswered beyond the ${UNANSWERED_THRESHOLD_HOURS}-hour response threshold`,
      count: unansweredOverdue,
    });
  }
  if (showedNoOutcome > 0) {
    leaks.push({ description: "Appointment(s) that showed with no logged outcome", count: showedNoOutcome });
  }
  if (soldWithoutSale > 0) {
    leaks.push({ description: "Lead(s) marked SOLD/RO OPENED with no linked sale record", count: soldWithoutSale });
  }

  const opportunities = await getTopOpportunities(3, sampleOnly);

  const leadsNeedingAction = actionableLeads.filter(requiresAction);

  const search =
    searchPerf.length === 0
      ? ({ dataRequired: true } as const)
      : ({
          dataRequired: false,
          queriesTracked: new Set(searchPerf.map((p) => p.query)).size,
          totalClicks: searchPerf.reduce((sum, p) => sum + p.clicks, 0),
        } as const);

  const customerBase =
    lifecycleUpcoming === 0
      ? ({ dataRequired: true } as const)
      : ({ dataRequired: false, upcomingOpportunities: lifecycleUpcoming } as const);

  return {
    money,
    leaks,
    opportunities,
    leadsNeedingAction: {
      count: leadsNeedingAction.length,
      sample: leadsNeedingAction
        .slice(0, 3)
        .map((l) => (l.customer ? `${l.customer.firstName} ${l.customer.lastName}` : "Unknown")),
    },
    search,
    customerBase,
    recommendedActions: opportunities.map((o) => o.requiredAction),
  };
}
