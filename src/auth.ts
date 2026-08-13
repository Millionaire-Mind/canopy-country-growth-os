import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/db";

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

        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

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
