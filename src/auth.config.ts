import type { NextAuthConfig } from "next-auth";

// Edge-safe half of the Auth.js config — used by proxy.ts (Edge runtime middleware).
// No Prisma/database access here: Prisma's Postgres driver needs a real TCP
// connection, which isn't available on Vercel's Edge runtime. This half only
// validates the signed session token and decides redirects; the Node-runtime half
// (auth.ts) does the actual credential/database checks, including revocation.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  // Vercel terminates TLS and proxies to the app, so Auth.js needs to trust the
  // forwarded host/proto headers rather than only trusting a literal localhost.
  trustHost: true,
  session: {
    strategy: "jwt",
    // Deliberately short: with Credentials + JWT, an already-issued token stays
    // valid until it expires even if the user is deactivated in the meantime (see
    // docs/DEPLOYMENT.md). A short maxAge bounds how long that window can be.
    maxAge: 60 * 60 * 12, // 12 hours
  },
  callbacks: {
    // Deliberately coarse: this only checks JWT signature/expiry at the Edge, with no
    // database access (see the file header). It must NOT redirect an already-logged-in
    // user away from /login — that "already logged in" read is exactly what's stale for
    // a just-deactivated user, and bouncing them home from /login while the Node-runtime
    // dashboard layout bounces them back to /login (its stricter, DB-aware check) is an
    // infinite redirect loop. Instead, /login handles its own "already logged in, skip
    // the form" case itself, using the DB-aware `auth()` from auth.ts.
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isPublicRoute = pathname === "/login" || pathname.startsWith("/api/auth");
      if (isPublicRoute) return true;

      return !!auth?.user;
    },
  },
  providers: [], // populated in auth.ts (Node runtime) — Credentials needs Prisma
} satisfies NextAuthConfig;
