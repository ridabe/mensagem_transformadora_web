import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { formatPtBrDate } from "@/lib/format";
import { requireAdmin } from "@/lib/auth/profiles";

type RecentSermonRow = {
  id: string;
  sermon_title: string;
  sermon_date: string;
  visibility: string;
  status: string;
  views_count: number;
  slug: string;
};

type TimestampRow = Record<string, unknown>;

type MetricCardProps = {
  label: string;
  value: number;
  series: number[];
  meta?: string;
  accent: "navy" | "emerald" | "violet" | "amber" | "sky" | "rose";
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/(^-|-$)/g, "");
}

function asDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (typeof value === "string") {
    const d = new Date(value);
    if (Number.isFinite(d.getTime())) return d;
  }
  return null;
}

function startOfDayUTC(date: Date): Date {
  const d = new Date(date.getTime());
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function buildLastDaysKeys(days: number): string[] {
  const now = startOfDayUTC(new Date());
  const keys: string[] = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now.getTime());
    d.setUTCDate(d.getUTCDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }

  return keys;
}

function buildDailySeries(rows: TimestampRow[], field: string, days: number): number[] {
  const keys = buildLastDaysKeys(days);
  const counts = new Map<string, number>();

  for (const r of rows) {
    const d = asDate(r?.[field]);
    if (!d) continue;
    const key = startOfDayUTC(d).toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return keys.map((k) => counts.get(k) ?? 0);
}

function MiniBarChart({
  id,
  series,
  accent,
}: {
  id: string;
  series: number[];
  accent: MetricCardProps["accent"];
}) {
  const safeSeries = series.length ? series : [0];
  const max = Math.max(1, ...safeSeries);
  const bars = safeSeries.length;
  const gap = 2;
  const totalGap = gap * (bars - 1);
  const barWidth = bars > 0 ? (100 - totalGap) / bars : 100;

  const colors: Record<MetricCardProps["accent"], { from: string; to: string }> = {
    navy: { from: "#0B2A4A", to: "#2B7FFF" },
    emerald: { from: "#065F46", to: "#34D399" },
    violet: { from: "#4C1D95", to: "#A78BFA" },
    amber: { from: "#92400E", to: "#FBBF24" },
    sky: { from: "#075985", to: "#38BDF8" },
    rose: { from: "#9F1239", to: "#FB7185" },
  };

  const gradientId = `mt-grad-${id}`;

  return (
    <svg
      viewBox="0 0 100 32"
      className="h-10 w-full"
      role="img"
      aria-label="Gráfico"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={colors[accent].to} stopOpacity="0.95" />
          <stop offset="1" stopColor={colors[accent].from} stopOpacity="0.55" />
        </linearGradient>
      </defs>

      {safeSeries.map((v, idx) => {
        const h = (v / max) * 28;
        const x = idx * (barWidth + gap);
        const y = 32 - h;
        const rounded = Math.min(2, barWidth / 2);
        return (
          <rect
            key={`${id}-${idx}`}
            x={x}
            y={y}
            width={barWidth}
            height={h}
            rx={rounded}
            fill={`url(#${gradientId})`}
            opacity={v === 0 ? 0.25 : 1}
          />
        );
      })}
    </svg>
  );
}

function MetricCard({ label, value, series, meta, accent }: MetricCardProps) {
  const id = slugify(label);

  const accents: Record<MetricCardProps["accent"], string> = {
    navy: "ring-[var(--mt-navy)]",
    emerald: "ring-emerald-500/40",
    violet: "ring-violet-500/40",
    amber: "ring-amber-500/40",
    sky: "ring-sky-500/40",
    rose: "ring-rose-500/40",
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-5">
      <div className={`absolute inset-0 opacity-50 blur-2xl ${accents[accent]}`} />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--mt-muted)]">{label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
            {meta ? (
              <p className="mt-1 text-xs text-[var(--mt-muted)]">{meta}</p>
            ) : null}
          </div>
        </div>
        <div className="mt-4">
          <MiniBarChart id={id} series={series} accent={accent} />
        </div>
      </div>
    </div>
  );
}

