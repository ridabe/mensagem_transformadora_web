import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/profiles";
import { formatLeaderDisplayName, formatPtBrDate } from "@/lib/format";

type ProfileStatus = "active" | "blocked" | "pending";

type LeaderRow = {
  id: string;
  auth_user_id: string;
  name?: string;
  display_name?: string;
  email: string;
  ministry_title?: string | null;
  status: ProfileStatus | string;
  church_id: string | null;
  created_at?: string | null;
  churches?: { name?: string | null } | null;
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
    .select("id,auth_user_id,name,display_name,email,ministry_title,status,church_id,created_at,churches(name)")
    .eq("role", "leader")
    .order("display_name", { ascending: true })
    .limit(250);

  if (statusFilter !== "all") leadersQuery = leadersQuery.eq("status", statusFilter);
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

      <form className="flex flex-col gap-3 rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-5 sm:flex-row sm:items-end">
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

              return (
                <div key={l.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold">{leaderName}</p>
                    <p className="mt-1 text-sm text-[var(--mt-muted)]">
                      {l.email} • {status}
                      {churchName ? ` • ${churchName}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 py-2 font-semibold text-[var(--mt-text)]">
                      {planLabel} • {subStatus}
                    </span>
                    <span className="rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 py-2 font-semibold text-[var(--mt-text)]">
                      {effective.kind === "unlimited"
                        ? "Pré-sermões: ilimitado"
                        : `Ciclo: ${usedInCycle}/${effective.limit} • restam ${remaining}`}
                      {window ? ` • renova ${window.endLabel}` : ""}
                    </span>
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

