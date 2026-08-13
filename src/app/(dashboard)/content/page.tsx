import { prisma } from "@/lib/db";
import { CONTENT_OPPORTUNITIES } from "@/lib/content-opportunities";

const FACT_STYLE: Record<string, string> = {
  VERIFIED: "bg-green-100 text-green-800",
  NEEDS_VERIFICATION: "bg-amber-100 text-amber-800",
  DO_NOT_PUBLISH: "bg-red-100 text-red-800",
  NOT_YET_CHECKED: "bg-slate-200 text-slate-600",
};

export default async function ContentAuthorityPage() {
  const [facts, sources] = await Promise.all([
    prisma.businessFact.findMany(),
    prisma.authoritySource.findMany(),
  ]);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-xl font-semibold text-canopy-900">Content &amp; Authority Opportunities</h1>
        <p className="mt-1 text-sm text-slate-500">
          Evidence-driven content queue, plus the entity evidence graph behind every
          published business claim.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Content Opportunity Queue
        </h2>
        <div className="space-y-3">
          {CONTENT_OPPORTUNITIES.map((c, i) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="font-medium text-slate-800">{c.customerQuestion}</h3>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Business Line" value={c.businessLine} />
                <Field label="Search Opportunity" value={c.searchOpportunity} />
                <Field label="Social Opportunity" value={c.socialOpportunity} />
                <Field label="Original Evidence Available?" value={c.originalEvidenceAvailable} />
                <Field label="Revenue Connection" value={c.revenueConnection} />
                <Field label="Target Audience" value={c.targetAudience} />
                <Field label="Source Asset" value={c.sourceAsset} />
                <Field label="Repurposing" value={c.repurposing} />
                <Field label="CTA" value={c.cta} />
                <Field label="Measurement" value={c.measurement} />
              </dl>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Business Fact Verification Ledger
        </h2>
        <p className="mb-3 text-xs text-slate-400">
          Full reasoning in docs/BUSINESS_FACTS.md. canopycountry.com was unreachable from
          this build environment, so nothing here is marked VERIFIED from the first-party
          site — only independently corroborated claims (e.g. the Jayco dealer locator)
          are VERIFIED.
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["Claim", "Value", "Source", "Status"].map((h) => (
                  <th key={h} className="px-4 py-2 text-left font-medium text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {facts.map((f) => (
                <tr key={f.id}>
                  <td className="px-4 py-2 font-medium text-slate-700">{f.claim}</td>
                  <td className="px-4 py-2 text-slate-600">{f.value}</td>
                  <td className="px-4 py-2 text-slate-500">{f.source}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${FACT_STYLE[f.status] ?? ""}`}>
                      {f.status.replace(/_/g, " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Authority Evidence Graph
        </h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["Source", "Type", "Claim Supported", "Status"].map((h) => (
                  <th key={h} className="px-4 py-2 text-left font-medium text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sources.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2 font-medium text-slate-700">
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noreferrer" className="text-canopy-700 hover:underline">
                        {s.sourceName}
                      </a>
                    ) : (
                      s.sourceName
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-500">{s.sourceType}</td>
                  <td className="px-4 py-2 text-slate-600">{s.claimSupported}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${FACT_STYLE[s.verificationStatus] ?? ""}`}>
                      {s.verificationStatus.replace(/_/g, " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
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
