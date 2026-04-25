"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function getString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

export async function login(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) redirect("/admin/login?error=config");

  const email = getString(formData, "email").trim();
  const password = getString(formData, "password");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/admin/login?error=invalid");

  redirect("/admin/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  if (!supabase) redirect("/admin/login?error=config");
  await supabase.auth.signOut();
  redirect("/admin/login");
}

