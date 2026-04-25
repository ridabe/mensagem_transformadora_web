import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnvOptional } from "@/lib/supabase/env";

export function createClient() {
  const env = getSupabaseEnvOptional();
  if (!env) return null;
  const { url, publishableKey } = env;
  return createBrowserClient(url, publishableKey);
}
