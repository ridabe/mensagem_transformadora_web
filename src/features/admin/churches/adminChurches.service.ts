import { createServiceRoleClient } from "@/lib/supabase/server";

export type AdminChurchStatus = "active" | "inactive";
export type AdminChurchPlanType = "business" | "free" | "basic" | "pro" | string;
export type AdminChurchPlanStatus = "active" | "inactive" | string;

export type AdminChurch = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  status: AdminChurchStatus;
  plan_type: AdminChurchPlanType | null;
  plan_status: AdminChurchPlanStatus | null;
};

export async function getAllChurches(input?: { includeInactive?: boolean }) {
  const service = createServiceRoleClient();
  let query = service
    .from("churches")
    .select("id,name,city,state,status,plan_type,plan_status")
    .order("name", { ascending: true });

  if (!input?.includeInactive) query = query.eq("status", "active");

  const { data, error } = await query;
  if (error) return { ok: false as const, error: "LOAD_CHURCHES_FAILED" as const };

  const items = (data ?? []) as AdminChurch[];
  return { ok: true as const, items };
}

export async function getChurchById(churchId: string) {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("churches")
    .select("id,name,status,plan_type,plan_status")
    .eq("id", churchId)
    .maybeSingle();

  if (error) return { ok: false as const, error: "LOAD_CHURCH_FAILED" as const };
  if (!data?.id) return { ok: true as const, church: null };

  return {
    ok: true as const,
    church: {
      id: String(data.id),
      name: String(data.name ?? ""),
      status: data.status as AdminChurchStatus,
      plan_type: (data.plan_type ?? null) as AdminChurchPlanType | null,
      plan_status: (data.plan_status ?? null) as AdminChurchPlanStatus | null,
    },
  };
}
