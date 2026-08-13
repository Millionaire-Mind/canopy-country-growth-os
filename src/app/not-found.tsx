import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center">
        <h2 className="text-lg font-semibold text-canopy-900">Page not found</h2>
        <p className="mt-2 text-sm text-slate-500">
          There&apos;s nothing here. Check the URL, or go back to the Executive Command
          Center.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-md bg-canopy-700 px-4 py-2 text-sm font-medium text-white hover:bg-canopy-600"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
