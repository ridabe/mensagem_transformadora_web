import { redirect } from "next/navigation";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export type ProfileRole = "admin" | "leader";
export type ProfileStatus = "active" | "blocked" | "pending";

export type CurrentProfile = {
  id: string;
  authUserId: string;
  name: string;
  displayName: string;
  email: string;
  role: ProfileRole;
  status: ProfileStatus;
  churchId: string | null;
  ministryTitle: string | null;
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

function getErrorText(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const message = "message" in err && typeof err.message === "string" ? err.message : null;
  const details = "details" in err && typeof err.details === "string" ? err.details : null;
  const hint = "hint" in err && typeof err.hint === "string" ? err.hint : null;
  return message ?? details ?? hint ?? null;
}

function isMissingColumnError(err: unknown, column: string): boolean {
  if (!err || typeof err !== "object") return false;
  const code = "code" in err && typeof err.code === "string" ? err.code : null;
  const text = (getErrorText(err) ?? "").toLowerCase();
  const c = column.toLowerCase();
  if (code === "42703" || code === "PGRST204") {
    return text.includes(c) && (text.includes("does not exist") || text.includes("not exist") || text.includes("unknown"));
  }
  return text.includes(c) && (text.includes("does not exist") || text.includes("not exist"));
}

function normalizeMinistryTitleValue(value: unknown): string | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  const normalized = raw
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replaceAll(/[^a-z]/g, "");

  if (
    normalized === "pastor" ||
    normalized === "diacono" ||
    normalized === "bispo" ||
    normalized === "apostolo" ||
    normalized === "missionario" ||
    normalized === "pregador" ||
    normalized === "lider"
  ) {
    return normalized;
  }

  return null;
}

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user?.id) return null;

  const bootstrapAdminId = process.env.MT_BOOTSTRAP_ADMIN_AUTH_USER_ID?.trim() || null;

  let byAuthUserId = await supabase
    .from("profiles")
    .select("id,auth_user_id,name,display_name,email,role,status,church_id,ministry_title")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (byAuthUserId.error && isMissingColumnError(byAuthUserId.error, "display_name")) {
    byAuthUserId = await supabase
      .from("profiles")
      .select("id,auth_user_id,name,email,role,status,church_id,ministry_title")
      .eq("auth_user_id", user.id)
      .maybeSingle();
  }

  const row = byAuthUserId.data;

  if (!row?.id) {
    if (!user.email) return null;

    const ministryTitleCandidate =
      user.user_metadata && typeof user.user_metadata.ministry_title === "string"
        ? user.user_metadata.ministry_title
        : null;
    const ministryTitle = normalizeMinistryTitleValue(ministryTitleCandidate);

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

    const displayName = getDisplayName(user);

    const created = await supabase
      .from("profiles")
      .insert({
        auth_user_id: user.id,
        name: displayName,
        display_name: displayName,
        email: user.email,
        role: "leader",
        status: "active",
        church_id: churchOkId,
        ministry_title: ministryTitle,
      })
      .select("id,auth_user_id,name,display_name,email,role,status,church_id,ministry_title")
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

    const createdDisplayName =
      createdRow && typeof createdRow === "object" && "display_name" in createdRow && typeof createdRow.display_name === "string"
        ? createdRow.display_name.trim()
        : String(createdRow.name);

    return {
      id: String(createdRow.id),
      authUserId: String(createdRow.auth_user_id),
      name: createdDisplayName,
      displayName: createdDisplayName,
      email: String(createdRow.email),
      role,
      status: normalizeStatus(createdRow.status) ?? "active",
      churchId: createdRow.church_id ? String(createdRow.church_id) : null,
      ministryTitle: createdRow.ministry_title ? String(createdRow.ministry_title) : null,
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

  const rawDisplayName =
    row && typeof row === "object" && "display_name" in row && typeof row.display_name === "string"
      ? row.display_name.trim()
      : "";
  const metaDisplayName =
    user.user_metadata && typeof user.user_metadata.display_name === "string"
      ? user.user_metadata.display_name.trim()
      : "";

  const baseName = String(row.name || "").trim();
  const effectiveDisplayName = rawDisplayName || metaDisplayName || baseName;

  const metaMinistryTitle =
    user.user_metadata && typeof user.user_metadata.ministry_title === "string"
      ? normalizeMinistryTitleValue(user.user_metadata.ministry_title)
      : null;
  const dbMinistryTitle =
    row && typeof row === "object" && "ministry_title" in row ? normalizeMinistryTitleValue(row.ministry_title) : null;

  if ((!rawDisplayName || rawDisplayName !== effectiveDisplayName) && effectiveDisplayName && row?.id) {
    try {
      await supabase
        .from("profiles")
        .update({ display_name: effectiveDisplayName, name: effectiveDisplayName })
        .eq("id", row.id);
    } catch {
    }
  }

  if (!dbMinistryTitle && metaMinistryTitle && row?.id) {
    try {
      await supabase.from("profiles").update({ ministry_title: metaMinistryTitle }).eq("id", row.id);
    } catch {
    }
  }

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
    name: effectiveDisplayName,
    displayName: effectiveDisplayName,
    email: String(row.email),
    role,
    status,
    churchId: row.church_id ? String(row.church_id) : null,
    ministryTitle: row.ministry_title ? String(row.ministry_title) : null,
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

type SubscriptionStatus =
  | "free"
  | "pending"
  | "active"
  | "trialing"
  | "cancelled"
  | "expired"
  | "past_due"
  | "unpaid"
  | "incomplete"
  | "failed";

type DbSubscriptionRow = {
  plan: string;
  status: SubscriptionStatus | string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
};

type DbPlanRow = {
  code: string;
  monthly_pre_sermon_limit: number | null;
};

export type CurrentSubscriptionInfo = {
  plan: string;
  status: SubscriptionStatus | string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  monthly_pre_sermon_limit: number | null;
};

export type CurrentUsageInfo = {
  used: number;
  cycle_start: string | null;
  cycle_end: string | null;
};

export type CanCreatePreSermonResult =
  | {
      allowed: true;
      subscription: CurrentSubscriptionInfo;
      usage: CurrentUsageInfo;
    }
  | {
      allowed: false;
      errorMessage: string;
      subscription: CurrentSubscriptionInfo;
      usage: CurrentUsageInfo;
    };

function parseIsoDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}

/**
 * Indica se um plano deve ser tratado como "pago" para fins de quota (qualquer código diferente de free).
 */
function isPaidPlan(planCode: string): boolean {
  const normalized = planCode.trim().toLowerCase();
  return normalized !== "" && normalized !== "free";
}

/**
 * Indica se um status permite benefícios de plano pago normalmente (active/trialing).
 */
function isActiveLikeStatus(status: string): boolean {
  return status === "active" || status === "trialing";
}

/**
 * Indica se um status past_due ainda está dentro da tolerância (grace) baseada em current_period_end.
 */
function isPastDueWithinGrace(currentPeriodEnd: Date | null, now: Date): boolean {
  if (!currentPeriodEnd) return false;
  const graceDays = Number.parseInt(process.env.MT_PAST_DUE_GRACE_DAYS?.trim() || "", 10);
  const safeGraceDays = Number.isFinite(graceDays) && graceDays >= 0 ? graceDays : 3;
  const graceEndMs = currentPeriodEnd.getTime() + safeGraceDays * 24 * 60 * 60 * 1000;
  return now.getTime() <= graceEndMs;
}

function isCancelledWithinGrace(input: { currentPeriodEnd: Date | null; cancelledAt: Date | null; now: Date }): boolean {
  if (input.currentPeriodEnd && input.now.getTime() <= input.currentPeriodEnd.getTime()) return true;

  const graceDays = Number.parseInt(process.env.MT_PAST_DUE_GRACE_DAYS?.trim() || "", 10);
  const safeGraceDays = Number.isFinite(graceDays) && graceDays >= 0 ? graceDays : 3;

  if (!input.cancelledAt) return false;
  const graceEndMs = input.cancelledAt.getTime() + safeGraceDays * 24 * 60 * 60 * 1000;
  return input.now.getTime() <= graceEndMs;
}

/**
 * getCurrentSubscription(profileId)
 *
 * Retorna o plano/status vigente do líder e os limites aplicáveis do plano (ex.: monthly_pre_sermon_limit).
 */
export async function getCurrentSubscription(profileId: string): Promise<CurrentSubscriptionInfo> {
  const safeProfileId = profileId?.trim() ? profileId.trim() : "";
  if (!safeProfileId) {
    return {
      plan: "free",
      status: "free",
      current_period_start: null,
      current_period_end: null,
      cancelled_at: null,
      monthly_pre_sermon_limit: 10,
    };
  }

  const service = createServiceRoleClient();
  const { data: subRow } = await service
    .from("subscriptions")
    .select("plan,status,current_period_start,current_period_end,cancelled_at")
    .eq("leader_id", safeProfileId)
    .maybeSingle<DbSubscriptionRow>();

  const planCode =
    subRow && typeof subRow.plan === "string" && subRow.plan.trim() ? subRow.plan : "free";
  const status =
    subRow && typeof subRow.status === "string" && subRow.status.trim() ? subRow.status : "free";
  const currentPeriodStart =
    typeof subRow?.current_period_start === "string" ? subRow.current_period_start : null;
  const currentPeriodEnd =
    typeof subRow?.current_period_end === "string" ? subRow.current_period_end : null;
  const cancelledAt = typeof subRow?.cancelled_at === "string" ? subRow.cancelled_at : null;

  const normalizedStatus = status.trim().toLowerCase();
  const effectivePlanCode = normalizedStatus === "pending" ? "free" : planCode;

  const { data: planRow } = await service
    .from("plans")
    .select("code,monthly_pre_sermon_limit")
    .eq("code", effectivePlanCode)
    .maybeSingle<DbPlanRow>();

  let monthlyPreSermonLimit =
    planRow && typeof planRow.monthly_pre_sermon_limit === "number"
      ? planRow.monthly_pre_sermon_limit
      : null;

  const normalizedPlanCode = effectivePlanCode.trim().toLowerCase();
  if (effectivePlanCode === "free" && monthlyPreSermonLimit == null) monthlyPreSermonLimit = 10;
  if ((normalizedPlanCode === "plano_basico" || normalizedPlanCode === "basic") && monthlyPreSermonLimit == null) {
    monthlyPreSermonLimit = 20;
  }

  return {
    plan: effectivePlanCode,
    status,
    current_period_start: currentPeriodStart,
    current_period_end: currentPeriodEnd,
    cancelled_at: cancelledAt,
    monthly_pre_sermon_limit: monthlyPreSermonLimit,
  };
}

/**
 * getCurrentUsage(profileId)
 *
 * Retorna quantos pre_sermons foram criados dentro do ciclo mensal atual (não usa mês calendário).
 */
export async function getCurrentUsage(profileId: string): Promise<CurrentUsageInfo> {
  const safeProfileId = profileId?.trim() ? profileId.trim() : "";
  if (!safeProfileId) return { used: 0, cycle_start: null, cycle_end: null };

  const service = createServiceRoleClient();
  const { data, error } = await service.rpc("mt_get_pre_sermon_quota", {
    p_leader_id: safeProfileId,
  });

  const rowFromQuota =
    !error && Array.isArray(data) && data.length
      ? (data[0] as Record<string, unknown>)
      : !error && data && typeof data === "object"
        ? (data as Record<string, unknown>)
        : null;

  const usedFromQuota = rowFromQuota && typeof rowFromQuota.used === "number" ? rowFromQuota.used : null;
  const cycleStartFromQuota =
    rowFromQuota && typeof rowFromQuota.cycle_start === "string" ? rowFromQuota.cycle_start : null;
  const cycleEndFromQuota =
    rowFromQuota && typeof rowFromQuota.cycle_end === "string" ? rowFromQuota.cycle_end : null;

  if (usedFromQuota != null && cycleStartFromQuota && cycleEndFromQuota) {
    return {
      used: Number.isFinite(usedFromQuota) && usedFromQuota >= 0 ? usedFromQuota : 0,
      cycle_start: cycleStartFromQuota,
      cycle_end: cycleEndFromQuota,
    };
  }

  const { data: windowData } = await service.rpc("mt_get_pre_sermon_cycle_window", {
    p_leader_id: safeProfileId,
  });

  const windowRow =
    Array.isArray(windowData) && windowData.length
      ? (windowData[0] as Record<string, unknown>)
      : windowData && typeof windowData === "object"
        ? (windowData as Record<string, unknown>)
        : null;

  const cycleStart = windowRow && typeof windowRow.cycle_start === "string" ? windowRow.cycle_start : null;
  const cycleEnd = windowRow && typeof windowRow.cycle_end === "string" ? windowRow.cycle_end : null;

  if (!cycleStart || !cycleEnd) return { used: 0, cycle_start: null, cycle_end: null };

  const { count } = await service
    .from("pre_sermons")
    .select("id", { count: "exact", head: true })
    .eq("leader_id", safeProfileId)
    .gte("created_at", cycleStart)
    .lt("created_at", cycleEnd);

  return {
    used: typeof count === "number" && count >= 0 ? count : 0,
    cycle_start: cycleStart,
    cycle_end: cycleEnd,
  };
}

/**
 * canCreatePreSermon(profileId)
 *
 * Enforce:
 * - Plano free: máximo 10 pré-sermões por ciclo mensal.
 * - Plano pago active/trialing: ilimitado.
 * - failed/expired/cancelled/unpaid/incomplete: volta para regra do free.
 * - past_due: permite durante tolerância (MT_PAST_DUE_GRACE_DAYS, default 3).
 */
export async function canCreatePreSermon(profileId: string): Promise<CanCreatePreSermonResult> {
  const subscription = await getCurrentSubscription(profileId);
  const usage = await getCurrentUsage(profileId);

  const planCode = subscription.plan;
  const status = String(subscription.status || "free").trim().toLowerCase();
  const now = new Date();

  const paid = isPaidPlan(planCode);
  const currentPeriodEnd = parseIsoDate(subscription.current_period_end);
  const pastDueAllowed = status === "past_due" && isPastDueWithinGrace(currentPeriodEnd, now);
  const cancelledAt = parseIsoDate(subscription.cancelled_at);

  const freeLimit = 10;
  const planLimit =
    typeof subscription.monthly_pre_sermon_limit === "number" && subscription.monthly_pre_sermon_limit >= 0
      ? subscription.monthly_pre_sermon_limit
      : null;

  const isActiveOrTrial = isActiveLikeStatus(status);
  const cancelledGraceAllowed =
    status === "cancelled" &&
    paid &&
    planLimit != null &&
    isCancelledWithinGrace({ currentPeriodEnd, cancelledAt, now });

  const effectiveLimit =
    paid && (isActiveOrTrial || pastDueAllowed)
      ? planLimit == null
        ? null
        : planLimit
      : cancelledGraceAllowed
        ? planLimit
        : freeLimit;

  if (effectiveLimit == null) {
    return { allowed: true, subscription, usage };
  }

  if (effectiveLimit === 0) {
    return {
      allowed: false,
      subscription,
      usage,
      errorMessage:
        "Seu plano atual não permite criar pré-sermões no momento. Seu ciclo será renovado automaticamente na próxima data de renovação ou você pode fazer upgrade agora.",
    };
  }

  if (usage.used < effectiveLimit) return { allowed: true, subscription, usage };

  return {
    allowed: false,
    subscription,
    usage,
    errorMessage:
      `Seu plano permite até ${effectiveLimit} pré-sermões por ciclo mensal. Seu ciclo será renovado automaticamente na próxima data de renovação ou você pode fazer upgrade agora.`,
  };
}
