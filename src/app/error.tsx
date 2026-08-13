"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center">
        <h2 className="text-lg font-semibold text-canopy-900">Something went wrong</h2>
        <p className="mt-2 text-sm text-slate-500">
          An unexpected error occurred loading this page. Nothing was changed. If this
          keeps happening, note the reference below and contact whoever manages this
          deployment.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-slate-400">Reference: {error.digest}</p>
        )}
        <button
          onClick={() => retry()}
          className="mt-4 rounded-md bg-canopy-700 px-4 py-2 text-sm font-medium text-white hover:bg-canopy-600"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
