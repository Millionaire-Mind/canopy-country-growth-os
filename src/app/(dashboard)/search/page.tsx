import { prisma } from "@/lib/db";

const BUSINESS_LINES = ["Service", "Used/Trade", "New/Inventory", "Parts", "Canopies"];

export default async function SearchDemandCapturePage() {
  const pageCount = await prisma.webPage.count();
  const performanceCount = await prisma.searchPerformance.count();

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-xl font-semibold text-canopy-900">Search &amp; Demand Capture</h1>
        <p className="mt-1 text-sm text-slate-500">
          Revenue pages, search intent, and Search Console performance, combined with
          leads/appointments/revenue where attributable.
        </p>
      </section>

      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
        <div className="text-sm font-semibold text-slate-500">DATA REQUIRED</div>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          Google Search Console is not connected (see Data Health). Clicks, impressions,
          CTR, and position cannot be shown without it — no numbers are estimated here.
          {pageCount === 0 && " No web_pages are catalogued yet either."}
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Business Line Categories (ready once data connects)
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {BUSINESS_LINES.map((line) => (
            <div key={line} className="rounded-lg border border-slate-200 bg-white p-4 text-center">
              <div className="text-sm font-medium text-slate-700">{line}</div>
              <div className="mt-1 text-xs text-slate-400">
                {performanceCount === 0 ? "No search data yet" : "—"}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
