import { prisma } from "@/lib/db";

// Engine 1/2 — Opportunity Alerts.
// Every alert here is derived from data actually in the database. No alert type is
// invented for a data source that isn't connected (e.g. no "service page traffic"
// alerts exist yet because Search Console isn't connected — see docs/INTEGRATIONS.md).

export type AlertSeverity = "URGENT" | "HIGH_VALUE" | "OPPORTUNITY" | "RETENTION";

export interface Alert {
  severity: AlertSeverity;
  message: string;
  count: number;
}

const UNANSWERED_THRESHOLD_HOURS = 4;
const STALE_LEAD_THRESHOLD_DAYS = 7;
const RETENTION_WINDOW_DAYS = 14;

export async function getOpportunityAlerts(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const now = new Date();

  const unansweredCutoff = new Date(now.getTime() - UNANSWERED_THRESHOLD_HOURS * 60 * 60 * 1000);
  const unanswered = await prisma.lead.count({
    where: {
      firstResponseAt: null,
      status: "NEW",
      createdAt: { lte: unansweredCutoff },
    },
  });
  if (unanswered > 0) {
    alerts.push({
      severity: "URGENT",
      message: `${unanswered} lead${unanswered === 1 ? " has" : "s have"} not received human follow-up within ${UNANSWERED_THRESHOLD_HOURS} hours.`,
      count: unanswered,
    });
  }

  const staleCutoff = new Date(now.getTime() - STALE_LEAD_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
  const stale = await prisma.lead.count({
    where: {
      status: { in: ["CONTACTED", "ENGAGED"] },
      createdAt: { lte: staleCutoff },
    },
  });
  if (stale > 0) {
    alerts.push({
      severity: "OPPORTUNITY",
      message: `${stale} lead${stale === 1 ? " has" : "s have"} been in CONTACTED/ENGAGED status for more than ${STALE_LEAD_THRESHOLD_DAYS} days without an appointment — review for follow-up or LOST status.`,
      count: stale,
    });
  }

  const retentionWindowEnd = new Date(now.getTime() + RETENTION_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const upcomingLifecycle = await prisma.lifecycleEvent.count({
    where: {
      status: { in: ["PENDING", "ELIGIBLE"] },
      triggerDate: { lte: retentionWindowEnd },
    },
  });
  if (upcomingLifecycle > 0) {
    alerts.push({
      severity: "RETENTION",
      message: `${upcomingLifecycle} customer${upcomingLifecycle === 1 ? "" : "s"} ${upcomingLifecycle === 1 ? "has" : "have"} a seasonal/ownership service opportunity due within ${RETENTION_WINDOW_DAYS} days.`,
      count: upcomingLifecycle,
    });
  }

  const soldWithoutSale = await prisma.lead.count({
    where: { status: "SOLD_RO_OPENED", sales: { none: {} } },
  });
  if (soldWithoutSale > 0) {
    alerts.push({
      severity: "HIGH_VALUE",
      message: `${soldWithoutSale} lead${soldWithoutSale === 1 ? " is" : "s are"} marked SOLD/RO OPENED but has no linked sale record — check data entry so gross profit isn't missed.`,
      count: soldWithoutSale,
    });
  }

  return alerts;
}
