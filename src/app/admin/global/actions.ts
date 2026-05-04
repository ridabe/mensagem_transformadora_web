"use server";

import { redirect } from "next/navigation";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/profiles";
import {
  ChurchPlanStatus,
  ChurchPlanStatusInfo,
  ChurchPlanType,
  isValidChurchPlanStatus,
  isValidChurchPlanType,
} from "@/features/admin/churches/churchPlans";

// Types
export type ChurchRow = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  status: "active" | "inactive";
  plan_type: ChurchPlanType;
  plan_status: ChurchPlanStatus;
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
  return trimmed ? trimmed : null;
}

function parseStatus(value: string): "active" | "inactive" {
  return value === "inactive" ? "inactive" : "active";
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

export async function getChurchPlanStatus(id: string): Promise<ChurchPlanStatusInfo | null> {
  const church = await getChurchById(id);
  if (!church) return null;
  return {
    plan_type: church.plan_type,
    plan_status: church.plan_status,
    business_enabled_at: church.business_enabled_at,
    business_notes: church.business_notes,
  };
}

export async function updateChurchPlan(input: {
  id: string;
  plan_type: ChurchPlanType;
  plan_status: ChurchPlanStatus;
  business_notes: string | null;
  name?: string;
  city?: string | null;
  state?: string | null;
  status?: "active" | "inactive";
}) {
  const existing = await getChurchById(input.id);
  if (!existing) {
    throw new Error(`Church with id ${input.id} not found`);
  }

  const updateData: Record<string, unknown> = {
    plan_type: input.plan_type,
    plan_status: input.plan_status,
    business_notes: input.business_notes,
  };

  if (typeof input.name !== "undefined") updateData.name = input.name;
  if (typeof input.city !== "undefined") updateData.city = input.city ?? null;
  if (typeof input.state !== "undefined") updateData.state = input.state ?? null;
  if (typeof input.status !== "undefined") updateData.status = input.status;

  if (input.plan_type === "business" && input.plan_status === "active" && !existing.business_enabled_at) {
    updateData.business_enabled_at = new Date().toISOString();
  }

  const service = createServiceRoleClient();
  const { error } = await service.from("churches").update(updateData).eq("id", input.id);
  if (error) {
    throw new Error(`Failed to update church plan: ${error.message}`);
  }
}

export async function activateBusinessPlan(id: string, businessNotes: string | null = null) {
  return updateChurchPlan({
    id,
    plan_type: "business",
    plan_status: "active",
    business_notes: businessNotes,
  });
}

export async function suspendBusinessPlan(id: string, businessNotes: string | null = null) {
  return updateChurchPlan({
    id,
    plan_type: "business",
    plan_status: "suspended",
    business_notes: businessNotes,
  });
}

export async function cancelBusinessPlan(id: string, businessNotes: string | null = null) {
  return updateChurchPlan({
    id,
    plan_type: "business",
    plan_status: "cancelled",
    business_notes: businessNotes,
  });
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
  const planTypeInput = getString(formData.get("plan_type"));
  const planStatusInput = getString(formData.get("plan_status"));
  const businessNotes = normalizeOptionalText(getString(formData.get("business_notes")));

  if (!name) {
    redirect(`/admin/global/igrejas?error=name&id=${encodeURIComponent(id)}`);
  }

  if (!isValidChurchPlanType(planTypeInput)) {
    redirect(`/admin/global/igrejas?error=plan_type&id=${encodeURIComponent(id)}`);
  }

  if (!isValidChurchPlanStatus(planStatusInput)) {
    redirect(`/admin/global/igrejas?error=plan_status&id=${encodeURIComponent(id)}`);
  }

  try {
    await updateChurchPlan({
      id,
      name,
      city,
      state,
      status,
      plan_type: planTypeInput,
      plan_status: planStatusInput,
      business_notes: businessNotes,
    });
  } catch {
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
