import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/db";

// Login rate limiting (Phase 5). Persisted on the User row (failedLoginAttempts /
// lockedUntil) rather than in memory, since Vercel serverless functions don't share
// process memory across instances — an in-memory counter would reset on every cold
// start and wouldn't be shared between concurrent instances handling the same account.
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// Node-runtime Auth.js config (Server Components, Route Handlers, Server Actions).
// This is where Prisma is actually used — both for the initial credential check and,
// on every subsequent request that calls `auth()`, to re-confirm the account is still
// active. That re-check is what makes "deactivate a user" take effect on their very
// next page load rather than only after their session token expires.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user || !user.isActive) return null;

        // Locked accounts are refused even with a correct password.
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          return null;
        }

        const valid = await compare(password, user.passwordHash);
        if (!valid) {
          const attempts = user.failedLoginAttempts + 1;
          const lockedUntil =
            attempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null;
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: attempts, lockedUntil },
          });
          return null;
        }

        if (user.failedLoginAttempts > 0 || user.lockedUntil) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockedUntil: null },
          });
        }

        return { id: user.id, email: user.email, name: user.name ?? undefined };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        // Sign-in: user.id is set by authorize() above.
        token.sub = user.id;
        return token;
      }

      // Every other request that reaches this callback: re-verify against the
      // database rather than trusting the token alone. This is the revocation check.
      if (token.sub) {
        const current = await prisma.user.findUnique({ where: { id: token.sub } });
        if (!current || !current.isActive) {
          return null;
        }
        token.email = current.email;
        token.name = current.name;
      }

      return token;
    },
    async session({ session, token }) {
      if (token?.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
