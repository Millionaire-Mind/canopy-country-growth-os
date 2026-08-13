import { NextResponse } from "next/server";
import { auth } from "@/auth";

// proxy.ts already blocks fully unauthenticated requests at the Edge, but it can't
// see a mid-session deactivation (see auth.config.ts). Route handlers that read or
// write PII/lead data call this directly so a deactivated account's already-issued
// token stops working here too, not just on page navigation.
export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    return { session: null, response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }
  return { session, response: null as NextResponse | null };
}
