import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublicEnv } from "@/lib/supabase/env";

export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse;
  userId: string | null;
  profile: { role: string; status: string } | null;
}> {
  let supabaseResponse = NextResponse.next({ request });
  const { url, publishableKey } = getSupabasePublicEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id ?? null;

  let profile: { role: string; status: string } | null = null;
  if (userId) {
    const byAuthUserId = await supabase
      .from("profiles")
      .select("role,status")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (byAuthUserId.data?.role && byAuthUserId.data?.status) {
      profile = {
        role: String(byAuthUserId.data.role),
        status: String(byAuthUserId.data.status),
      };
    } else {
      const byId = await supabase
        .from("profiles")
        .select("role,status")
        .eq("id", userId)
        .maybeSingle();

      if (byId.data?.role && byId.data?.status) {
        profile = {
          role: String(byId.data.role),
          status: String(byId.data.status),
        };
      }
    }
  }

  return { response: supabaseResponse, userId, profile };
}
