"use client";

// Catches errors thrown by the root layout itself (app/layout.tsx). This replaces the
// entire document when active, so it must render its own <html>/<body> and cannot rely
// on globals.css or the app's normal styling.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f8fafc",
          color: "#0f172a",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center", padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Something went wrong</h2>
          <p style={{ marginTop: 8, fontSize: 14, color: "#64748b" }}>
            The application failed to load. Nothing was changed.
          </p>
          {error.digest && (
            <p style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>
              Reference: {error.digest}
            </p>
          )}
          <button
            onClick={() => retry()}
            style={{
              marginTop: 16,
              borderRadius: 6,
              background: "#15803d",
              color: "white",
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
