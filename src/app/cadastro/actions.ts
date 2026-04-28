"use server";

import { redirect } from "next/navigation";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/profiles";

function extractMissingEnvFromError(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const message = "message" in err && typeof err.message === "string" ? err.message : "";
  const match = message.match(/Variável de ambiente ausente:\s*(.+)$/);
  return match?.[1]?.trim() ? match[1].trim() : null;
}

function getString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

export async function signup(formData: FormData) {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (err) {
    const missing = extractMissingEnvFromError(err);
    const url = missing
      ? `/cadastro?error=config&missing=${encodeURIComponent(missing)}`
      : "/cadastro?error=config";
    redirect(url);
  }

  const name = getString(formData, "name").trim();
  const email = getString(formData, "email").trim();
  const password = getString(formData, "password");

  if (name.length < 3) redirect("/cadastro?error=name");
  if (!email) redirect("/cadastro?error=email");
  if (password.length < 6) redirect("/cadastro?error=password");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: name },
    },
  });

  if (error) redirect("/cadastro?error=signup");

  const userId = data.user?.id ?? null;
  if (userId) {
    try {
      const service = createServiceRoleClient();
      await service.from("profiles").upsert(
        {
          auth_user_id: userId,
          name,
          email,
          role: "leader",
          status: "active",
        },
        { onConflict: "auth_user_id" },
      );
    } catch (err) {
      const missing = extractMissingEnvFromError(err);
      const url = missing
        ? `/cadastro?error=config&missing=${encodeURIComponent(missing)}`
        : "/cadastro?error=config";
      redirect(url);
    }
  }

  const profile = await getCurrentProfile().catch(() => null);
  if (profile?.role === "leader" && profile.status !== "blocked") redirect("/lider/sermoes");

  redirect("/login?info=created");
}

