import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

function extractMissingEnvFromError(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const message = "message" in err && typeof err.message === "string" ? err.message : "";
  const match = message.match(/Variável de ambiente ausente:\s*(.+)$/);
  return match?.[1]?.trim() ? match[1].trim() : null;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAdmin = pathname.startsWith("/admin");
  const isLeader = pathname.startsWith("/lider");
  const isLogin = pathname === "/login";
  const isLegacyAdminLogin = pathname === "/admin/login";

  let response: NextResponse;
  let userId: string | null;
  let profile: { role: string; status: string } | null;

  try {
    const session = await updateSession(request);
    response = session.response;
    userId = session.userId;
    profile = session.profile;
  } catch (err) {
    if ((isAdmin || isLeader) && !isLogin && !isLegacyAdminLogin) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "config");
      const missing = extractMissingEnvFromError(err);
      if (missing) url.searchParams.set("missing", missing);
      return NextResponse.redirect(url);
    }
    response = NextResponse.next({ request });
    userId = null;
    profile = null;
  }

  if (isLegacyAdminLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const isProtected = isAdmin || isLeader;

  if (isProtected) {
    if (!userId) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    if (!profile) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    const role = profile.role === "admin" || profile.role === "leader" ? profile.role : null;
    const status =
      profile.status === "active" || profile.status === "blocked" || profile.status === "pending"
        ? profile.status
        : null;

    if (status === "blocked") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "blocked");
      return NextResponse.redirect(url);
    }

    if (isAdmin && role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/lider/sermoes";
      return NextResponse.redirect(url);
    }

    if (isLeader && role !== "leader") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/dashboard";
      return NextResponse.redirect(url);
    }
  }

  if (isLogin && request.method === "GET" && userId && profile) {
    const role = profile.role === "admin" || profile.role === "leader" ? profile.role : null;
    const status =
      profile.status === "active" || profile.status === "blocked" || profile.status === "pending"
        ? profile.status
        : null;

    if (status === "blocked") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "blocked");
      return NextResponse.redirect(url);
    }

    if (role === "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/dashboard";
      return NextResponse.redirect(url);
    }

    if (role === "leader") {
      const url = request.nextUrl.clone();
      url.pathname = "/lider/sermoes";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
