import Link from "next/link";
import { SampleDataBanner } from "@/components/SampleDataBanner";

const NAV = [
  { href: "/", label: "Executive Command Center" },
  { href: "/leads", label: "Lead Command Center" },
  { href: "/search", label: "Search & Demand Capture" },
  { href: "/campaigns", label: "Campaign Opportunities" },
  { href: "/customers", label: "Customer Ownership" },
  { href: "/content", label: "Content & Authority" },
  { href: "/data-health", label: "Data Health" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <SampleDataBanner />
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-canopy-900">Canopy Country Growth OS</div>
            <div className="text-xs text-slate-500">
              Yakima Valley &amp; Central Washington — dream to repurchase
            </div>
          </div>
          <form action="/api/logout" method="post">
            <button className="text-xs text-slate-400 hover:text-slate-600" formAction="/api/logout">
              Sign out
            </button>
          </form>
        </div>
        <nav className="mt-4 flex flex-wrap gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-canopy-50 hover:text-canopy-700"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
