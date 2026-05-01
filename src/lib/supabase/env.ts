type SupabasePublicEnv = { url: string; publishableKey: string };
type SupabaseServiceEnv = { url: string; serviceRoleKey: string };

export const SUPABASE_ENV_SOURCE = "src/lib/supabase/env.ts";

export function getSupabasePublicEnvStatus(): {
  hasUrl: boolean;
  hasPublishableKey: boolean;
  source: string;
} {
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasPublishableKey = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  return { hasUrl, hasPublishableKey, source: SUPABASE_ENV_SOURCE };
}

export function getSupabasePublicEnv(): SupabasePublicEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("Variável de ambiente ausente: NEXT_PUBLIC_SUPABASE_URL");
  }

  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!publishableKey) {
    throw new Error(
      "Variável de ambiente ausente: NEXT_PUBLIC_SUPABASE_ANON_KEY (ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)",
    );
  }

  return { url, publishableKey };
}

export function getSupabaseServiceEnv(): SupabaseServiceEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("Variável de ambiente ausente: NEXT_PUBLIC_SUPABASE_URL");
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("Variável de ambiente ausente: SUPABASE_SERVICE_ROLE_KEY");
  }
  return { url, serviceRoleKey };
}
