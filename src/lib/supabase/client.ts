import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicEnv } from "@/lib/supabase/env";

export const SUPABASE_BROWSER_CLIENT_SOURCE = "src/lib/supabase/client.ts";

export function createClient() {
  const { url, publishableKey } = getSupabasePublicEnv();
  return createBrowserClient(url, publishableKey);
}
