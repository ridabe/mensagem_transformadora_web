import { redirect } from "next/navigation";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/profiles";
import { formatLeaderDisplayName, formatPtBrDate } from "@/lib/format";
import { ChurchService } from "@/lib/church";
import { getAllChurches } from "@/features/admin/churches/adminChurches.service";
import {
  assignProfileToChurch,
  removeProfileFromChurch,
} from "@/features/admin/profiles/adminProfiles.service";

type ProfileStatus = "active" | "blocked" | "pending";

type LeaderRow = {
  id: string;
  auth_user_id: string;
  name?: string;
  display_name?: string;
  email: string;
  ministry_title?: string | null;
  role: "leader" | "church_admin" | "admin" | string;
  status: ProfileStatus | string;
  church_id: string | null;
  created_at?: string | null;
  churches?: { name?: string | null; status?: string | null; plan_type?: string | null; plan_status?: string | null } | null;
};

type SubscriptionRow = {
  leader_id: string;
  plan: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
};

type PlanRow = {
  code: string;
  name: string;
  monthly_pre_sermon_limit: number | null;
  is_active: boolean;
};

type AdminLeadersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getString(
  sp: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  const v = sp?.[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

function parseProfileStatus(value: string | undefined): ProfileStatus | "all" {
  if (value === "active") return "active";
  if (value === "blocked") return "blocked";
  if (value === "pending") return "pending";
  return "all";
}

function getFormString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

function extractMissingEnvFromError(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const message = "message" in err && typeof err.message === "string" ? err.message : "";
  const match = message.match(/Variável de ambiente ausente:\s*(.+)$/);
  return match?.[1]?.trim() ? match[1].trim() : null;
}

function appendQuery(url: string, params: Record<string, string>) {
  const [base, search] = url.split("?", 2);
  const sp = new URLSearchParams(search ?? "");
  for (const [k, v] of Object.entries(params)) sp.set(k, v);
  const next = sp.toString();
  return next ? `${base}?${next}` : base;
}

function safeReturnTo(value: string): string {
  const v = value.trim();
  if (!v) return "/admin/lideres";
  if (!v.startsWith("/admin/lideres")) return "/admin/lideres";
  return v;
}

const churchAdminOptionMessage =
  "Esta opção só está disponível para líderes associados a uma igreja com Plano Business ativo.";
const businessOnlyActionMessage =
  "Essa ação está disponível apenas para igrejas com Plano Business ativo.";

function normalizeEmail(value: string): string | null {
  const raw = value.trim().toLowerCase();
  if (!raw) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(raw)) return null;
  return raw;
}

function normalizeMinistryTitle(value: string): string | null {
  const raw = value.trim();
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

export async function assignProfileToChurchAction(formData: FormData) {
  "use server";

  try {
    await createClient();
  } catch (err) {
    const missing = extractMissingEnvFromError(err);
    const url = missing
      ? `/admin/login?error=config&missing=${encodeURIComponent(missing)}`
      : "/admin/login?error=config";
    redirect(url);
  }

  await requireAdmin();

  const profileId = getFormString(formData, "profile_id").trim();
  const churchId = getFormString(formData, "church_id").trim();
  const allowInactive = getFormString(formData, "allow_inactive").trim() === "1";
  const returnTo = safeReturnTo(getFormString(formData, "return_to"));

  if (!profileId || !churchId) {
    redirect(appendQuery(returnTo, { error: "invalid" }));
  }

  const result = await assignProfileToChurch({ profileId, churchId, allowInactive });
  if (!result.ok) {
    const error =
      result.error === "PROFILE_NOT_FOUND"
        ? "profile_not_found"
        : result.error === "CHURCH_NOT_FOUND"
          ? "church_not_found"
          : result.error === "CHURCH_INACTIVE"
            ? "church_inactive"
            : "update_failed";
    redirect(appendQuery(returnTo, { error }));
  }

  redirect(appendQuery(returnTo, { saved: "1" }));
}

export async function removeProfileFromChurchAction(formData: FormData) {
  "use server";

  try {
    await createClient();
  } catch (err) {
    const missing = extractMissingEnvFromError(err);
    const url = missing
      ? `/admin/login?error=config&missing=${encodeURIComponent(missing)}`
      : "/admin/login?error=config";
    redirect(url);
  }

  await requireAdmin();

  const profileId = getFormString(formData, "profile_id").trim();
  const returnTo = safeReturnTo(getFormString(formData, "return_to"));
  if (!profileId) redirect(appendQuery(returnTo, { error: "invalid" }));

  const result = await removeProfileFromChurch(profileId);
  if (!result.ok) {
    const error =
      result.error === "PROFILE_NOT_FOUND"
        ? "profile_not_found"
        : result.error === "PROFILE_NOT_ASSOCIATED"
          ? "not_associated"
          : "update_failed";
    redirect(appendQuery(returnTo, { error }));
  }

  redirect(appendQuery(returnTo, { saved: "1" }));
}

export async function promoteToChurchAdminAction(formData: FormData) {
  "use server";

  try {
    await createClient();
  } catch (err) {
    const missing = extractMissingEnvFromError(err);
    const url = missing
      ? `/admin/login?error=config&missing=${encodeURIComponent(missing)}`
      : "/admin/login?error=config";
    redirect(url);
  }

  await requireAdmin();

  const profileId = getFormString(formData, "profile_id").trim();
  const returnTo = safeReturnTo(getFormString(formData, "return_to"));
  if (!profileId) redirect(appendQuery(returnTo, { error: "invalid" }));

  try {
    const churchService = new ChurchService();
    await churchService.promoteUserToChurchAdmin(profileId);
  } catch (err) {
    const message =
      err && typeof err === "object" && "message" in err && typeof err.message === "string"
        ? err.message
        : "";
    const m = message.trim();
    if (m === churchAdminOptionMessage) {
      redirect(appendQuery(returnTo, { error: "church_admin_not_allowed", reason: m }));
    }
    redirect(appendQuery(returnTo, { error: "update_failed", reason: m || "Falha ao promover." }));
  }

  redirect(appendQuery(returnTo, { saved: "1" }));
}

export async function demoteFromChurchAdminAction(formData: FormData) {
  "use server";

  try {
    await createClient();
  } catch (err) {
    const missing = extractMissingEnvFromError(err);
    const url = missing
      ? `/admin/login?error=config&missing=${encodeURIComponent(missing)}`
      : "/admin/login?error=config";
    redirect(url);
  }

  await requireAdmin();

  const profileId = getFormString(formData, "profile_id").trim();
  const returnTo = safeReturnTo(getFormString(formData, "return_to"));
  if (!profileId) redirect(appendQuery(returnTo, { error: "invalid" }));

  try {
    const churchService = new ChurchService();
    await churchService.demoteUserFromChurchAdmin(profileId);
  } catch (err) {
    const message =
      err && typeof err === "object" && "message" in err && typeof err.message === "string"
        ? err.message
        : "";
    const m = message.trim();
    if (m === businessOnlyActionMessage) {
      redirect(appendQuery(returnTo, { error: "business_only", reason: m }));
    }
    if (m === "Esta igreja precisa ter pelo menos um administrador ativo.") {
      redirect(appendQuery(returnTo, { error: "last_admin", reason: m }));
    }
    redirect(appendQuery(returnTo, { error: "update_failed", reason: m || "Falha ao rebaixar." }));
  }

  redirect(appendQuery(returnTo, { saved: "1" }));
}

export async function createChurchUserAction(formData: FormData) {
  "use server";

  try {
    await createClient();
  } catch (err) {
    const missing = extractMissingEnvFromError(err);
    const url = missing
      ? `/admin/login?error=config&missing=${encodeURIComponent(missing)}`
      : "/admin/login?error=config";
    redirect(url);
  }

  await requireAdmin();

  const returnTo = safeReturnTo(getFormString(formData, "return_to"));
  const name = getFormString(formData, "name").trim();
  const emailRaw = getFormString(formData, "email");
  const email = normalizeEmail(emailRaw);
  const ministryTitle = getFormString(formData, "ministry_title").trim();
  const normalizedMinistryTitle = normalizeMinistryTitle(ministryTitle);
  const password = getFormString(formData, "password");
  const churchId = getFormString(formData, "church_id").trim();
  const accessType = getFormString(formData, "access_type").trim();
  const desiredRole = accessType === "church_admin" ? "church_admin" : "leader";

  if (!name || !email || !password || password.length < 6 || !churchId) {
    redirect(appendQuery(returnTo, { error: "invalid" }));
  }

  const service = createServiceRoleClient();
  const { data: church } = await service
    .from("churches")
    .select("id,status,plan_type,plan_status")
    .eq("id", churchId)
    .maybeSingle<{ id: string; status: string; plan_type: string | null; plan_status: string | null }>();

  const businessActive =
    Boolean(church?.id) &&
    String(church?.status ?? "") === "active" &&
    String(church?.plan_type ?? "") === "business" &&
    String(church?.plan_status ?? "") === "active";

  if (!businessActive) {
    redirect(appendQuery(returnTo, { error: "business_only", reason: businessOnlyActionMessage }));
  }

  const { data: existingProfile } = await service
    .from("profiles")
    .select("id,auth_user_id,role,email")
    .ilike("email", email)
    .maybeSingle<{ id: string; auth_user_id: string; role: string; email: string }>();

  if (existingProfile?.id) {
    if (String(existingProfile.role) === "admin") {
      redirect(appendQuery(returnTo, { error: "church_admin_not_allowed", reason: churchAdminOptionMessage }));
    }

    const patch: Record<string, unknown> = {
      church_id: churchId,
      role: desiredRole,
      status: "active",
      ministry_title: normalizedMinistryTitle,
      display_name: name,
      name,
      church_membership_source: "admin_global",
      church_membership_confirmed_at: new Date().toISOString(),
    };

    const { error: updateError } = await service.from("profiles").update(patch).eq("id", existingProfile.id);
    if (updateError) redirect(appendQuery(returnTo, { error: "update_failed" }));
    redirect(appendQuery(returnTo, { saved: "1" }));
  }

  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: name, ministry_title: ministryTitle || null },
  });

  if (created.error || !created.data.user?.id) {
    const msg = (created.error?.message || "").trim();
    if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered")) {
      const { data: retryProfile } = await service
        .from("profiles")
        .select("id,role")
        .ilike("email", email)
        .maybeSingle<{ id: string; role: string }>();
      if (!retryProfile?.id) redirect(appendQuery(returnTo, { error: "update_failed" }));
      if (String(retryProfile.role) === "admin") {
        redirect(appendQuery(returnTo, { error: "church_admin_not_allowed", reason: churchAdminOptionMessage }));
      }
      const patch: Record<string, unknown> = {
        church_id: churchId,
        role: desiredRole,
        status: "active",
        ministry_title: normalizedMinistryTitle,
        display_name: name,
        name,
        church_membership_source: "admin_global",
        church_membership_confirmed_at: new Date().toISOString(),
      };
      const { error: updateError } = await service.from("profiles").update(patch).eq("id", retryProfile.id);
      if (updateError) redirect(appendQuery(returnTo, { error: "update_failed" }));
      redirect(appendQuery(returnTo, { saved: "1" }));
    }
    redirect(appendQuery(returnTo, { error: "update_failed", reason: msg }));
  }

  const userId = created.data.user.id;
  const { error: insertError } = await service
    .from("profiles")
    .upsert(
      {
        auth_user_id: userId,
        name,
        display_name: name,
        email,
        ministry_title: normalizedMinistryTitle,
        role: desiredRole,
        status: "active",
        church_id: churchId,
        church_membership_source: "admin_global",
        church_membership_confirmed_at: new Date().toISOString(),
      },
      { onConflict: "auth_user_id" },
    );

  if (insertError) {
    await service.auth.admin.deleteUser(userId);
    redirect(appendQuery(returnTo, { error: "update_failed" }));
  }

  await service.from("subscriptions").insert({ leader_id: userId, plan: "free", status: "free" });

  redirect(appendQuery(returnTo, { saved: "1" }));
}

