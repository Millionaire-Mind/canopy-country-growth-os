"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function CsvImportForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setStatus(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/leads/import", { method: "POST", body: formData });
    const result = await res.json();
    setBusy(false);

    if (res.ok) {
      setStatus(`Imported ${result.imported} lead(s).${result.errors.length ? ` ${result.errors.length} row(s) skipped — see console.` : ""}`);
      if (result.errors.length) console.warn("CSV import errors:", result.errors);
      router.refresh();
    } else {
      setStatus(result.error ?? "Import failed.");
    }

    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="text-right">
      <label className="inline-block cursor-pointer rounded-md bg-canopy-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-canopy-600">
        {busy ? "Importing..." : "Import CSV"}
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="hidden"
          disabled={busy}
        />
      </label>
      {status && <p className="mt-1 max-w-xs text-xs text-slate-500">{status}</p>}
      <p className="mt-1 text-xs text-slate-400">
        Columns: firstName, lastName, email, phone, source, department, interestType,
        landingPage, createdAt
      </p>
    </div>
  );
}
