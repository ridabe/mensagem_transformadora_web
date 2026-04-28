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

async function getProfileRow(authUserId: string) {
  const service = createServiceRoleClient();

  const byAuthUserId = await service
    .from("profiles")
    .select("id,auth_user_id,name,email,role,status,church_id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (byAuthUserId.data?.id) return byAuthUserId;

  return service
    .from("profiles")
    .select("id,auth_user_id,name,email,role,status,church_id")
    .eq("id", authUserId)
    .maybeSingle();
}

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user?.id) return null;

  const existing = await getProfileRow(user.id);
  const row = existing.data;

  if (!row?.id) {
    if (!user.email) return null;

    const service = createServiceRoleClient();
    const bootstrapAdminId = process.env.MT_BOOTSTRAP_ADMIN_AUTH_USER_ID?.trim() || null;
    const role: ProfileRole =
      bootstrapAdminId && bootstrapAdminId === user.id ? "admin" : "leader";
    const created = await service
      .from("profiles")
      .insert({
        auth_user_id: user.id,
        name: getDisplayName(user),
        email: user.email,
        role,
        status: "active",
      })
      .select("id,auth_user_id,name,email,role,status,church_id")
      .single();

    const createdRow = created.data;
    if (!createdRow?.id) return null;

    return {
      id: String(createdRow.id),
      authUserId: String(createdRow.auth_user_id),
      name: String(createdRow.name),
      email: String(createdRow.email),
      role: normalizeRole(createdRow.role) ?? "leader",
      status: normalizeStatus(createdRow.status) ?? "active",
      churchId: createdRow.church_id ? String(createdRow.church_id) : null,
    };
  }

  const role = normalizeRole(row.role);
  const status = normalizeStatus(row.status);
  if (!role || !status) return null;

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
  if (!profile) redirect("/login");
  if (profile.status === "blocked") redirect("/login?error=blocked");
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