/**
 * Converte timestamp sem timezone (db) em Date UTC de forma consistente.
 */
function parseDbTimestamp(value: string | null | undefined): Date | null {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) return null;
  const normalized = /[zZ]$/.test(v) || /[+-]\d{2}:\d{2}$/.test(v) ? v : `${v}Z`;
  const d = new Date(normalized);
  return Number.isFinite(d.getTime()) ? d : null;
}

/**
 * Soma meses preservando UTC (comportamento similar a date + interval '1 month').
 */
function addMonthsUTC(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

/**
 * Calcula o ciclo mensal corrente (não-calendário) baseado em uma base (created_at) e "now".
 * Ajusta para garantir cycle_start <= now.
 */
function getCycleWindowFromBase(base: Date, now: Date): { start: Date; end: Date } {
  let monthsDiff = (now.getUTCFullYear() - base.getUTCFullYear()) * 12 + (now.getUTCMonth() - base.getUTCMonth());
  if (monthsDiff < 0) monthsDiff = 0;

  let start = addMonthsUTC(base, monthsDiff);
  if (start.getTime() > now.getTime()) {
    monthsDiff = Math.max(0, monthsDiff - 1);
    start = addMonthsUTC(base, monthsDiff);
  }

  const end = addMonthsUTC(start, 1);
  return { start, end };
}

/**
 * Determina o limite efetivo aplicável no admin (mesmas regras de produto):
 * - pago active/trialing: ilimitado
 * - past_due: ilimitado durante tolerância (default 3 dias após current_period_end)
 * - demais falhas/expirado/cancelado: volta para free
 */
function getEffectiveLimit(input: {
  planCode: string;
  status: string;
  planLimit: number | null;
  currentPeriodEnd: string | null;
}): { kind: "unlimited" } | { kind: "limited"; limit: number } {
  const planCode = input.planCode?.trim() ? input.planCode.trim() : "free";
  const status = (input.status ?? "free").trim().toLowerCase() || "free";
  const isPaid = planCode !== "free";

  const paidLimit = typeof input.planLimit === "number" && input.planLimit >= 0 ? input.planLimit : null;

  if (isPaid && (status === "active" || status === "trialing")) {
    if (paidLimit == null) return { kind: "unlimited" };
    return { kind: "limited", limit: paidLimit };
  }

  if (status === "past_due") {
    const end = parseDbTimestamp(input.currentPeriodEnd);
    const graceDays = Number.parseInt(process.env.MT_PAST_DUE_GRACE_DAYS?.trim() || "", 10);
    const safeGraceDays = Number.isFinite(graceDays) && graceDays >= 0 ? graceDays : 3;
    if (end) {
      const graceEndMs = end.getTime() + safeGraceDays * 24 * 60 * 60 * 1000;
      if (Date.now() <= graceEndMs) {
        if (isPaid && paidLimit == null) return { kind: "unlimited" };
        if (isPaid && paidLimit != null) return { kind: "limited", limit: paidLimit };
        return { kind: "limited", limit: 10 };
      }
    }
  }

  const freeLimit = 10;
  if (isPaid) return { kind: "limited", limit: freeLimit };

  const limit = paidLimit ?? freeLimit;
  return { kind: "limited", limit };
}

export default async function AdminLideresPage({ searchParams }: AdminLeadersPageProps) {
  const sp = searchParams ? await searchParams : undefined;
  const q = getString(sp, "q")?.trim() ?? "";
  const statusFilter = parseProfileStatus(getString(sp, "status"));
  const churchFilter = getString(sp, "church")?.trim() ?? "all";
  const showInactive = getString(sp, "showInactive")?.trim() === "1";
  const error = getString(sp, "error")?.trim() ?? "";
  const saved = getString(sp, "saved")?.trim() === "1";
  const reason = getString(sp, "reason")?.trim() ?? "";

  try {
    await createClient();
  } catch (err) {
    const message =
      err && typeof err === "object" && "message" in err && typeof err.message === "string"
        ? err.message
        : "Supabase não está configurado no ambiente.";
    return (
      <main className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-lg font-semibold tracking-tight">Configuração</h2>
        <p className="mt-2 text-sm text-[var(--mt-muted)]">{message}</p>
      </main>
    );
  }

  await requireAdmin();

  const service = createServiceRoleClient();

  let leadersQuery = service
    .from("profiles")
    .select(
      "id,auth_user_id,name,display_name,email,ministry_title,role,status,church_id,created_at,churches(name,status,plan_type,plan_status)",
    )
    .in("role", ["leader", "church_admin"])
    .order("display_name", { ascending: true })
    .limit(250);

  if (statusFilter !== "all") leadersQuery = leadersQuery.eq("status", statusFilter);
  if (churchFilter !== "all") {
    if (churchFilter === "none") leadersQuery = leadersQuery.is("church_id", null);
    else leadersQuery = leadersQuery.eq("church_id", churchFilter);
  }
  if (q) {
    const escaped = q.replaceAll(",", " ");
    leadersQuery = leadersQuery.or(`display_name.ilike.%${escaped}%,name.ilike.%${escaped}%,email.ilike.%${escaped}%`);
  }

  const { data: leadersData, error: leadersError } = await leadersQuery;

  if (leadersError) {
    return (
      <main className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-lg font-semibold tracking-tight">Líderes</h2>
        <p className="mt-2 text-sm text-[var(--mt-muted)]">
          Não foi possível carregar a lista de líderes.
        </p>
      </main>
    );
  }

  const leaders = (leadersData ?? []) as LeaderRow[];
  const authUserIds = leaders
    .map((l) => (typeof l.auth_user_id === "string" ? l.auth_user_id : ""))
    .filter(Boolean);

  const churchesResult = await getAllChurches({ includeInactive: true });
  const allChurches = churchesResult.ok ? churchesResult.items : [];
  const activeChurches = allChurches.filter((c) => c.status === "active");
  const assignOptions = showInactive ? allChurches : activeChurches;
  const businessActiveChurches = allChurches.filter(
    (c) => c.status === "active" && c.plan_type === "business" && c.plan_status === "active",
  );

  const subscriptionMap = new Map<string, SubscriptionRow>();
  if (authUserIds.length) {
    const { data: subsData } = await service
      .from("subscriptions")
      .select("leader_id,plan,status,current_period_start,current_period_end")
      .in("leader_id", authUserIds);

    for (const row of (subsData ?? []) as SubscriptionRow[]) {
      if (row?.leader_id) subscriptionMap.set(String(row.leader_id), row);
    }
  }

  const { data: plansData } = await service
    .from("plans")
    .select("code,name,monthly_pre_sermon_limit,is_active")
    .eq("is_active", true);
  const plans = (plansData ?? []) as PlanRow[];
  const planMap = new Map<string, PlanRow>();
  for (const p of plans) planMap.set(p.code, p);

  const now = new Date();
  const recentFrom = new Date(now.getTime() - 62 * 24 * 60 * 60 * 1000);
  const recentFromIso = recentFrom.toISOString();

  const cycleWindowMap = new Map<string, { startMs: number; endMs: number; endLabel: string }>();
  for (const l of leaders) {
    const leaderId = typeof l.auth_user_id === "string" ? l.auth_user_id : "";
    if (!leaderId) continue;

    const sub = subscriptionMap.get(leaderId);
    const sStart = parseDbTimestamp(sub?.current_period_start ?? null);
    const sEnd = parseDbTimestamp(sub?.current_period_end ?? null);

    if (sStart && sEnd && sEnd.getTime() > sStart.getTime()) {
      cycleWindowMap.set(leaderId, { startMs: sStart.getTime(), endMs: sEnd.getTime(), endLabel: formatPtBrDate(sEnd) });
      continue;
    }

    const base = parseDbTimestamp(typeof l.created_at === "string" ? l.created_at : null) ?? now;
    const w = getCycleWindowFromBase(base, now);
    cycleWindowMap.set(leaderId, { startMs: w.start.getTime(), endMs: w.end.getTime(), endLabel: formatPtBrDate(w.end) });
  }

  const usageMap = new Map<string, number>();
  if (authUserIds.length) {
    const { data: preRows } = await service
      .from("pre_sermons")
      .select("leader_id,created_at")
      .in("leader_id", authUserIds)
      .gte("created_at", recentFromIso)
      .limit(5000);

    for (const r of (preRows ?? []) as { leader_id?: unknown; created_at?: unknown }[]) {
      const leaderId = typeof r.leader_id === "string" ? r.leader_id : null;
      if (!leaderId) continue;
      const createdAt = parseDbTimestamp(typeof r.created_at === "string" ? r.created_at : null);
      if (!createdAt) continue;

      const w = cycleWindowMap.get(leaderId);
      if (!w) continue;
      const ts = createdAt.getTime();
      if (ts >= w.startMs && ts < w.endMs) {
        usageMap.set(leaderId, (usageMap.get(leaderId) ?? 0) + 1);
      }
    }
  }

  const summary = leaders.reduce(
    (acc, l) => {
      const status = typeof l.status === "string" ? l.status : "active";
      acc.total += 1;
      if (status === "active") acc.active += 1;
      else if (status === "blocked") acc.blocked += 1;
      else if (status === "pending") acc.pending += 1;
      else acc.other += 1;
      return acc;
    },
    { total: 0, active: 0, blocked: 0, pending: 0, other: 0 },
  );

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-[var(--mt-muted)]">Admin • Líderes</p>
        <h2 className="text-2xl font-semibold tracking-tight">Acompanhar líderes</h2>
        <p className="text-sm leading-6 text-[var(--mt-muted)]">
          Consulte status, igreja, plano e atividade de pré-sermões.
        </p>
      </header>

      {saved ? (
        <div className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-4 text-sm">
          Alterações salvas.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-4 text-sm">
          {error === "invalid"
            ? "Dados inválidos."
            : error === "profile_not_found"
              ? "Usuário não encontrado."
              : error === "church_not_found"
                ? "Igreja não encontrada."
                : error === "church_inactive"
                  ? "Igreja inativa não pode ser usada para novo vínculo (habilite “Mostrar inativas” para permitir)."
              : error === "business_only"
                ? reason || businessOnlyActionMessage
                : error === "church_admin_not_allowed"
                  ? reason || churchAdminOptionMessage
                  : error === "last_admin"
                    ? reason || "Esta igreja precisa ter pelo menos um administrador ativo."
                  : error === "not_associated"
                    ? "Este usuário não possui igreja vinculada."
                : reason || "Não foi possível salvar a alteração."}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-5">
          <p className="text-xs font-medium text-[var(--mt-muted)]">Total</p>
          <p className="mt-2 text-2xl font-semibold">{summary.total}</p>
        </div>
        <div className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-5">
          <p className="text-xs font-medium text-[var(--mt-muted)]">Ativos</p>
          <p className="mt-2 text-2xl font-semibold">{summary.active}</p>
        </div>
        <div className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-5">
          <p className="text-xs font-medium text-[var(--mt-muted)]">Bloqueados</p>
          <p className="mt-2 text-2xl font-semibold">{summary.blocked}</p>
        </div>
        <div className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-5">
          <p className="text-xs font-medium text-[var(--mt-muted)]">Pendentes</p>
          <p className="mt-2 text-2xl font-semibold">{summary.pending}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-5">
        <h3 className="text-base font-semibold">Adicionar líder</h3>
        <p className="mt-1 text-sm text-[var(--mt-muted)]">Disponível apenas para igrejas com Plano Business ativo.</p>
        <form action={createChurchUserAction} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-6">
          <input
            type="hidden"
            name="return_to"
            value={appendQuery("/admin/lideres", {
              q,
              status: statusFilter,
              church: churchFilter,
              showInactive: showInactive ? "1" : "0",
            })}
          />
          <input
            name="name"
            required
            placeholder="Nome"
            className="h-11 rounded-xl border border-[var(--mt-border)] bg-transparent px-4 outline-none ring-[var(--mt-navy)] focus:ring-2 sm:col-span-2"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="E-mail"
            className="h-11 rounded-xl border border-[var(--mt-border)] bg-transparent px-4 outline-none ring-[var(--mt-navy)] focus:ring-2 sm:col-span-2"
          />
          <input
            name="ministry_title"
            placeholder="Função (opcional)"
            className="h-11 rounded-xl border border-[var(--mt-border)] bg-transparent px-4 outline-none ring-[var(--mt-navy)] focus:ring-2 sm:col-span-2"
          />
          <input
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="Senha temporária"
            className="h-11 rounded-xl border border-[var(--mt-border)] bg-transparent px-4 outline-none ring-[var(--mt-navy)] focus:ring-2 sm:col-span-2"
          />
          <select
            name="church_id"
            required
            defaultValue=""
            className="h-11 rounded-xl border border-[var(--mt-border)] bg-transparent px-4 text-sm outline-none ring-[var(--mt-navy)] focus:ring-2 sm:col-span-2"
          >
            <option value="" disabled>
              Selecione igreja
            </option>
            {businessActiveChurches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            name="access_type"
            required
            defaultValue="leader"
            className="h-11 rounded-xl border border-[var(--mt-border)] bg-transparent px-4 text-sm outline-none ring-[var(--mt-navy)] focus:ring-2 sm:col-span-1"
          >
            <option value="leader">Líder</option>
            <option value="church_admin">Admin da Igreja</option>
          </select>
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mt-navy)] px-5 text-sm font-semibold text-white hover:opacity-95 sm:col-span-1"
          >
            Adicionar
          </button>
        </form>
      </section>

      <form className="flex flex-col gap-3 rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-5 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex flex-1 flex-col gap-2 text-sm">
          <span className="font-semibold">Buscar</span>
          <input
            name="q"
            defaultValue={q}
            className="h-11 rounded-xl border border-[var(--mt-border)] bg-transparent px-4 outline-none ring-[var(--mt-navy)] focus:ring-2"
            placeholder="Nome ou e-mail"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm sm:w-56">
          <span className="font-semibold">Status</span>
          <select
            name="status"
            defaultValue={statusFilter}
            className="h-11 rounded-xl border border-[var(--mt-border)] bg-transparent px-4 text-sm outline-none ring-[var(--mt-navy)] focus:ring-2"
          >
            <option value="all">Todos</option>
            <option value="active">Ativo</option>
            <option value="pending">Pendente</option>
            <option value="blocked">Bloqueado</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm sm:w-72">
          <span className="font-semibold">Igreja</span>
          <select
            name="church"
            defaultValue={churchFilter}
            className="h-11 rounded-xl border border-[var(--mt-border)] bg-transparent px-4 text-sm outline-none ring-[var(--mt-navy)] focus:ring-2"
          >
            <option value="all">Todas</option>
            <option value="none">Sem igreja</option>
            {allChurches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.status === "inactive" ? " (inativa)" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm sm:pb-2">
          <input
            type="checkbox"
            name="showInactive"
            value="1"
            defaultChecked={showInactive}
            className="h-4 w-4 accent-[var(--mt-navy)]"
          />
          Mostrar inativas
        </label>

        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mt-navy)] px-5 text-sm font-semibold text-white hover:opacity-95"
        >
          Filtrar
        </button>
      </form>

      {leaders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--mt-border)] bg-[var(--mt-surface)] p-8 text-center">
          <p className="text-sm font-medium">Nenhum líder encontrado</p>
          <p className="mt-2 text-sm text-[var(--mt-muted)]">Tente ajustar os filtros.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)]">
          <div className="grid grid-cols-1 divide-y divide-[var(--mt-border)]">
            {leaders.map((l) => {
              const leaderId = typeof l.auth_user_id === "string" ? l.auth_user_id : "";
              const churchName =
                l.churches && typeof l.churches.name === "string" ? l.churches.name : null;
              const churchStatus =
                l.churches && typeof l.churches.status === "string" ? l.churches.status : null;
              const sub = leaderId ? subscriptionMap.get(leaderId) : undefined;
              const plan = sub && typeof sub.plan === "string" ? sub.plan : "free";
              const subStatus = sub && typeof sub.status === "string" ? sub.status : "free";
              const planInfo = planMap.get(plan) ?? null;
              const planLabel = planInfo?.name ?? (plan === "free" ? "Gratuito" : plan);
              const planLimit = planInfo?.monthly_pre_sermon_limit ?? (plan === "free" ? 10 : null);
              const usedInCycle = leaderId ? usageMap.get(leaderId) ?? 0 : 0;
              const window = leaderId ? cycleWindowMap.get(leaderId) ?? null : null;
              const effective = getEffectiveLimit({
                planCode: plan,
                status: subStatus,
                planLimit,
                currentPeriodEnd: sub?.current_period_end ?? null,
              });
              const remaining = effective.kind === "limited" ? Math.max(0, effective.limit - usedInCycle) : null;

              const status = typeof l.status === "string" ? l.status : "active";
              const baseName = (l.display_name ?? l.name ?? "").trim();
              const leaderName = formatLeaderDisplayName(l.ministry_title ?? null, baseName) || baseName || "Líder";
              const role = typeof l.role === "string" ? l.role : "leader";
              const churchPlanType =
                l.churches && typeof l.churches.plan_type === "string" ? l.churches.plan_type : null;
              const churchPlanStatus =
                l.churches && typeof l.churches.plan_status === "string" ? l.churches.plan_status : null;
              const isBusinessActiveChurch =
                Boolean(l.church_id) &&
                churchStatus === "active" &&
                churchPlanType === "business" &&
                churchPlanStatus === "active";

              return (
                <div
                  key={l.id}
                  className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-12 sm:items-center"
                >
                  <div className="min-w-0 sm:col-span-4">
                    <div className="relative min-w-0">
                      <div className="group relative min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate text-base font-semibold">{leaderName}</p>
                          <span
                            tabIndex={0}
                            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--mt-border)] bg-[var(--mt-surface)] text-xs font-semibold text-[var(--mt-text)] outline-none ring-[var(--mt-navy)] focus:ring-2"
                            title="Ver detalhes"
                          >
                            i
                          </span>
                        </div>

                        <p className="mt-1 truncate text-sm text-[var(--mt-muted)]">{l.email}</p>

                        <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 hidden w-[min(28rem,90vw)] rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-4 text-xs text-[var(--mt-text)] shadow-xl group-hover:block group-focus-within:block">
                          <div className="grid grid-cols-1 gap-2">
                            <div className="flex flex-wrap gap-x-2 gap-y-1">
                              <span className="font-semibold">Status:</span>
                              <span>{status}</span>
                              <span className="opacity-70">•</span>
                              <span className="font-semibold">Acesso:</span>
                              <span>{role === "church_admin" ? "Admin da Igreja" : "Líder"}</span>
                            </div>
                            <div className="flex flex-wrap gap-x-2 gap-y-1">
                              <span className="font-semibold">Igreja:</span>
                              <span>{churchName ?? "—"}</span>
                              {churchStatus ? (
                                <>
                                  <span className="opacity-70">•</span>
                                  <span className="font-semibold">Status:</span>
                                  <span>{churchStatus}</span>
                                </>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap gap-x-2 gap-y-1">
                              <span className="font-semibold">Plano Igreja:</span>
                              <span>
                                {churchPlanType ?? "—"}/{churchPlanStatus ?? "—"}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-x-2 gap-y-1">
                              <span className="font-semibold">Assinatura líder:</span>
                              <span>
                                {planLabel} • {subStatus}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center gap-3 text-sm sm:col-span-4">
                    <span className="max-w-full truncate rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 py-2 font-semibold text-[var(--mt-text)]">
                      {planLabel} • {subStatus}
                    </span>
                    <span className="max-w-full truncate rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 py-2 font-semibold text-[var(--mt-text)]">
                      {effective.kind === "unlimited"
                        ? "Pré-sermões: ilimitado"
                        : `Ciclo: ${usedInCycle}/${effective.limit} • restam ${remaining}`}
                      {window ? ` • renova ${window.endLabel}` : ""}
                    </span>
                  </div>
                  <div className="sm:col-span-4">
                    <div className="grid gap-2 sm:justify-items-end">
                      <form
                        action={assignProfileToChurchAction}
                        className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-[minmax(0,16rem)_auto] sm:items-center"
                      >
                      <input type="hidden" name="profile_id" value={l.id} />
                      <input type="hidden" name="allow_inactive" value={showInactive ? "1" : "0"} />
                      <input
                        type="hidden"
                        name="return_to"
                        value={appendQuery("/admin/lideres", {
                          q,
                          status: statusFilter,
                          church: churchFilter,
                          showInactive: showInactive ? "1" : "0",
                        })}
                      />
                      <select
                        name="church_id"
                        defaultValue={l.church_id ?? ""}
                        className="h-10 w-full rounded-xl border border-[var(--mt-border)] bg-transparent px-3 text-sm outline-none ring-[var(--mt-navy)] focus:ring-2"
                      >
                        <option value="">Selecione igreja</option>
                        {assignOptions.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                            {c.status === "inactive" ? " (inativa)" : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-[var(--mt-navy)] px-4 text-sm font-semibold text-white hover:opacity-95 sm:w-auto"
                      >
                        Vincular
                      </button>
                    </form>
                      <div className="flex w-full flex-wrap items-center justify-end gap-2">
                        <form action={removeProfileFromChurchAction}>
                          <input type="hidden" name="profile_id" value={l.id} />
                          <input
                            type="hidden"
                            name="return_to"
                            value={appendQuery("/admin/lideres", {
                              q,
                              status: statusFilter,
                              church: churchFilter,
                              showInactive: showInactive ? "1" : "0",
                            })}
                          />
                          <button
                            type="submit"
                            disabled={!l.church_id}
                            className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-[var(--mt-border)] bg-transparent px-4 text-sm font-semibold text-[var(--mt-text)] hover:bg-[var(--mt-surface)] disabled:opacity-50 sm:w-auto"
                          >
                            Remover
                          </button>
                        </form>

                        {role === "leader" && isBusinessActiveChurch ? (
                          <form action={promoteToChurchAdminAction}>
                            <input type="hidden" name="profile_id" value={l.id} />
                            <input
                              type="hidden"
                              name="return_to"
                              value={appendQuery("/admin/lideres", {
                                q,
                                status: statusFilter,
                                church: churchFilter,
                                showInactive: showInactive ? "1" : "0",
                              })}
                            />
                            <button
                              type="submit"
                              className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-[var(--mt-border)] bg-transparent px-4 text-sm font-semibold text-[var(--mt-text)] hover:bg-[var(--mt-surface)] sm:w-auto"
                            >
                              Tornar Admin da Igreja
                            </button>
                          </form>
                        ) : null}

                        {role === "church_admin" ? (
                          <form action={demoteFromChurchAdminAction}>
                            <input type="hidden" name="profile_id" value={l.id} />
                            <input
                              type="hidden"
                              name="return_to"
                              value={appendQuery("/admin/lideres", {
                                q,
                                status: statusFilter,
                                church: churchFilter,
                                showInactive: showInactive ? "1" : "0",
                              })}
                            />
                            <button
                              type="submit"
                              className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-[var(--mt-border)] bg-transparent px-4 text-sm font-semibold text-[var(--mt-text)] hover:bg-[var(--mt-surface)] sm:w-auto"
                            >
                              Remover Admin da Igreja
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}

