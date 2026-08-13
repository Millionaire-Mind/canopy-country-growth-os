import { prisma } from "@/lib/db";

function ownershipAge(purchaseDate: Date | null): string {
  if (!purchaseDate) return "Unknown";
  const days = Math.floor((Date.now() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}yr`;
}

export default async function CustomerOwnershipPage() {
  const rvs = await prisma.rvOwnership.findMany({
    include: {
      customer: true,
      serviceOrders: { orderBy: { openDate: "desc" }, take: 1 },
      lifecycleEvents: { orderBy: { triggerDate: "asc" } },
    },
    orderBy: { purchaseDate: "desc" },
  });

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-xl font-semibold text-canopy-900">Customer Ownership</h1>
        <p className="mt-1 text-sm text-slate-500">
          The first-party customer database as a strategic asset. Lifecycle events shown
          here are seeded manually for now — automatic maintenance-interval rules are not
          yet encoded (see docs/ARCHITECTURE.md §7) and nothing is sent automatically.
        </p>
      </section>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {[
                "Customer",
                "RV",
                "Purchase Date",
                "Ownership Age",
                "Last Service",
                "Next Lifecycle Event",
                "Recommended Action",
                "Status",
              ].map((h) => (
                <th key={h} className="whitespace-nowrap px-4 py-2 text-left font-medium text-slate-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rvs.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                  No RV ownership records yet.
                </td>
              </tr>
            )}
            {rvs.map((rv) => {
              const nextEvent = rv.lifecycleEvents.find((e) => e.status !== "COMPLETED" && e.status !== "SKIPPED");
              const lastService = rv.serviceOrders[0];
              return (
                <tr key={rv.id}>
                  <td className="whitespace-nowrap px-4 py-2 font-medium text-slate-700">
                    {rv.customer.firstName} {rv.customer.lastName}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2">
                    {[rv.year, rv.make, rv.model].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-slate-500">
                    {rv.purchaseDate ? rv.purchaseDate.toLocaleDateString() : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-slate-500">{ownershipAge(rv.purchaseDate)}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-slate-500">
                    {lastService ? `${lastService.serviceCategory} (${lastService.openDate.toLocaleDateString()})` : "None on file"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2">
                    {nextEvent ? `${nextEvent.eventType} — ${nextEvent.triggerDate.toLocaleDateString()}` : "—"}
                  </td>
                  <td className="max-w-[220px] px-4 py-2 text-slate-500">{nextEvent?.recommendedAction ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-2">{nextEvent?.status ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
