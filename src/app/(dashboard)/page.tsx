import { getFunnelSnapshot, getAcquisitionPerformance, formatRate } from "@/lib/metrics";
import { getOpportunityAlerts } from "@/lib/alerts";
import { StatTile, DataRequired } from "@/components/StatTile";
import { AlertBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

const currency = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default async function ExecutiveCommandCenter() {
  const [funnel, acquisition, alerts] = await Promise.all([
    getFunnelSnapshot(),
    getAcquisitionPerformance(),
    getOpportunityAlerts(),
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

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Revenue Funnel
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <DataRequired label="Website Visitors" />
          <StatTile label="Leads" value={funnel.leads} />
          <StatTile label="Qualified Leads" value={funnel.qualifiedLeads} />
          <StatTile label="Appointments" value={funnel.appointments} />
          <StatTile label="Shows" value={funnel.shows} />
          <StatTile label="Sales / ROs" value={funnel.sales + funnel.serviceOrders} />
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
          which is not yet imported — omitted rather than estimated.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Acquisition Performance
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
          Opportunity Alerts
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
    </div>
  );
}
