import { INTEGRATIONS, type IntegrationStatus } from "@/lib/integrations";

const STATUS_LABEL: Record<IntegrationStatus, string> = {
  CONNECTED: "CONNECTED",
  IMPORT_ONLY: "IMPORT ONLY",
  NOT_CONNECTED: "NOT CONNECTED",
};

const STATUS_STYLE: Record<IntegrationStatus, string> = {
  CONNECTED: "bg-green-100 text-green-800",
  IMPORT_ONLY: "bg-amber-100 text-amber-800",
  NOT_CONNECTED: "bg-slate-200 text-slate-600",
};

export default function DataHealthPage() {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-xl font-semibold text-canopy-900">Data Health</h1>
        <p className="mt-1 text-sm text-slate-500">
          Integration status for every data source this system can use. Nothing here is
          claimed as connected unless it actually is. Full detail in{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">docs/INTEGRATIONS.md</code>.
        </p>
      </section>

      <div className="space-y-3">
        {INTEGRATIONS.map((integration) => (
          <div key={integration.name} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-slate-800">{integration.name}</h3>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[integration.status]}`}
              >
                {STATUS_LABEL[integration.status]}
              </span>
            </div>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase text-slate-400">Missing data</dt>
                <dd className="text-slate-600">{integration.missingData}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-400">Why it matters</dt>
                <dd className="text-slate-600">{integration.whyItMatters}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-400">Access required</dt>
                <dd className="text-slate-600">{integration.accessRequired}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-400">CSV fallback</dt>
                <dd className="text-slate-600">{integration.csvFallback}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