export default async function AdminDashboardPage() {
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
        <p className="mt-2 text-sm text-[var(--mt-muted)]">
          {message}
        </p>
      </main>
    );
  }

  await requireAdmin();

  const service = createServiceRoleClient();

  const chartDays = 14;
  const chartStart = startOfDayUTC(new Date());
  chartStart.setUTCDate(chartStart.getUTCDate() - (chartDays - 1));
  const chartStartIso = chartStart.toISOString();

  const [
    { count: publishedCount, error: publishedError },
    { count: privateCount, error: privateError },
    { count: businessChurchCount, error: businessChurchError },
    { count: leadersTotalCount, error: leadersTotalError },
    { count: leadersActiveCount, error: leadersActiveError },
    { count: leadersPendingCount, error: leadersPendingError },
    { count: leadersBlockedCount, error: leadersBlockedError },
    { count: preTotalCount, error: preTotalError },
    { count: preActiveCount, error: preActiveError },
    { count: preDraftCount, error: preDraftError },
    { count: preArchivedCount, error: preArchivedError },
    { data: viewsRows, error: viewsError },
    { data: viewsTopRows, error: viewsTopError },
    { data: recentData, error: recentError },
    { data: publishedUpdatedRows, error: publishedUpdatedError },
    { data: privateUpdatedRows, error: privateUpdatedError },
    { data: businessChurchCreatedRows, error: businessChurchCreatedError },
    { data: leaderCreatedRows, error: leaderCreatedError },
    { data: preCreatedRows, error: preCreatedError },
  ] = await Promise.all([
    service.from("published_sermons").select("id", { count: "exact", head: true }).eq("status", "published"),
    service.from("published_sermons").select("id", { count: "exact", head: true }).eq("visibility", "private"),
    service
      .from("churches")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("plan_type", "business")
      .eq("plan_status", "active"),
    service.from("profiles").select("id", { count: "exact", head: true }).eq("role", "leader"),
    service.from("profiles").select("id", { count: "exact", head: true }).eq("role", "leader").eq("status", "active"),
    service.from("profiles").select("id", { count: "exact", head: true }).eq("role", "leader").eq("status", "pending"),
    service.from("profiles").select("id", { count: "exact", head: true }).eq("role", "leader").eq("status", "blocked"),
    service.from("pre_sermons").select("id", { count: "exact", head: true }),
    service.from("pre_sermons").select("id", { count: "exact", head: true }).eq("status", "active"),
    service.from("pre_sermons").select("id", { count: "exact", head: true }).eq("status", "draft"),
    service.from("pre_sermons").select("id", { count: "exact", head: true }).eq("status", "archived"),
    service.from("published_sermons").select("views_count"),
    service.from("published_sermons").select("views_count").order("views_count", { ascending: false }).limit(chartDays),
    service
      .from("published_sermons")
      .select("id,sermon_title,sermon_date,visibility,status,views_count,slug")
      .order("updated_at", { ascending: false })
      .limit(5),
    service
      .from("published_sermons")
      .select("updated_at")
      .eq("status", "published")
      .gte("updated_at", chartStartIso)
      .limit(5000),
    service
      .from("published_sermons")
      .select("updated_at")
      .eq("visibility", "private")
      .gte("updated_at", chartStartIso)
      .limit(5000),
    service
      .from("churches")
      .select("created_at")
      .eq("status", "active")
      .eq("plan_type", "business")
      .eq("plan_status", "active")
      .gte("created_at", chartStartIso)
      .limit(5000),
    service
      .from("profiles")
      .select("created_at")
      .eq("role", "leader")
      .gte("created_at", chartStartIso)
      .limit(5000),
    service.from("pre_sermons").select("created_at").gte("created_at", chartStartIso).limit(5000),
  ]);

  if (
    publishedError ||
    privateError ||
    businessChurchError ||
    leadersTotalError ||
    leadersActiveError ||
    leadersPendingError ||
    leadersBlockedError ||
    preTotalError ||
    preActiveError ||
    preDraftError ||
    preArchivedError ||
    viewsError ||
    viewsTopError ||
    recentError ||
    publishedUpdatedError ||
    privateUpdatedError ||
    businessChurchCreatedError ||
    leaderCreatedError ||
    preCreatedError
  ) {
    return (
      <main className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-lg font-semibold tracking-tight">Dashboard</h2>
        <p className="mt-2 text-sm text-[var(--mt-muted)]">
          Não foi possível carregar os dados do painel.
        </p>
      </main>
    );
  }

  const totalViews = (viewsRows ?? []).reduce((acc, row) => {
    const v =
      row && typeof row === "object" && "views_count" in row && typeof row.views_count === "number"
        ? row.views_count
        : 0;
    return acc + v;
  }, 0);

  const viewsTopSeries = ((viewsTopRows ?? []) as { views_count?: unknown }[])
    .map((r) => (typeof r.views_count === "number" ? r.views_count : 0))
    .slice(0, chartDays);

  const publishedSeries = buildDailySeries((publishedUpdatedRows ?? []) as TimestampRow[], "updated_at", chartDays);
  const privateSeries = buildDailySeries((privateUpdatedRows ?? []) as TimestampRow[], "updated_at", chartDays);
  const businessChurchSeries = buildDailySeries(
    (businessChurchCreatedRows ?? []) as TimestampRow[],
    "created_at",
    chartDays,
  );
  const leadersSeries = buildDailySeries((leaderCreatedRows ?? []) as TimestampRow[], "created_at", chartDays);
  const preSermonsSeries = buildDailySeries((preCreatedRows ?? []) as TimestampRow[], "created_at", chartDays);

  const leaderStatusSeries = [
    leadersActiveCount ?? 0,
    leadersPendingCount ?? 0,
    leadersBlockedCount ?? 0,
  ];

  const preStatusSeries = [preDraftCount ?? 0, preActiveCount ?? 0, preArchivedCount ?? 0];

  const cards: MetricCardProps[] = [
    {
      label: "Mensagens publicadas",
      value: publishedCount ?? 0,
      series: publishedSeries,
      meta: `atualizações • ${chartDays} dias`,
      accent: "navy",
    },
    {
      label: "Mensagens privadas",
      value: privateCount ?? 0,
      series: privateSeries,
      meta: `atualizações • ${chartDays} dias`,
      accent: "sky",
    },
    {
      label: "Igrejas Business",
      value: businessChurchCount ?? 0,
      series: businessChurchSeries,
      meta: "ativas • plano business",
      accent: "emerald",
    },
    {
      label: "Visualizações",
      value: totalViews,
      series: viewsTopSeries.length ? viewsTopSeries : [0],
      meta: `top ${Math.min(chartDays, viewsTopSeries.length || chartDays)} por mensagem`,
      accent: "violet",
    },
    {
      label: "Líderes",
      value: leadersTotalCount ?? 0,
      series: leadersSeries,
      meta: `novos • ${chartDays} dias`,
      accent: "emerald",
    },
    {
      label: "Status de líderes",
      value: leadersActiveCount ?? 0,
      series: leaderStatusSeries,
      meta: "ativo • pendente • bloqueado",
      accent: "amber",
    },
    {
      label: "Pré-sermões",
      value: preTotalCount ?? 0,
      series: preSermonsSeries,
      meta: `novos • ${chartDays} dias`,
      accent: "rose",
    },
    {
      label: "Status de pré-sermões",
      value: preActiveCount ?? 0,
      series: preStatusSeries,
      meta: "rascunho • ativo • arquivado",
      accent: "navy",
    },
    {
      label: "Pré-sermões arquivados",
      value: preArchivedCount ?? 0,
      series: preStatusSeries,
      meta: "rascunho • ativo • arquivado",
      accent: "violet",
    },
  ];

  const recent = (recentData ?? []) as RecentSermonRow[];

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-[var(--mt-muted)]">Admin • Dashboard</p>
        <h2 className="text-2xl font-semibold tracking-tight">Visão geral do sistema</h2>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <MetricCard
            key={c.label}
            label={c.label}
            value={c.value}
            series={c.series}
            meta={c.meta}
            accent={c.accent}
          />
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
              <div
                key={s.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[var(--mt-muted)]">
                    {formatPtBrDate(new Date(s.sermon_date))} • {s.views_count} views • {s.visibility} •{" "}
                    {s.status}
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
