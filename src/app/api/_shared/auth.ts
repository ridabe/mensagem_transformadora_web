import { createClient as createSupabaseJsClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabasePublicEnv } from "@/lib/supabase/env";

export function extractBearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const parts = authorization.split(" ");
  if (parts.length !== 2) return null;
  const [scheme, token] = parts;
  if (!/^Bearer$/i.test(scheme)) return null;
  return token?.trim() ? token.trim() : null;
}

export function createApiSupabaseClient(accessToken: string): SupabaseClient {
  const { url, publishableKey } = getSupabasePublicEnv();
  return createSupabaseJsClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}

