import { hasSampleData } from "@/lib/data-mode";

export async function SampleDataBanner() {
  if (!(await hasSampleData())) return null;

  return (
    <div className="border-b border-amber-300 bg-amber-50 px-6 py-2 text-center text-xs font-medium text-amber-800">
      SAMPLE DATA PRESENT — some records shown across this app are seeded demo data,
      marked with a &quot;Sample&quot; badge. Import real leads via the Lead Command
      Center, or connect integrations on the Data Health screen, to replace them.
    </div>
  );
}
