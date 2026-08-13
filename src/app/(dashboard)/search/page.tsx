import { prisma } from "@/lib/db";
import { CsvImportForm } from "@/components/CsvImportForm";
import { toNum } from "@/lib/metrics";

const BUSINESS_LINES = ["Service", "Used/Trade", "New/Inventory", "Parts", "Canopies"];

export const dynamic = "force-dynamic";

// Real-data-only optimization signal — never a predicted/estimated priority. Derived
// directly from the imported clicks/impressions/position for this page:
//  - impressions with zero clicks is a real CTR problem worth testing a title/meta fix.
//  - a poor average position (>10, i.e. page 2+) is a real visibility problem.
// Anything else is left unmarked rather than assigned a fabricated priority.
function optimizationPriority(clicks: number, impressions: number, avgPosition: number | null): string {
  if (impressions > 0 && clicks === 0) return "TEST";
  if (avgPosition !== null && avgPosition > 10) return "BACKLOG";
  return "—";
}

export default async function SearchDemandCapturePage() {
  const [pages, realLeads] = await Promise.all([
    prisma.webPage.findMany({ include: { searchPerformance: true } }),
    // Attribution is a real (string) match on Lead.landingPage === WebPage.url, real
    // leads only — never fabricated, and UNKNOWN (0) where no lead ever landed there.
    prisma.lead.findMany({
      where: { isSampleData: false, landingPage: { not: null } },
      include: { appointment: true, sales: true },
    }),
  ]);

  const rows = pages
    .map((page) => {
      const clicks = page.searchPerformance.reduce((sum, p) => sum + p.clicks, 0);
      const impressions = page.searchPerformance.reduce((sum, p) => sum + p.impressions, 0);
      const withPosition = page.searchPerformance.filter((p) => p.position !== null);
      const avgPosition =
        withPosition.length > 0
          ? withPosition.reduce((sum, p) => sum + (p.position ?? 0), 0) / withPosition.length
          : null;

      const attributedLeads = realLeads.filter((l) => l.landingPage === page.url);
      const attributedAppointments = attributedLeads.filter((l) => l.appointment).length;
      const attributedRevenue = attributedLeads.reduce(
        (sum, l) => sum + l.sales.reduce((s, sale) => s + toNum(sale.salePrice), 0),
        0
      );

      return {
        page,
        clicks,
        impressions,
        avgPosition,
        queries: page.searchPerformance.length,
        leads: attributedLeads.length,
        appointments: attributedAppointments,
        revenue: attributedRevenue,
        priority: optimizationPriority(clicks, impressions, avgPosition),
      };
    })
    .filter((r) => r.queries > 0)
    .sort((a, b) => b.clicks - a.clicks);

  const currency = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <section className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-canopy-900">Search &amp; Demand Capture</h1>
          <p className="mt-1 text-sm text-slate-500">
            Revenue pages, search intent, and Search Console performance, combined with
            leads/appointments/revenue where attributable by an exact landing-page match.
          </p>
        </div>
        <CsvImportForm
          action="/api/search-performance/import"
          buttonLabel="Import Search Console CSV"
          columnsHint="url (or page), query, clicks, impressions, ctr, position, date"
        />
      </section>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <div className="text-sm font-semibold text-slate-500">DATA REQUIRED</div>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Google Search Console is not connected (see Data Health), and no CSV export
            has been imported yet. Clicks, impressions, CTR, and position cannot be shown
            without one — no numbers are estimated here. Export a Performance report from
            Search Console and import it above.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {[
                  "Page",
                  "Business Line",
                  "Intent",
                  "Queries",
                  "Clicks",
                  "Impressions",
                  "Avg. Position",
                  "Leads",
                  "Appts",
                  "Revenue",
                  "Priority",
                ].map((h) => (
                  <th key={h} className="px-4 py-2 text-left font-medium text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ page, clicks, impressions, avgPosition, queries, leads, appointments, revenue, priority }) => (
                <tr key={page.id}>
                  <td className="max-w-[220px] truncate px-4 py-2 font-medium text-slate-700" title={page.url}>
                    {page.url}
                    {page.isSampleData && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                        Sample
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-500">{page.businessLine}</td>
                  <td className="px-4 py-2 text-slate-500">{page.primaryIntent ?? "UNKNOWN"}</td>
                  <td className="px-4 py-2">{queries}</td>
                  <td className="px-4 py-2">{clicks}</td>
                  <td className="px-4 py-2">{impressions}</td>
                  <td className="px-4 py-2">{avgPosition !== null ? avgPosition.toFixed(1) : "DATA REQUIRED"}</td>
                  <td className="px-4 py-2">{leads > 0 ? leads : "UNKNOWN"}</td>
                  <td className="px-4 py-2">{leads > 0 ? appointments : "UNKNOWN"}</td>
                  <td className="px-4 py-2">{leads > 0 && revenue > 0 ? currency(revenue) : "UNKNOWN"}</td>
                  <td className="px-4 py-2">{priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Business Line Categories
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {BUSINESS_LINES.map((line) => (
            <div key={line} className="rounded-lg border border-slate-200 bg-white p-4 text-center">
              <div className="text-sm font-medium text-slate-700">{line}</div>
              <div className="mt-1 text-xs text-slate-400">
                {rows.length === 0 ? "No search data yet" : "—"}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
