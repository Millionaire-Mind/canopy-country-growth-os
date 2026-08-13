import { prisma } from "@/lib/db";

const PRIORITY_STYLE: Record<string, string> = {
  DO_NOW: "bg-red-100 text-red-800",
  DO_NEXT: "bg-amber-100 text-amber-800",
  TEST: "bg-blue-100 text-blue-800",
  BACKLOG: "bg-slate-200 text-slate-600",
  REJECT: "bg-slate-100 text-slate-400 line-through",
};

export default async function CampaignOpportunitiesPage() {
  const campaigns = await prisma.campaign.findMany({ orderBy: { priority: "asc" } });

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-xl font-semibold text-canopy-900">Campaign Opportunities</h1>
        <p className="mt-1 text-sm text-slate-500">
          Opportunity queue driven by real customer events, not an arbitrary marketing
          calendar. V1 does not send anything automatically — every action here requires
          human execution and approval.
        </p>
      </section>

      {campaigns.length === 0 ? (
        <p className="text-sm text-slate-400">No opportunities queued yet.</p>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <div key={c.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-medium text-slate-800">
                  {c.name}
                  {c.isSampleData && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                      Sample
                    </span>
                  )}
                </h3>
                {c.priority && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_STYLE[c.priority] ?? ""}`}>
                    {c.priority.replace(/_/g, " ")}
                  </span>
                )}
              </div>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <Field label="Trigger" value={c.trigger} />
                <Field label="Audience" value={c.audience} />
                <Field label="Offer / Message" value={c.offerMessage} />
                <Field label="Channel" value={c.channel} />
                <Field label="Landing Page" value={c.landingPage} />
                <Field label="Expected Outcome" value={c.expectedOutcome} />
                <Field label="Evidence" value={c.evidence} />
                <Field label="Measurement Plan" value={c.measurementPlan} />
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-slate-400">{label}</dt>
      <dd className="text-slate-600">{value ?? "—"}</dd>
    </div>
  );
}
