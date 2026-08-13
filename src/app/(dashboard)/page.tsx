import Link from "next/link";
import { getFunnelSnapshot, getAcquisitionPerformance, getLeadsForMetrics, formatRate } from "@/lib/metrics";
import { getOpportunityAlerts } from "@/lib/alerts";
import { getDailyBrief, type DailyBrief } from "@/lib/daily-brief";
import { getTopOpportunities, type Opportunity } from "@/lib/opportunities";
import { hasSampleData } from "@/lib/data-mode";
import { StatTile, DataRequired } from "@/components/StatTile";
import { AlertBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

const currency = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const OPPORTUNITY_STYLE: Record<string, string> = {
  URGENT_FOLLOWUP: "bg-red-100 text-red-800",
  STALE_LEAD: "bg-amber-100 text-amber-800",
  HIGH_VALUE_GAP: "bg-blue-100 text-blue-800",
};

const PRIORITY_STYLE: Record<string, string> = {
  DO_NOW: "bg-red-100 text-red-800",
  DO_NEXT: "bg-amber-100 text-amber-800",
  TEST: "bg-blue-100 text-blue-800",
  BACKLOG: "bg-slate-200 text-slate-600",
  REJECT: "bg-slate-100 text-slate-400",
};

export default async function ExecutiveCommandCenter() {
  // Management metrics must never silently blend sample/demo records into a number
  // presented as real (see docs/ARCHITECTURE.md §10, question 12). Default to real data
  // only; fall back to a clearly labeled SAMPLE DATA PREVIEW only when no real leads
  // exist yet at all.
  const realLeads = await getLeadsForMetrics({ sampleOnly: false });
  const sampleExists = realLeads.length === 0 ? await hasSampleData() : false;
  const previewingSample = realLeads.length === 0 && sampleExists;

  const leadsForMetrics = previewingSample ? await getLeadsForMetrics({ sampleOnly: true }) : realLeads;
  const [funnel, acquisition, alerts, brief, topOpportunities] = await Promise.all([
    getFunnelSnapshot(leadsForMetrics, previewingSample),
    getAcquisitionPerformance(leadsForMetrics, previewingSample),
    getOpportunityAlerts(previewingSample),
    getDailyBrief(previewingSample),
    getTopOpportunities(10, previewingSample),
  ]);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-xl font-semibold text-canopy-900">Executive Command Center</h1>
        <p className="mt-1 text-sm text-slate-500">
          Where are we making money? Where are we losing opportunities? What needs human
          action today?
        </p>
      </section>

      {previewingSample && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>SAMPLE DATA PREVIEW MODE.</strong> No real leads exist yet, so every
          number below is computed from seeded demo data, not the dealership&apos;s real
          performance. Import real leads via the Lead Command Center to switch this page
          to real data — the moment one real lead exists, this page stops using sample
          data for its default numbers.
        </div>
      )}

      <DailyExecutiveBrief brief={brief} sample={previewingSample} />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Revenue Funnel {previewingSample && <SampleTag />}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          <DataRequired label="Website Visitors" />
          <StatTile label="Leads" value={funnel.leads} />
          <StatTile label="Qualified Leads" value={funnel.qualifiedLeads} />
          <StatTile label="Appointments" value={funnel.appointments} />
          <StatTile label="Shows" value={funnel.shows} />
          <StatTile label="RV Sales" value={funnel.sales} />
          <StatTile label="Repair Orders" value={funnel.serviceOrders} />
          <StatTile label="Revenue" value={currency(funnel.revenue)} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatTile label="Lead → Qualified" value={formatRate(funnel.rates.leadToQualified)} />
          <StatTile label="Lead → Appointment" value={formatRate(funnel.rates.leadToAppointment)} />
          <StatTile label="Appointment → Show" value={formatRate(funnel.rates.appointmentToShow)} />
          <StatTile label="Show → Close" value={formatRate(funnel.rates.showToSale)} />
          <StatTile label="Lead → Sale" value={formatRate(funnel.rates.leadToSale)} />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Website Visitors requires GA4 access (not connected — see Data Health). Cost Per
          Lead, Cost Per Appointment, CAC, and Marketing ROI require campaign spend data,
          which is not yet imported — omitted rather than estimated. Show → Close and
          Lead → Sale are cohort rates: a lead only counts as converted if the same lead
          record has a linked sale, not merely whether shows and sales happened to match
          in aggregate.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Gross Profit Breakdown {previewingSample && <SampleTag />}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Front Gross (RV)" value={currency(funnel.grossProfitBreakdown.frontGross)} />
          <StatTile label="F&I Gross (RV)" value={currency(funnel.grossProfitBreakdown.fiGross)} />
          <StatTile label="Service Gross Profit" value={currency(funnel.grossProfitBreakdown.serviceGrossProfit)} />
          <StatTile label="Total Gross Profit" value={currency(funnel.grossProfit)} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Acquisition Performance {previewingSample && <SampleTag />}
        </h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["Source", "Leads", "Appointments", "Shows", "Sales/ROs", "Revenue", "Gross Profit", "Conversion"].map(
                  (h) => (
                    <th key={h} className="px-4 py-2 text-left font-medium text-slate-500">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {acquisition.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                    No lead data yet. Import a CSV from the Lead Command Center.
                  </td>
                </tr>
              )}
              {acquisition.map((row) => (
                <tr key={row.source}>
                  <td className="px-4 py-2 font-medium text-slate-700">{row.source}</td>
                  <td className="px-4 py-2">{row.leads}</td>
                  <td className="px-4 py-2">{row.appointments}</td>
                  <td className="px-4 py-2">{row.shows}</td>
                  <td className="px-4 py-2">{row.salesOrROs}</td>
                  <td className="px-4 py-2">{currency(row.revenue)}</td>
                  <td className="px-4 py-2">{currency(row.grossProfit)}</td>
                  <td className="px-4 py-2">{formatRate(row.conversionRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Opportunity Alerts {previewingSample && <SampleTag />}
        </h2>
        {alerts.length === 0 ? (
          <p className="text-sm text-slate-400">
            No alerts from current data. This will update automatically as leads and
            lifecycle events change.
          </p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((alert, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
              >
                <AlertBadge severity={alert.severity} />
                <span className="text-sm text-slate-700">{alert.message}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <OpportunityEngine opportunities={topOpportunities} sample={previewingSample} />
    </div>
  );
}

function SampleTag() {
  return (
    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
      Sample Preview
    </span>
  );
}

function DailyExecutiveBrief({ brief, sample }: { brief: DailyBrief; sample: boolean }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Daily Executive Brief {sample && <SampleTag />}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <BriefCard title="Money">
          {brief.money.dataRequired ? (
            <p className="text-sm text-slate-400">DATA REQUIRED — no sales or service records yet.</p>
          ) : (
            <dl className="space-y-1 text-sm">
              <BriefRow label="Sales revenue" value={currency(brief.money.salesRevenue)} />
              <BriefRow label="Service revenue" value={currency(brief.money.serviceRevenue)} />
              <BriefRow label="Gross profit" value={currency(brief.money.grossProfit)} />
            </dl>
          )}
        </BriefCard>

        <BriefCard title="Leaks">
          {brief.leaks.length === 0 ? (
            <p className="text-sm text-slate-400">No leaks detected in current data.</p>
          ) : (
            <ul className="space-y-1 text-sm text-slate-700">
              {brief.leaks.map((leak, i) => (
                <li key={i}>
                  <span className="font-medium">{leak.count}</span> {leak.description}
                </li>
              ))}
            </ul>
          )}
        </BriefCard>

        <BriefCard title="Leads Needing Action">
          <p className="text-2xl font-semibold text-canopy-900">{brief.leadsNeedingAction.count}</p>
          {brief.leadsNeedingAction.sample.length > 0 && (
            <p className="mt-1 text-xs text-slate-500">
              e.g. {brief.leadsNeedingAction.sample.join(", ")}
              {brief.leadsNeedingAction.count > brief.leadsNeedingAction.sample.length ? ", …" : ""}
            </p>
          )}
          <Link href="/leads?filter=action" className="mt-2 inline-block text-xs text-canopy-700 hover:underline">
            View in Lead Command Center
          </Link>
        </BriefCard>

        <BriefCard title="Search">
          {brief.search.dataRequired ? (
            <p className="text-sm text-slate-400">DATA REQUIRED — no Search Console data imported yet.</p>
          ) : (
            <dl className="space-y-1 text-sm">
              <BriefRow label="Queries tracked" value={String(brief.search.queriesTracked)} />
              <BriefRow label="Total clicks" value={String(brief.search.totalClicks)} />
            </dl>
          )}
        </BriefCard>

        <BriefCard title="Customer Base">
          {brief.customerBase.dataRequired ? (
            <p className="text-sm text-slate-400">DATA REQUIRED — no real ownership/service data yet.</p>
          ) : (
            <p className="text-sm text-slate-700">
              <span className="text-2xl font-semibold text-canopy-900">
                {brief.customerBase.upcomingOpportunities}
              </span>{" "}
              legitimate upcoming ownership/service opportunit
              {brief.customerBase.upcomingOpportunities === 1 ? "y" : "ies"}.
            </p>
          )}
        </BriefCard>

        <BriefCard title="Recommended Action">
          {brief.recommendedActions.length === 0 ? (
            <p className="text-sm text-slate-400">No evidence-backed actions right now.</p>
          ) : (
            <ol className="list-decimal space-y-1 pl-4 text-sm text-slate-700">
              {brief.recommendedActions.map((action, i) => (
                <li key={i}>{action}</li>
              ))}
            </ol>
          )}
        </BriefCard>
      </div>

      <div className="mt-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Opportunities (top 3)
        </h3>
        {brief.opportunities.length === 0 ? (
          <p className="text-sm text-slate-400">No ranked opportunities right now.</p>
        ) : (
          <ul className="space-y-2">
            {brief.opportunities.map((o) => (
              <li key={o.leadId} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <span
                  className={`mr-2 rounded-full px-2 py-0.5 text-xs font-semibold ${OPPORTUNITY_STYLE[o.category]}`}
                >
                  {o.category.replace(/_/g, " ")}
                </span>
                <span className="font-medium text-slate-800">{o.customerName}</span> — {o.what}
                <span className="mt-1 block text-xs text-slate-500">{o.why}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function BriefCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      {children}
    </div>
  );
}

function BriefRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function OpportunityEngine({ opportunities, sample }: { opportunities: Opportunity[]; sample: boolean }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Opportunity Engine {sample && <SampleTag />}
      </h2>
      <p className="mb-3 text-xs text-slate-400">
        Each opportunity is derived from real lead/appointment/sale fields — what&apos;s
        happening, why it matters, the evidence, and the required action. Estimated
        effect is marked UNKNOWN where the data doesn&apos;t support a real estimate.
      </p>
      {opportunities.length === 0 ? (
        <p className="text-sm text-slate-400">No ranked opportunities right now.</p>
      ) : (
        <div className="space-y-3">
          {opportunities.map((o) => (
            <div key={o.leadId} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_STYLE[o.priority]}`}
                  >
                    {o.priority.replace(/_/g, " ")}
                  </span>
                  <span className="font-medium text-slate-800">{o.customerName}</span>
                </div>
                <Link href="/leads" className="text-xs text-canopy-700 hover:underline">
                  View lead
                </Link>
              </div>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <Field label="What" value={o.what} />
                <Field label="Why it matters" value={o.why} />
                <Field label="Evidence" value={o.evidence} />
                <Field label="Estimated effect" value={o.estimatedEffect} />
                <Field label="Required action" value={o.requiredAction} />
                <Field label="Owner" value={o.owner} />
                <Field label="Measurement plan" value={o.measurementPlan} />
              </dl>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-slate-400">{label}</dt>
      <dd className="text-slate-600">{value}</dd>
    </div>
  );
}
