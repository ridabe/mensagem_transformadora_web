import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseEnvOptional } from "@/lib/supabase/env";

export async function createClient() {
  const cookieStore = await cookies();
  const env = getSupabaseEnvOptional();
  if (!env) return null;
  const { url, publishableKey } = env;

  return createServerClient(url, publishableKey, {
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
