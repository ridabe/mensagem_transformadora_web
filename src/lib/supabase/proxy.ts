import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnvOptional } from "@/lib/supabase/env";

export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse;
  claims: unknown | null;
}> {
  let supabaseResponse = NextResponse.next({ request });
  const env = getSupabaseEnvOptional();
  if (!env) return { response: supabaseResponse, claims: null };
  const { url, publishableKey } = env;

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

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;

  return { response: supabaseResponse, claims };
}
