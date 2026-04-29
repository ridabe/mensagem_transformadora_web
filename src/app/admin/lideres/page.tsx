import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/profiles";

type ProfileStatus = "active" | "blocked" | "pending";

type LeaderRow = {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  status: ProfileStatus | string;
  church_id: string | null;
  churches?: { name?: string | null } | null;
};

type SubscriptionRow = {
  leader_id: string;
  plan: string;
  status: string;
  current_period_end: string | null;
};

type PreSermonCount = {
  total: number;
  active: number;
  draft: number;
  archived: number;
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
    .select("id,auth_user_id,name,email,status,church_id,churches(name)")
    .eq("role", "leader")
    .order("name", { ascending: true })
    .limit(250);

  if (statusFilter !== "all") leadersQuery = leadersQuery.eq("status", statusFilter);
  if (q) {
    const escaped = q.replaceAll(",", " ");
    leadersQuery = leadersQuery.or(`name.ilike.%${escaped}%,email.ilike.%${escaped}%`);
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
      .select("leader_id,plan,status,current_period_end")
      .in("leader_id", authUserIds);

    for (const row of (subsData ?? []) as SubscriptionRow[]) {
      if (row?.leader_id) subscriptionMap.set(String(row.leader_id), row);
    }
  }

  const preSermonCountMap = new Map<string, PreSermonCount>();
  if (authUserIds.length) {
    const { data: preRows } = await service
      .from("pre_sermons")
      .select("leader_id,status")
      .in("leader_id", authUserIds)
      .limit(5000);

    for (const r of (preRows ?? []) as { leader_id?: unknown; status?: unknown }[]) {
      const leaderId = typeof r.leader_id === "string" ? r.leader_id : null;
      if (!leaderId) continue;
      const status = typeof r.status === "string" ? r.status : "active";
      const current = preSermonCountMap.get(leaderId) ?? {
        total: 0,
        active: 0,
        draft: 0,
        archived: 0,
      };

      current.total += 1;
      if (status === "draft") current.draft += 1;
      else if (status === "archived") current.archived += 1;
      else current.active += 1;

      preSermonCountMap.set(leaderId, current);
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
              const counts = leaderId
                ? preSermonCountMap.get(leaderId) ?? { total: 0, active: 0, draft: 0, archived: 0 }
                : { total: 0, active: 0, draft: 0, archived: 0 };

              const status = typeof l.status === "string" ? l.status : "active";

              return (
                <div key={l.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold">{l.name}</p>
                    <p className="mt-1 text-sm text-[var(--mt-muted)]">
                      {l.email} • {status}
                      {churchName ? ` • ${churchName}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 py-2 font-semibold text-[var(--mt-text)]">
                      {plan} • {subStatus}
                    </span>
                    <span className="rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 py-2 font-semibold text-[var(--mt-text)]">
                      Pré-sermões: {counts.total}
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

