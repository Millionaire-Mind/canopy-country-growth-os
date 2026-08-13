"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const STATUSES = [
  "NEW",
  "CONTACTED",
  "ENGAGED",
  "APPOINTMENT",
  "SHOWED",
  "SOLD_RO_OPENED",
  "LOST",
  "NURTURE",
];

export function LeadStatusSelect({
  leadId,
  currentStatus,
}: {
  leadId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);

  async function handleChange(next: string) {
    setStatus(next);
    setSaving(true);
    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <select
      value={status}
      disabled={saving}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 disabled:opacity-60"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s.replace(/_/g, " ")}
        </option>
      ))}
    </select>
  );
}
