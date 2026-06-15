import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login"];

// Lightweight proxy — checks for Supabase session cookie presence only.
// No Supabase SDK calls here (avoids Edge Runtime incompatibilities).
// Full auth validation happens server-side inside each page via createAdminClient.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Detect any Supabase auth cookie (format: sb-<ref>-auth-token)
  const hasSession = request.cookies.getAll().some(
    (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
  );

  // No session → send to login
  if (!hasSession && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Already has session and hitting login → go to dashboard
  if (hasSession && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|api).*)"],
};
