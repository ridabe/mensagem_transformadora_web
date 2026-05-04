"use server";

import { redirect } from "next/navigation";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/profiles";

// Types
export type ChurchRow = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  status: "active" | "inactive";
  plan_type: string;
  plan_status: string;
  business_enabled_at: string | null;
  business_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileRowWithChurch = {
  id: string;
  auth_user_id: string;
  name: string;
  display_name: string;
  email: string;
  role: string;
  status: string;
  church_id: string | null;
  ministry_title: string | null;
  created_at: string;
};

// Helpers
function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : "";
}

function parseStatus(value: string): "active" | "inactive" {
  return value === "inactive" ? "inactive" : "active";
}

function extractMissingEnvFromError(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const message = "message" in err && typeof err.message === "string" ? err.message : "";
  const match = message.match(/Variável de ambiente ausente:\s*(.+)$/);
  return match?.[1]?.trim() ? match[1].trim() : null;
}

// Query Actions
export async function getAllChurches(): Promise<ChurchRow[]> {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("churches")
    .select(
      "id,name,city,state,status,plan_type,plan_status,business_enabled_at,business_notes,created_at,updated_at",
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch churches: ${error.message}`);
  return (data || []) as ChurchRow[];
}

export async function getChurchById(id: string): Promise<ChurchRow | null> {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("churches")
    .select(
      "id,name,city,state,status,plan_type,plan_status,business_enabled_at,business_notes,created_at,updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch church: ${error.message}`);
  return (data || null) as ChurchRow | null;
}

export async function getChurchUsers(
  churchId: string,
): Promise<ProfileRowWithChurch[]> {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("profiles")
    .select(
      "id,auth_user_id,name,display_name,email,role,status,church_id,ministry_title,created_at",
    )
    .eq("church_id", churchId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch church users: ${error.message}`);
  return (data || []) as ProfileRowWithChurch[];
}

// Write Actions
export async function createChurchAction(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login?error=forbidden");
  }

  const name = normalizeOptionalText(getString(formData.get("name")));
  const city = normalizeOptionalText(getString(formData.get("city")));
  const state = normalizeOptionalText(getString(formData.get("state")));
  const status = parseStatus(getString(formData.get("status")));

  if (!name) {
    redirect("/admin/global/igrejas?error=name");
  }

  const service = createServiceRoleClient();
  const { error } = await service.from("churches").insert({
    name,
    city: city || null,
    state: state || null,
    status,
    plan_type: "free",
    plan_status: "active",
  });

  if (error) {
    redirect("/admin/global/igrejas?error=create");
  }

  redirect("/admin/global/igrejas?saved=1");
}

export async function updateChurchAction(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login?error=forbidden");
  }

  const id = getString(formData.get("id"));
  if (!id) {
    redirect("/admin/global/igrejas");
  }

  const name = normalizeOptionalText(getString(formData.get("name")));
  const city = normalizeOptionalText(getString(formData.get("city")));
  const state = normalizeOptionalText(getString(formData.get("state")));
  const status = parseStatus(getString(formData.get("status")));
  const businessNotes = normalizeOptionalText(getString(formData.get("business_notes")));

  if (!name) {
    redirect(`/admin/global/igrejas?error=name&id=${encodeURIComponent(id)}`);
  }

  const service = createServiceRoleClient();
  const { error } = await service
    .from("churches")
    .update({
      name,
      city: city || null,
      state: state || null,
      status,
      business_notes: businessNotes || null,
    })
    .eq("id", id);

  if (error) {
    redirect(`/admin/global/igrejas?error=update&id=${encodeURIComponent(id)}`);
  }

  redirect("/admin/global/igrejas?saved=1");
}

export async function toggleChurchStatusAction(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login?error=forbidden");
  }

  const id = getString(formData.get("id"));
  const newStatus = parseStatus(getString(formData.get("new_status")));

  if (!id) {
    redirect("/admin/global/igrejas");
  }

  const service = createServiceRoleClient();
  const { error } = await service.from("churches").update({ status: newStatus }).eq("id", id);

  if (error) {
    redirect(`/admin/global/igrejas?error=status&id=${encodeURIComponent(id)}`);
  }

  redirect("/admin/global/igrejas?saved=1");
}
