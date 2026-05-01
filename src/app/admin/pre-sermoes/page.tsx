import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/profiles";
import { formatLeaderDisplayName, formatPtBrDate, truncateText } from "@/lib/format";

type PreSermonStatus = "draft" | "active" | "archived";

type PreSermonRow = {
  id: string;
  share_code: string;
  title: string;
  status: PreSermonStatus | string;
  leader_id: string;
  church_id: string | null;
  created_at: string;
  updated_at: string;
};

type LeaderLookupRow = {
  auth_user_id: string;
  display_name: string;
  email: string;
  church_id: string | null;
  ministry_title: string | null;
};

type ChurchLookupRow = {
  id: string;
  name: string;
};

type AdminPreSermonsPageProps = {
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

function parsePreSermonStatus(value: string | undefined): PreSermonStatus | "all" {
  if (value === "draft") return "draft";
  if (value === "active") return "active";
  if (value === "archived") return "archived";
  return "all";
}

export default async function AdminPreSermoesPage({ searchParams }: AdminPreSermonsPageProps) {
  const sp = searchParams ? await searchParams : undefined;
  const q = getString(sp, "q")?.trim() ?? "";
  const statusFilter = parsePreSermonStatus(getString(sp, "status"));

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

  let preQuery = service
    .from("pre_sermons")
    .select("id,share_code,title,status,leader_id,church_id,created_at,updated_at")
    .order("updated_at", { ascending: false })
    .limit(250);

  if (statusFilter !== "all") preQuery = preQuery.eq("status", statusFilter);
  if (q) {
    const escaped = q.replaceAll(",", " ");
    preQuery = preQuery.or(`title.ilike.%${escaped}%,share_code.ilike.%${escaped}%`);
  }

  const { data: preData, error: preError } = await preQuery;

  if (preError) {
    return (
      <main className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-lg font-semibold tracking-tight">Pré-sermões</h2>
        <p className="mt-2 text-sm text-[var(--mt-muted)]">
          Não foi possível carregar a lista de pré-sermões.
        </p>
      </main>
    );
  }

  const preSermons = (preData ?? []) as PreSermonRow[];

  const leaderIds = Array.from(
    new Set(
      preSermons.map((p) => (typeof p.leader_id === "string" ? p.leader_id : "")).filter(Boolean),
    ),
  );

  const leaderMap = new Map<string, LeaderLookupRow>();
  if (leaderIds.length) {
    const { data: leaderData } = await service
      .from("profiles")
      .select("auth_user_id,display_name,email,church_id,ministry_title")
      .in("auth_user_id", leaderIds);
    for (const row of (leaderData ?? []) as LeaderLookupRow[]) {
      if (row?.auth_user_id) leaderMap.set(String(row.auth_user_id), row);
    }
  }

  const churchIds = Array.from(
    new Set(
      preSermons
        .map((p) => (typeof p.church_id === "string" ? p.church_id : null))
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const churchMap = new Map<string, ChurchLookupRow>();
  if (churchIds.length) {
    const { data: churchesData } = await service
      .from("churches")
      .select("id,name")
      .in("id", churchIds);
    for (const row of (churchesData ?? []) as ChurchLookupRow[]) {
      if (row?.id) churchMap.set(String(row.id), row);
    }
  }

  const summary = preSermons.reduce(
    (acc, p) => {
      const status = typeof p.status === "string" ? p.status : "active";
      acc.total += 1;
      if (status === "draft") acc.draft += 1;
      else if (status === "archived") acc.archived += 1;
      else acc.active += 1;
      return acc;
    },
    { total: 0, draft: 0, active: 0, archived: 0 },
  );

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-[var(--mt-muted)]">Admin • Pré-sermões</p>
        <h2 className="text-2xl font-semibold tracking-tight">Acompanhar pré-sermões</h2>
        <p className="text-sm leading-6 text-[var(--mt-muted)]">
          Visão global dos pré-sermões por líder, status e atualização.
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
          <p className="text-xs font-medium text-[var(--mt-muted)]">Rascunhos</p>
          <p className="mt-2 text-2xl font-semibold">{summary.draft}</p>
        </div>
        <div className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-5">
          <p className="text-xs font-medium text-[var(--mt-muted)]">Arquivados</p>
          <p className="mt-2 text-2xl font-semibold">{summary.archived}</p>
        </div>
      </section>

      <form className="flex flex-col gap-3 rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-5 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-2 text-sm">
          <span className="font-semibold">Buscar</span>
          <input
            name="q"
            defaultValue={q}
            className="h-11 rounded-xl border border-[var(--mt-border)] bg-transparent px-4 outline-none ring-[var(--mt-navy)] focus:ring-2"
            placeholder="Título ou MT-XXXXX"
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
            <option value="draft">Rascunho</option>
            <option value="archived">Arquivado</option>
          </select>
        </label>

        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mt-navy)] px-5 text-sm font-semibold text-white hover:opacity-95"
        >
          Filtrar
        </button>
      </form>

      {preSermons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--mt-border)] bg-[var(--mt-surface)] p-8 text-center">
          <p className="text-sm font-medium">Nenhum pré-sermão encontrado</p>
          <p className="mt-2 text-sm text-[var(--mt-muted)]">Tente ajustar os filtros.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)]">
          <div className="grid grid-cols-1 divide-y divide-[var(--mt-border)]">
            {preSermons.map((p) => {
              const status = typeof p.status === "string" ? p.status : "active";
              const updatedAt = p.updated_at ? new Date(p.updated_at) : null;
              const updatedLabel = updatedAt ? formatPtBrDate(updatedAt) : null;

              const leader = leaderMap.get(p.leader_id);
              const leaderName = formatLeaderDisplayName(leader?.ministry_title ?? null, leader?.display_name ?? "") || "Líder";
              const leaderEmail = leader?.email ?? "";

              const church =
                p.church_id && churchMap.has(p.church_id) ? churchMap.get(p.church_id) : null;

              return (
                <div
                  key={p.id}
                  className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[var(--mt-muted)]">
                      {p.share_code} • {status}
                      {updatedLabel ? ` • atualizado em ${updatedLabel}` : ""}
                      {church?.name ? ` • ${church.name}` : ""}
                    </p>
                    <p className="mt-1 truncate text-base font-semibold">
                      {truncateText(p.title, 90)}
                    </p>
                    <p className="mt-1 truncate text-sm text-[var(--mt-muted)]">
                      {leaderName}
                      {leaderEmail ? ` • ${leaderEmail}` : ""}
                    </p>
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

