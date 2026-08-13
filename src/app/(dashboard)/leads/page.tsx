import { prisma } from "@/lib/db";
import { CsvImportForm } from "@/components/CsvImportForm";
import { LeadStatusSelect } from "@/components/LeadStatusSelect";
import { formatAge, formatResponseTime, requiresAction, nextAction, formatLastContact } from "@/lib/lead-format";

export const dynamic = "force-dynamic";

export default async function LeadCommandCenter({
  searchParams,
}: {
  searchParams?: Promise<{ filter?: string }>;
}) {
  const leads = await prisma.lead.findMany({
    include: { customer: true, appointment: true },
    orderBy: { createdAt: "desc" },
  });

  const resolvedSearchParams = await searchParams;
  const filter = resolvedSearchParams?.filter;
  const rows = filter === "action" ? leads.filter(requiresAction) : leads;
  const actionCount = leads.filter(requiresAction).length;

  return (
    <div className="space-y-6">
      <section className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-canopy-900">Lead Command Center</h1>
          <p className="mt-1 text-sm text-slate-500">
            Lead generated → contacted → conversation → appointment → show → outcome.
          </p>
        </div>
        <CsvImportForm
          action="/api/leads/import"
          columnsHint="firstName, lastName, email, phone, source, department, interestType, landingPage, createdAt"
        />
      </section>

      <section className="flex gap-2">
        <a
          href="/leads"
          className={`rounded-md px-3 py-1.5 text-sm ${
            !filter ? "bg-canopy-700 text-white" : "bg-white text-slate-600 border border-slate-200"
          }`}
        >
          All ({leads.length})
        </a>
        <a
          href="/leads?filter=action"
          className={`rounded-md px-3 py-1.5 text-sm ${
            filter === "action" ? "bg-canopy-700 text-white" : "bg-white text-slate-600 border border-slate-200"
          }`}
        >
          Needs Action ({actionCount})
        </a>
      </section>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {[
                "Lead",
                "Created",
                "Age",
                "Source",
                "Landing Page",
                "Interest",
                "Department",
                "Assigned",
                "Response Time",
                "Appointment",
                "Last Contact",
                "Status",
                "Next Action",
              ].map((h) => (
                <th key={h} className="whitespace-nowrap px-4 py-2 text-left font-medium text-slate-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={13} className="px-4 py-6 text-center text-slate-400">
                  No leads match this filter.
                </td>
              </tr>
            )}
            {rows.map((lead) => {
              const needsAction = requiresAction(lead);
              const action = nextAction(lead);
              return (
                <tr key={lead.id} className={needsAction ? "bg-red-50/50" : undefined}>
                  <td className="whitespace-nowrap px-4 py-2 font-medium text-slate-700">
                    {lead.customer ? `${lead.customer.firstName} ${lead.customer.lastName}` : "Unknown"}
                    {lead.isSampleData && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                        Sample
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-slate-500">
                    {lead.createdAt.toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-slate-500">{formatAge(lead.createdAt)}</td>
                  <td className="whitespace-nowrap px-4 py-2">{lead.source}</td>
                  <td className="max-w-[160px] truncate px-4 py-2 text-slate-500" title={lead.landingPage ?? ""}>
                    {lead.landingPage ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2">{lead.interestType ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-2">{lead.department}</td>
                  <td className="whitespace-nowrap px-4 py-2">{lead.assignedTo ?? "Unassigned"}</td>
                  <td className="whitespace-nowrap px-4 py-2">
                    {formatResponseTime(lead.createdAt, lead.firstResponseAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-slate-500">
                    {lead.appointment
                      ? `${lead.appointment.scheduledAt.toLocaleDateString()} ${lead.appointment.scheduledAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}${lead.appointment.showed === true ? " (showed)" : lead.appointment.showed === false ? " (no-show)" : ""}`
                      : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-slate-500">
                    {formatLastContact(lead.lastContactAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2">
                    <LeadStatusSelect leadId={lead.id} currentStatus={lead.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-slate-500">
                    {needsAction ? (
                      <span className="font-medium text-red-600">{action}</span>
                    ) : (
                      action
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
