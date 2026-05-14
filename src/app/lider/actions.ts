"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const VALID_TITLES = ["pastor", "diacono", "bispo", "apostolo", "missionario", "pregador", "lider"];

export async function updateMinistryTitle(formData: FormData) {
  const raw = formData.get("ministry_title");
  const title = typeof raw === "string" ? raw.trim().toLowerCase() : "";

  if (!VALID_TITLES.includes(title)) redirect("/lider/sermoes");

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.id) redirect("/login");

  await supabase
    .from("profiles")
    .update({ ministry_title: title })
    .eq("auth_user_id", data.user.id);

  redirect("/lider/sermoes");
}
