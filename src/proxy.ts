import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Next 16's renamed middleware.ts. Runs on the Edge runtime, so it uses the
// Prisma-free half of the Auth.js config (auth.config.ts) — just enough to validate
// the signed session token and redirect. The database-backed revocation check lives
// in auth.ts (Node runtime), invoked from the dashboard layout on every page load.
export const proxy = NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
