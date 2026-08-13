import { getWeeklyGrowthReview, percentChange } from "@/lib/weekly-review";
import { formatRate } from "@/lib/metrics";

export const dynamic = "force-dynamic";

const currency = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function ChangeLabel({ current, previous }: { current: number; previous: number }) {
  const change = percentChange(current, previous);
  if (change === null) return <span className="text-slate-400">DATA REQUIRED</span>;
  const pct = `${change >= 0 ? "+" : ""}${(change * 100).toFixed(1)}%`;
  const className = change > 0 ? "text-green-700" : change < 0 ? "text-red-600" : "text-slate-500";
  return <span className={className}>{pct}</span>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {children}
    </section>
  );
}

export default async function WeeklyGrowthReviewPage() {
  const review = await getWeeklyGrowthReview();

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-xl font-semibold text-canopy-900">Weekly Growth Review</h1>
        <p className="mt-1 text-sm text-slate-500">
          Trailing 7 days ({review.start.toLocaleDateString()}–{review.end.toLocaleDateString()})
          vs. the 7 days before that. Real data only — see the Executive Command Center
          for the sample-data preview when no real data exists yet.
        </p>
      </section>

      <Section title="1. Revenue Performance">
        <table className="min-w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="py-1 font-medium text-slate-700">Revenue</td>
              <td className="py-1">{currency(review.revenuePerformance.thisWeek.revenue)}</td>
              <td className="py-1 text-slate-500">{currency(review.revenuePerformance.lastWeek.revenue)}</td>
              <td className="py-1">
                <ChangeLabel
                  current={review.revenuePerformance.thisWeek.revenue}
                  previous={review.revenuePerformance.lastWeek.revenue}
                />
              </td>
            </tr>
            <tr>
              <td className="py-1 font-medium text-slate-700">Gross Profit</td>
              <td className="py-1">{currency(review.revenuePerformance.thisWeek.grossProfit)}</td>
              <td className="py-1 text-slate-500">{currency(review.revenuePerformance.lastWeek.grossProfit)}</td>
              <td className="py-1">
                <ChangeLabel
                  current={review.revenuePerformance.thisWeek.grossProfit}
                  previous={review.revenuePerformance.lastWeek.grossProfit}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="2. Funnel Performance">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-400">
              <th className="py-1">Metric</th>
              <th className="py-1">This Week</th>
              <th className="py-1">Last Week</th>
              <th className="py-1">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(
              [
                ["Leads", "leads"],
                ["Appointments", "appointments"],
                ["Shows", "shows"],
                ["Sales", "sales"],
              ] as const
            ).map(([label, key]) => (
              <tr key={key}>
                <td className="py-1 font-medium text-slate-700">{label}</td>
                <td className="py-1">{review.funnelPerformance.thisWeek[key]}</td>
                <td className="py-1 text-slate-500">{review.funnelPerformance.lastWeek[key]}</td>
                <td className="py-1">
                  <ChangeLabel
                    current={review.funnelPerformance.thisWeek[key]}
                    previous={review.funnelPerformance.lastWeek[key]}
                  />
                </td>
              </tr>
            ))}
            <tr>
              <td className="py-1 font-medium text-slate-700">Show → Close</td>
              <td className="py-1">{formatRate(review.funnelPerformance.thisWeek.showToSaleRate)}</td>
              <td className="py-1 text-slate-500">{formatRate(review.funnelPerformance.lastWeek.showToSaleRate)}</td>
              <td className="py-1 text-slate-400">—</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="3. Acquisition">
        {review.acquisition.length === 0 ? (
          <p className="text-sm text-slate-400">No leads this week.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {review.acquisition.map((row) => (
              <li key={row.source} className="flex justify-between">
                <span className="text-slate-700">{row.source}</span>
                <span className="font-medium text-slate-800">{row.leads}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="4. Demand Capture">
        {review.demandCapture.dataRequired ? (
          <p className="text-sm text-slate-400">DATA REQUIRED — no Search Console data imported this window.</p>
        ) : (
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Clicks</dt>
              <dd className="font-medium text-slate-800">{review.demandCapture.clicks}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Impressions</dt>
              <dd className="font-medium text-slate-800">{review.demandCapture.impressions}</dd>
            </div>
          </dl>
        )}
      </Section>

      <Section title="5. Demand Creation">
        {review.demandCreation.dataRequired ? (
          <p className="text-sm text-slate-400">DATA REQUIRED — no active real campaigns on file.</p>
        ) : (
          <p className="text-sm text-slate-700">
            <span className="text-lg font-semibold text-canopy-900">{review.demandCreation.activeCampaigns}</span>{" "}
            active campaign(s) (DO_NOW / DO_NEXT).
          </p>
        )}
      </Section>

      <Section title="6. Lead Handling">
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Average response time</dt>
            <dd className="font-medium text-slate-800">
              {review.leadHandling.avgResponseTimeHours === null
                ? "DATA REQUIRED"
                : `${review.leadHandling.avgResponseTimeHours.toFixed(1)} hrs`}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Unanswered, overdue</dt>
            <dd className="font-medium text-slate-800">{review.leadHandling.unansweredOverdue}</dd>
          </div>
        </dl>
      </Section>

      <Section title="7. Retention">
        {review.retention.dataRequired ? (
          <p className="text-sm text-slate-400">DATA REQUIRED — no real ownership/lifecycle data on file.</p>
        ) : (
          <p className="text-sm text-slate-700">
            <span className="text-lg font-semibold text-canopy-900">
              {review.retention.upcomingLifecycleEvents}
            </span>{" "}
            upcoming ownership/service opportunit
            {review.retention.upcomingLifecycleEvents === 1 ? "y" : "ies"}.
          </p>
        )}
      </Section>

      <Section title="8. Experiments">
        {review.experiments.dataRequired ? (
          <p className="text-sm text-slate-400">DATA REQUIRED — no real campaigns marked TEST.</p>
        ) : (
          <p className="text-sm text-slate-700">
            <span className="text-lg font-semibold text-canopy-900">{review.experiments.testCampaigns}</span>{" "}
            campaign(s) currently in TEST.
          </p>
        )}
      </Section>

      <Section title="9. Next Three Actions">
        {review.nextThreeActions.length === 0 ? (
          <p className="text-sm text-slate-400">No evidence-backed actions right now.</p>
        ) : (
          <ol className="list-decimal space-y-1 pl-4 text-sm text-slate-700">
            {review.nextThreeActions.map((action, i) => (
              <li key={i}>{action}</li>
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}
