"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/profiles";

export async function login(formData: FormData) {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (err) {
    const message =
      err && typeof err === "object" && "message" in err && typeof err.message === "string"
        ? err.message
        : null;
    const missing = message?.match(/Variável de ambiente ausente:\s*(.+)$/)?.[1]?.trim() || null;
    const url = missing
      ? `/admin/login?error=config&missing=${encodeURIComponent(missing)}`
      : "/admin/login?error=config";
    redirect(url);
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/admin/login?error=invalid");

  let profile;
  try {
    profile = await getCurrentProfile();
  } catch (err) {
    await supabase.auth.signOut();
    const message =
      err && typeof err === "object" && "message" in err && typeof err.message === "string"
        ? err.message
        : null;
    const missing = message?.match(/Variável de ambiente ausente:\s*(.+)$/)?.[1]?.trim() || null;
    const url = missing
      ? `/admin/login?error=config&missing=${encodeURIComponent(missing)}`
      : "/admin/login?error=config";
    redirect(url);
  }

  if (!profile) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=profile");
  }

  if (profile.status === "blocked") {
    await supabase.auth.signOut();
    redirect("/admin/login?error=blocked");
  }

  if (profile.role !== "admin") {
    await supabase.auth.signOut();
    redirect("/admin/login?error=forbidden");
  }

  redirect("/admin/dashboard");
}

export async function logout() {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (err) {
    const message =
      err && typeof err === "object" && "message" in err && typeof err.message === "string"
        ? err.message
        : null;
    const missing = message?.match(/Variável de ambiente ausente:\s*(.+)$/)?.[1]?.trim() || null;
    const url = missing
      ? `/admin/login?error=config&missing=${encodeURIComponent(missing)}`
      : "/admin/login?error=config";
    redirect(url);
  }
  await supabase.auth.signOut();
  redirect("/admin/login");
}
