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
  const isLogin = pathname === "/admin/login";

  let response: NextResponse;
  let userId: string | null;

  try {
    const session = await updateSession(request);
    response = session.response;
    userId = session.userId;
  } catch (err) {
    if (isAdmin && !isLogin) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("error", "config");
      const missing = extractMissingEnvFromError(err);
      if (missing) url.searchParams.set("missing", missing);
      return NextResponse.redirect(url);
    }
    response = NextResponse.next({ request });
    userId = null;
  }

  if (isAdmin) {
    if (!userId && !isLogin) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
    if (userId && isLogin) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/dashboard";
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
