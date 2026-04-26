import { redirect } from "next/navigation";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { formatPtBrDate } from "@/lib/format";

type DashboardSummaryRow = {
  user_id: string;
  total_sermons: number;
  total_published: number;
  total_private: number;
  total_unpublished: number;
  total_views: number;
};

type RecentSermonRow = {
  id: string;
  sermon_title: string;
  sermon_date: string;
  visibility: string;
  status: string;
  views_count: number;
  slug: string;
};

export default async function AdminDashboardPage() {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (err) {
    const message =
      err && typeof err === "object" && "message" in err && typeof err.message === "string"
        ? err.message
        : "Supabase não está configurado no ambiente.";
    return (
      <main className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-lg font-semibold tracking-tight">Configuração</h2>
        <p className="mt-2 text-sm text-[var(--mt-muted)]">
          {message}
        </p>
      </main>
    );
  }

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;
  if (!userId) redirect("/admin/login?error=invalid");

  const service = createServiceRoleClient();

  const [{ count: publishedCount, error: publishedError }, { count: privateCount, error: privateError }] =
    await Promise.all([
      service
        .from("published_sermons")
        .select("id", { count: "exact", head: true })
        .eq("status", "published"),
      service
        .from("published_sermons")
        .select("id", { count: "exact", head: true })
        .eq("visibility", "private"),
    ]);

  const { data: viewsAgg, error: viewsError } = await service
    .from("published_sermons")
    .select("total:views_count.sum()");

  const { data: recentData, error: recentError } = await service
    .from("published_sermons")
    .select("id,sermon_title,sermon_date,visibility,status,views_count,slug")
    .order("updated_at", { ascending: false })
    .limit(5);

  if (publishedError || privateError || viewsError || recentError) {
    return (
      <main className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-lg font-semibold tracking-tight">Dashboard</h2>
        <p className="mt-2 text-sm text-[var(--mt-muted)]">
          Não foi possível carregar os dados do painel.
        </p>
      </main>
    );
  }

  const viewsTotalRaw = (viewsAgg?.[0] as unknown as { total?: unknown } | undefined)?.total;
  const totalViews = typeof viewsTotalRaw === "number" ? viewsTotalRaw : 0;

  const summary: DashboardSummaryRow = {
    user_id: userId,
    total_sermons: 0,
    total_published: publishedCount ?? 0,
    total_private: privateCount ?? 0,
    total_unpublished: 0,
    total_views: totalViews,
  };

  const cards = [
    { label: "Publicadas", value: summary.total_published },
    { label: "Privadas", value: summary.total_private },
    { label: "Visualizações", value: summary.total_views },
  ];

  const recent = (recentData ?? []) as RecentSermonRow[];

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-[var(--mt-muted)]">Admin • Dashboard</p>
        <h2 className="text-2xl font-semibold tracking-tight">
          Visão geral das publicações
        </h2>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-5"
          >
            <p className="text-xs font-medium text-[var(--mt-muted)]">{c.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{c.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h3 className="text-base font-semibold">Mensagens recentes</h3>
        {recent.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--mt-muted)]">
            Você ainda não possui mensagens publicadas.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-0 divide-y divide-[var(--mt-border)]">
            {recent.map((s) => (
              <div key={s.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[var(--mt-muted)]">
                    {formatPtBrDate(new Date(s.sermon_date))} • {s.views_count} views •{" "}
                    {s.visibility} • {s.status}
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold">{s.sermon_title}</p>
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={`/mensagens/${s.slug}`}
                    className="text-sm font-semibold text-[var(--mt-navy)] hover:underline"
                  >
                    Abrir público
                  </a>
                  <a
                    href={`/admin/mensagens/${s.id}`}
                    className="text-sm font-semibold text-[var(--mt-text)] hover:underline"
                  >
                    Editar
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
