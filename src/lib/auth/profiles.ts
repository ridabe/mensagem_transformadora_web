import { redirect } from "next/navigation";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export type ProfileRole = "admin" | "leader";
export type ProfileStatus = "active" | "blocked" | "pending";

export type CurrentProfile = {
  id: string;
  authUserId: string;
  name: string;
  email: string;
  role: ProfileRole;
  status: ProfileStatus;
  churchId: string | null;
};

function normalizeRole(value: unknown): ProfileRole | null {
  return value === "admin" || value === "leader" ? value : null;
}

function normalizeStatus(value: unknown): ProfileStatus | null {
  return value === "active" || value === "blocked" || value === "pending" ? value : null;
}

function getDisplayName(user: { email?: string | null; user_metadata?: Record<string, unknown> }) {
  const raw =
    user.user_metadata && typeof user.user_metadata.display_name === "string"
      ? user.user_metadata.display_name
      : null;
  const fromEmail = user.email ? user.email.split("@")[0] : null;
  return (raw?.trim() || fromEmail?.trim() || "Usuário").trim();
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user?.id) return null;

  const bootstrapAdminId = process.env.MT_BOOTSTRAP_ADMIN_AUTH_USER_ID?.trim() || null;

  const byAuthUserId = await supabase
    .from("profiles")
    .select("id,auth_user_id,name,email,role,status,church_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const row = byAuthUserId.data;

  if (!row?.id) {
    if (!user.email) return null;

    const churchIdCandidate =
      user.user_metadata && typeof user.user_metadata.church_id === "string"
        ? user.user_metadata.church_id.trim()
        : "";
    const churchId = isUuid(churchIdCandidate) ? churchIdCandidate : null;

    let churchOkId: string | null = null;
    if (churchId) {
      const { data: churchRow } = await supabase
        .from("churches")
        .select("id")
        .eq("id", churchId)
        .eq("status", "active")
        .maybeSingle();
      if (churchRow?.id) churchOkId = String(churchRow.id);
    }

    const created = await supabase
      .from("profiles")
      .insert({
        auth_user_id: user.id,
        name: getDisplayName(user),
        email: user.email,
        role: "leader",
        status: "active",
        church_id: churchOkId,
      })
      .select("id,auth_user_id,name,email,role,status,church_id")
      .single();

    const createdRow = created.data;
    if (!createdRow?.id) return null;

    await supabase.from("subscriptions").insert({
      leader_id: user.id,
      plan: "free",
      status: "free",
    });

    let role = normalizeRole(createdRow.role) ?? "leader";
    if (bootstrapAdminId && bootstrapAdminId === user.id && role !== "admin") {
      try {
        const service = createServiceRoleClient();
        await service.from("profiles").update({ role: "admin" }).eq("auth_user_id", user.id);
        role = "admin";
      } catch {
      }
    }

    return {
      id: String(createdRow.id),
      authUserId: String(createdRow.auth_user_id),
      name: String(createdRow.name),
      email: String(createdRow.email),
      role,
      status: normalizeStatus(createdRow.status) ?? "active",
      churchId: createdRow.church_id ? String(createdRow.church_id) : null,
    };
  }

  let role = normalizeRole(row.role);
  const status = normalizeStatus(row.status);
  if (!status) return null;

  if (bootstrapAdminId && bootstrapAdminId === user.id && role !== "admin") {
    try {
      const service = createServiceRoleClient();
      await service.from("profiles").update({ role: "admin" }).eq("id", row.id);
      role = "admin";
    } catch {
    }
  }

  if (!role) return null;

  if (!row.church_id) {
    const churchIdCandidate =
      user.user_metadata && typeof user.user_metadata.church_id === "string"
        ? user.user_metadata.church_id.trim()
        : "";
    if (isUuid(churchIdCandidate)) {
      const { data: churchRow } = await supabase
        .from("churches")
        .select("id")
        .eq("id", churchIdCandidate)
        .eq("status", "active")
        .maybeSingle();
      if (churchRow?.id) {
        await supabase.from("profiles").update({ church_id: churchIdCandidate }).eq("id", row.id);
      }
    }
  }

  const { data: existingSubscription } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("leader_id", user.id)
    .maybeSingle();
  if (!existingSubscription?.id) {
    await supabase.from("subscriptions").insert({
      leader_id: user.id,
      plan: "free",
      status: "free",
    });
  }

  return {
    id: String(row.id),
    authUserId: String(row.auth_user_id ?? user.id),
    name: String(row.name),
    email: String(row.email),
    role,
    status,
    churchId: row.church_id ? String(row.church_id) : null,
  };
}

export async function requireAdmin(): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/admin/login");
  if (profile.status === "blocked") redirect("/admin/login?error=blocked");
  if (profile.role !== "admin") redirect("/lider/sermoes");
  return profile;
}

export async function requireLeader(): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.status === "blocked") redirect("/login?error=blocked");
  if (profile.role !== "leader") redirect("/admin/dashboard");
  return profile;
}
