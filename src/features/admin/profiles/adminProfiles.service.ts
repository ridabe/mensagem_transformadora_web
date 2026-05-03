import { createServiceRoleClient } from "@/lib/supabase/server";

export type AdminProfileRole = "admin" | "leader";
export type AdminProfileStatus = "active" | "blocked" | "pending";

export type AdminProfile = {
  id: string;
  auth_user_id: string;
  name: string | null;
  display_name: string | null;
  email: string;
  ministry_title: string | null;
  role: AdminProfileRole | string;
  status: AdminProfileStatus | string;
  church_id: string | null;
  created_at: string | null;
  churches?: { name?: string | null; status?: string | null } | null;
};

export async function getAllProfiles(input?: {
  role?: AdminProfileRole;
  q?: string;
  status?: AdminProfileStatus;
  churchId?: string | null;
  limit?: number;
}) {
  const service = createServiceRoleClient();

  let query = service
    .from("profiles")
    .select("id,auth_user_id,name,display_name,email,ministry_title,role,status,church_id,created_at,churches(name,status)")
    .order("display_name", { ascending: true })
    .limit(typeof input?.limit === "number" && input.limit > 0 ? input.limit : 250);

  if (input?.role) query = query.eq("role", input.role);
  if (input?.status) query = query.eq("status", input.status);
  if (typeof input?.churchId === "string") query = query.eq("church_id", input.churchId);
  if (input?.churchId === null) query = query.is("church_id", null);

  const q = input?.q?.trim() ?? "";
  if (q) {
    const escaped = q.replaceAll(",", " ");
    query = query.or(`display_name.ilike.%${escaped}%,name.ilike.%${escaped}%,email.ilike.%${escaped}%`);
  }

  const { data, error } = await query;
  if (error) return { ok: false as const, error: "LOAD_PROFILES_FAILED" as const };

  return { ok: true as const, items: (data ?? []) as AdminProfile[] };
}

export async function getProfilesByChurch(churchId: string) {
  return getAllProfiles({ churchId, role: "leader", limit: 500 });
}

export async function assignProfileToChurch(input: {
  profileId: string;
  churchId: string;
  allowInactive?: boolean;
}) {
  const service = createServiceRoleClient();

  const { data: profileRow, error: profileError } = await service
    .from("profiles")
    .select("id,church_id")
    .eq("id", input.profileId)
    .maybeSingle();

  if (profileError) return { ok: false as const, error: "LOAD_PROFILE_FAILED" as const };
  if (!profileRow?.id) return { ok: false as const, error: "PROFILE_NOT_FOUND" as const };

  const { data: churchRow, error: churchError } = await service
    .from("churches")
    .select("id,status")
    .eq("id", input.churchId)
    .maybeSingle();

  if (churchError) return { ok: false as const, error: "LOAD_CHURCH_FAILED" as const };
  if (!churchRow?.id) return { ok: false as const, error: "CHURCH_NOT_FOUND" as const };

  const status = String(churchRow.status ?? "");
  if (!input.allowInactive && status !== "active") {
    return { ok: false as const, error: "CHURCH_INACTIVE" as const };
  }

  const { data: updated, error: updateError } = await service
    .from("profiles")
    .update({ church_id: input.churchId })
    .eq("id", input.profileId)
    .select("id,church_id")
    .single();

  if (updateError) return { ok: false as const, error: "UPDATE_PROFILE_FAILED" as const };
  return { ok: true as const, profile: { id: String(updated.id), church_id: String(updated.church_id) } };
}

export async function removeProfileFromChurch(profileId: string) {
  const service = createServiceRoleClient();

  const { data: profileRow, error: profileError } = await service
    .from("profiles")
    .select("id,church_id")
    .eq("id", profileId)
    .maybeSingle();

  if (profileError) return { ok: false as const, error: "LOAD_PROFILE_FAILED" as const };
  if (!profileRow?.id) return { ok: false as const, error: "PROFILE_NOT_FOUND" as const };
  if (!profileRow.church_id) return { ok: false as const, error: "PROFILE_NOT_ASSOCIATED" as const };

  const { error: updateError } = await service.from("profiles").update({ church_id: null }).eq("id", profileId);
  if (updateError) return { ok: false as const, error: "UPDATE_PROFILE_FAILED" as const };

  return { ok: true as const };
}
