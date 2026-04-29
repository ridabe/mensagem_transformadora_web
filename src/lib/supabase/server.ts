import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import "server-only";

import { getSupabasePublicEnv, getSupabaseServiceEnv } from "@/lib/supabase/env";

const noStoreFetch: typeof fetch = (input, init) => {
  return fetch(input, { ...(init ?? {}), cache: "no-store" });
};

export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabasePublicEnv();

  return createServerClient(url, publishableKey, {
    global: { fetch: noStoreFetch },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
        }
      },
    },
  });
}

export function createServiceRoleClient() {
  const { url, serviceRoleKey } = getSupabaseServiceEnv();
  return createSupabaseJsClient(url, serviceRoleKey, {
    global: { fetch: noStoreFetch },
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
