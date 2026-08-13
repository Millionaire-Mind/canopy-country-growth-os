const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800",
  CONTACTED: "bg-indigo-100 text-indigo-800",
  ENGAGED: "bg-purple-100 text-purple-800",
  APPOINTMENT: "bg-amber-100 text-amber-800",
  SHOWED: "bg-teal-100 text-teal-800",
  SOLD_RO_OPENED: "bg-green-100 text-green-800",
  LOST: "bg-red-100 text-red-800",
  NURTURE: "bg-slate-200 text-slate-700",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-slate-200 text-slate-700";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

const ALERT_STYLES: Record<string, string> = {
  URGENT: "border-red-300 bg-red-50 text-red-800",
  HIGH_VALUE: "border-amber-300 bg-amber-50 text-amber-800",
  OPPORTUNITY: "border-blue-300 bg-blue-50 text-blue-800",
  RETENTION: "border-teal-300 bg-teal-50 text-teal-800",
};

export function AlertBadge({ severity }: { severity: string }) {
  const style = ALERT_STYLES[severity] ?? "border-slate-300 bg-slate-50 text-slate-700";
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${style}`}>
      {severity.replace(/_/g, " ")}
    </span>
  );
}
