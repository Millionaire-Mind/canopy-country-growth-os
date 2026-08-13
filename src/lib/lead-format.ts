// Pure display-formatting helpers for the Lead Command Center, kept separate from the
// page component so they're directly testable without rendering React.

export function formatAge(from: Date, now: Date = new Date()): string {
  const ms = now.getTime() - from.getTime();
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function formatResponseTime(createdAt: Date, firstResponseAt: Date | null): string {
  if (!firstResponseAt) return "No response yet";
  const ms = firstResponseAt.getTime() - createdAt.getTime();
  const hours = ms / (1000 * 60 * 60);
  if (hours < 1) return `${Math.round(ms / 60000)} min`;
  return `${hours.toFixed(1)} hrs`;
}

export function requiresAction(lead: {
  status: string;
  firstResponseAt: Date | null;
  appointmentId: string | null;
}): boolean {
  if (lead.status === "NEW" && !lead.firstResponseAt) return true;
  if (["CONTACTED", "ENGAGED"].includes(lead.status) && !lead.appointmentId) return true;
  return false;
}

// A CONTACTED/ENGAGED lead has already had its first contact — the next action is to
// get it to an appointment, not "Contact now" (which previously fired for this case too,
// indistinguishable from a NEW lead that's never been touched).
export function nextAction(lead: {
  status: string;
  firstResponseAt: Date | null;
  appointmentId: string | null;
}): string {
  if (lead.status === "NEW" && !lead.firstResponseAt) return "Contact now";
  if (["CONTACTED", "ENGAGED"].includes(lead.status) && !lead.appointmentId) {
    return "Schedule appointment";
  }
  if (lead.status === "APPOINTMENT") return "Confirm show";
  if (lead.status === "SHOWED") return "Log outcome";
  return "—";
}

export function formatLastContact(d: Date | null): string {
  if (!d) return "Never";
  return d.toLocaleDateString();
}
