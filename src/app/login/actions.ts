"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { canAccessChurchAdminArea, getCurrentProfile } from "@/lib/auth/profiles";

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

function isEmailNotConfirmedError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("email not confirmed") || m.includes("email não confirmado") || m.includes("not confirmed");
}

function isInvalidCredentialsError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("invalid login credentials") || m.includes("invalid");
}

export async function login(formData: FormData) {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (err) {
    const missing = extractMissingEnvFromError(err);
    const url = missing
      ? `/login?error=config&missing=${encodeURIComponent(missing)}`
      : "/login?error=config";
    redirect(url);
  }

  const email = getString(formData, "email").trim();
  const password = getString(formData, "password");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const msg = (error.message || "").trim();
    const reason = msg ? msg.slice(0, 200) : "Falha ao autenticar.";
    const code = isEmailNotConfirmedError(msg)
      ? "confirm"
      : isInvalidCredentialsError(msg)
        ? "invalid"
        : "invalid";
    redirect(`/login?error=${code}&reason=${encodeURIComponent(reason)}`);
  }

  let profile;
  try {
    profile = await getCurrentProfile();
  } catch (err) {
    await supabase.auth.signOut();
    const missing = extractMissingEnvFromError(err);
    const url = missing
      ? `/login?error=config&missing=${encodeURIComponent(missing)}`
      : "/login?error=config";
    redirect(url);
  }
  if (!profile) {
    await supabase.auth.signOut();
    redirect("/login?error=profile");
  }

  if (profile.status === "blocked") {
    await supabase.auth.signOut();
    redirect("/login?error=blocked");
  }

  if (profile.role === "admin") redirect("/admin/dashboard");
  if (profile.role === "church_admin") {
    const ok = await canAccessChurchAdminArea(profile);
    if (ok) redirect("/igreja/dashboard");
    redirect(
      `/lider/sermoes?error=${encodeURIComponent("church_admin_not_allowed")}&reason=${encodeURIComponent(
        "Esta opção só está disponível para líderes associados a uma igreja com Plano Business ativo.",
      )}`,
    );
  }
  redirect("/lider/sermoes");
}

export async function logout() {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (err) {
    const missing = extractMissingEnvFromError(err);
    const url = missing
      ? `/login?error=config&missing=${encodeURIComponent(missing)}`
      : "/login?error=config";
    redirect(url);
  }
  await supabase.auth.signOut();
  redirect("/login");
}
