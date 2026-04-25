type SupabasePublicEnv = { url: string; publishableKey: string };
type SupabaseServiceEnv = { url: string; serviceRoleKey: string };

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente ausente: ${name}`);
  }
  return value;
}

export function getSupabasePublicEnv(): SupabasePublicEnv {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
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
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return { url, serviceRoleKey };
}
