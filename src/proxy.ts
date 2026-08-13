import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, isValidSessionCookieValue } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const isLoginRoute = request.nextUrl.pathname === "/login";
  const isAuthApi = request.nextUrl.pathname === "/api/login";
  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const authenticated = await isValidSessionCookieValue(cookie);

  if (!authenticated && !isLoginRoute && !isAuthApi) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (authenticated && isLoginRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
