import { auth, signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

async function authenticate(formData: FormData) {
  "use server";
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    // signIn() itself throws a Next.js redirect internally on success — that must
    // propagate un-caught, so only AuthError (real sign-in failure) is handled here.
    if (error instanceof AuthError) {
      redirect("/login?error=CredentialsSignin");
    }
    throw error;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  // DB-aware check (unlike proxy.ts's Edge-only JWT check) — see auth.config.ts for why
  // this can't live at the Edge layer without causing a redirect loop for revoked users.
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  const resolved = await searchParams;
  const hasError = resolved?.error === "CredentialsSignin";

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        action={authenticate}
        className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-lg font-semibold text-canopy-900">Canopy Country Growth OS</h1>
        <p className="mt-1 text-sm text-slate-500">Internal staff access only.</p>

        <label className="mt-6 block text-sm font-medium text-slate-700">
          Email
          <input
            type="email"
            name="email"
            required
            autoFocus
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-canopy-600 focus:outline-none focus:ring-1 focus:ring-canopy-600"
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Password
          <input
            type="password"
            name="password"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-canopy-600 focus:outline-none focus:ring-1 focus:ring-canopy-600"
          />
        </label>

        {hasError && (
          <p className="mt-2 text-sm text-red-600">
            Incorrect email or password, or this account has been deactivated.
          </p>
        )}

        <button
          type="submit"
          className="mt-4 w-full rounded-md bg-canopy-700 px-4 py-2 text-sm font-medium text-white hover:bg-canopy-600"
        >
          Sign in
        </button>

        <p className="mt-4 text-xs text-slate-400">
          No account? Ask an admin to create one — see docs/DEPLOYMENT.md.
        </p>
      </form>
    </div>
  );
}
