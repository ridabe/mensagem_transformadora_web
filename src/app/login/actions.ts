"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/profiles";

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
      ? `/login?error=config&missing=${encodeURIComponent(missing)}`
      : "/login?error=config";
    redirect(url);
  }

  const email = getString(formData, "email").trim();
  const password = getString(formData, "password");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=invalid");

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
