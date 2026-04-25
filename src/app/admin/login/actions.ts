"use server";

import { redirect } from "next/navigation";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

function getString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

function extractMissingEnvFromError(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const message = "message" in err && typeof err.message === "string" ? err.message : "";
  const match = message.match(/Variável de ambiente ausente:\s*(.+)$/);
  return match?.[1]?.trim() ? match[1].trim() : null;
}

export async function login(formData: FormData) {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (err) {
    const missing = extractMissingEnvFromError(err);
    const url = missing
      ? `/admin/login?error=config&missing=${encodeURIComponent(missing)}`
      : "/admin/login?error=config";
    redirect(url);
  }

  const email = getString(formData, "email").trim();
  const password = getString(formData, "password");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/admin/login?error=invalid");

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (user?.id && user.email) {
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!existingProfile?.id) {
      const displayNameRaw =
        typeof user.user_metadata?.display_name === "string"
          ? user.user_metadata.display_name
          : null;
      const displayName =
        displayNameRaw?.trim() || user.email.split("@")[0] || "Usuário";

      try {
        const service = createServiceRoleClient();
        await service.from("profiles").upsert(
          {
            id: user.id,
            display_name: displayName,
            email: user.email,
          },
          { onConflict: "id" },
        );
      } catch (err) {
        const missing = extractMissingEnvFromError(err);
        const url = missing
          ? `/admin/login?error=config&missing=${encodeURIComponent(missing)}`
          : "/admin/login?error=config";
        redirect(url);
      }
    }
  }

  redirect("/admin/dashboard");
}

export async function logout() {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (err) {
    const missing = extractMissingEnvFromError(err);
    const url = missing
      ? `/admin/login?error=config&missing=${encodeURIComponent(missing)}`
      : "/admin/login?error=config";
    redirect(url);
  }
  await supabase.auth.signOut();
  redirect("/admin/login");
}
