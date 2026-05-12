import Link from "next/link";

import { formatPtBrDate } from "@/lib/format";
import { requireAdmin } from "@/lib/auth/profiles";
import { getBlogMetrics } from "@/app/admin/global/actions";
import { BlogAdminNav } from "@/app/admin/global/blog/_components/BlogAdminNav";

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-5">
      <p className="text-xs font-medium text-[var(--mt-muted)]">{label}</p>
      <p className={`text-3xl font-bold tracking-tight ${accent ?? "text-[var(--mt-text)]"}`}>
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = String(status ?? "").trim().toLowerCase();
  const label =
    normalized === "published" ? "Publicado" : normalized === "archived" ? "Arquivado" : "Rascunho";
  const cls =
    normalized === "published"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
      : normalized === "archived"
        ? "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300"
        : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function formatMaybeDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "—";
  return formatPtBrDate(d);
}

export default async function AdminGlobalBlogMetricasPage() {
  await requireAdmin();

  const metrics = await getBlogMetrics().catch(() => null);

  if (!metrics) {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-5">
          <h2 className="text-xl font-bold tracking-tight">Blog</h2>
          <p className="text-sm text-[var(--mt-muted)]">Métricas</p>
        </div>
        <BlogAdminNav />
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900/30 dark:bg-rose-900/10 dark:text-rose-200">
          Não foi possível carregar as métricas.
        </div>
      </div>
    );
  }

  const totalViewsFormatted = metrics.totalViews.toLocaleString("pt-BR");

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Blog</h2>
          <p className="text-sm text-[var(--mt-muted)]">Métricas e desempenho</p>
        </div>
        <Link
          href="/blog"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 py-2 text-sm font-semibold text-[var(--mt-text)] hover:bg-[var(--mt-background)]"
        >
          Ver blog público ↗
        </Link>
      </div>

      {/* Sub-nav */}
      <BlogAdminNav />

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total de posts" value={metrics.totalPosts} />
        <StatCard label="Publicados" value={metrics.publishedPosts} accent="text-emerald-600 dark:text-emerald-400" />
        <StatCard label="Rascunhos" value={metrics.draftPosts} accent="text-amber-600 dark:text-amber-400" />
        <StatCard label="Visualizações totais" value={totalViewsFormatted} accent="text-[var(--mt-primary)]" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top posts table */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <h3 className="text-base font-semibold text-[var(--mt-text)]">Posts mais lidos</h3>
          <div className="overflow-x-auto rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)]">
            {metrics.topPosts.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-[var(--mt-muted)]">Nenhuma visualização registrada ainda</p>
                <p className="mt-1 text-xs text-[var(--mt-muted)]">
                  As visualizações são contabilizadas quando os posts são acessados pelos leitores.
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-[var(--mt-border)] bg-[var(--mt-background)]">
                  <tr>
                    <th className="px-4 py-3 text-center font-semibold text-[var(--mt-muted)] w-10">#</th>
                    <th className="px-4 py-3 text-left font-semibold text-[var(--mt-text)]">Post</th>
                    <th className="px-4 py-3 text-left font-semibold text-[var(--mt-text)]">Status</th>
                    <th className="px-4 py-3 text-right font-semibold text-[var(--mt-text)]">Views</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--mt-border)]">
                  {metrics.topPosts.map((p, i) => (
                    <tr key={p.post_id} className="hover:bg-[var(--mt-background)]">
                      <td className="px-4 py-3 text-center text-xs font-bold text-[var(--mt-muted)]">
                        {i + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-14 shrink-0 overflow-hidden rounded-lg border border-[var(--mt-border)] bg-[var(--mt-surface-muted)]">
                            {p.cover_image_url ? (
                              <img
                                src={p.cover_image_url}
                                alt={p.title}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <p className="line-clamp-1 font-semibold text-[var(--mt-text)]">{p.title}</p>
                            <p className="text-xs text-[var(--mt-muted)]">
                              {p.published_at ? formatMaybeDate(p.published_at) : "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-[var(--mt-text)]">
                          {p.views.toLocaleString("pt-BR")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Categories ranking */}
        <div className="flex flex-col gap-3">
          <h3 className="text-base font-semibold text-[var(--mt-text)]">Categorias mais usadas</h3>
          <div className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)]">
            {metrics.categoriesWithCounts.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-[var(--mt-muted)]">Nenhuma categoria cadastrada</p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--mt-border)]">
                {metrics.categoriesWithCounts.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <Link
                      href={`/blog/categoria/${c.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-[var(--mt-text)] hover:underline truncate"
                    >
                      {c.name}
                    </Link>
                    <span className="shrink-0 rounded-full bg-[var(--mt-background)] px-2.5 py-0.5 text-xs font-semibold text-[var(--mt-muted)]">
                      {c.count} post{c.count !== 1 ? "s" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Quick links */}
          <h3 className="mt-2 text-base font-semibold text-[var(--mt-text)]">Ações rápidas</h3>
          <div className="flex flex-col gap-2 rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-4">
            <Link
              href="/admin/global/blog/novo"
              className="inline-flex items-center rounded-xl bg-[var(--mt-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 justify-center"
            >
              + Novo post
            </Link>
            <Link
              href="/admin/global/blog"
              className="inline-flex items-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-background)] px-4 py-2.5 text-sm font-semibold text-[var(--mt-text)] hover:bg-[var(--mt-surface)] justify-center"
            >
              Gerenciar posts
            </Link>
            <Link
              href="/admin/global/blog/categorias"
              className="inline-flex items-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-background)] px-4 py-2.5 text-sm font-semibold text-[var(--mt-text)] hover:bg-[var(--mt-surface)] justify-center"
            >
              Gerenciar categorias
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
