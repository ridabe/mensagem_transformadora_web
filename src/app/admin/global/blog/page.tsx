import Link from "next/link";

import { formatPtBrDate, truncateText } from "@/lib/format";
import { requireAdmin } from "@/lib/auth/profiles";
import { getAllBlogPosts } from "@/app/admin/global/actions";

function getString(
  sp: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  const v = sp?.[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

function formatMaybeDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "—";
  return formatPtBrDate(d);
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
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>{label}</span>;
}

function FeaturedBadge({ featured }: { featured: boolean }) {
  if (!featured) return <span className="text-xs text-[var(--mt-muted)]">—</span>;
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--mt-amber)]/15 px-3 py-1 text-xs font-semibold text-[var(--mt-amber)]">
      Destaque
    </span>
  );
}

export default async function AdminGlobalBlogPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();

  const sp = searchParams ? await searchParams : undefined;
  const saved = getString(sp, "saved") === "1";
  const error = getString(sp, "error")?.trim() ?? "";

  const posts = await getAllBlogPosts().catch(() => []);

  const errorMessage =
    error === "create"
      ? "Erro ao criar post."
      : error === "update"
        ? "Erro ao salvar post."
        : error === "invalid"
          ? "Dados inválidos."
          : "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Admin Global</h2>
          <p className="text-sm text-[var(--mt-muted)]">Blog • Gerenciar posts</p>
        </div>
        <Link
          href="/admin/global/blog/novo"
          className="inline-flex items-center justify-center rounded-xl bg-[var(--mt-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          + Novo post
        </Link>
      </div>

      {saved ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900/30 dark:bg-emerald-900/10 dark:text-emerald-200">
          Alterações salvas com sucesso!
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900/30 dark:bg-rose-900/10 dark:text-rose-200">
          {errorMessage}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)]">
        {posts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-[var(--mt-muted)]">Nenhum post criado ainda</p>
            <Link href="/admin/global/blog/novo" className="mt-3 inline-flex text-sm font-semibold text-[var(--mt-primary)] hover:underline">
              Criar primeiro post
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--mt-border)] bg-[var(--mt-background)]">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-[var(--mt-text)]">Post</th>
                <th className="px-6 py-3 text-left font-semibold text-[var(--mt-text)]">Slug</th>
                <th className="px-6 py-3 text-left font-semibold text-[var(--mt-text)]">Status</th>
                <th className="px-6 py-3 text-left font-semibold text-[var(--mt-text)]">Destaque</th>
                <th className="px-6 py-3 text-left font-semibold text-[var(--mt-text)]">Publicado</th>
                <th className="px-6 py-3 text-left font-semibold text-[var(--mt-text)]">Atualizado</th>
                <th className="px-6 py-3 text-left font-semibold text-[var(--mt-text)]">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--mt-border)]">
              {posts.map((p) => (
                <tr key={p.id} className="hover:bg-[var(--mt-background)]">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-16 overflow-hidden rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface-muted)]">
                        {p.cover_image_url ? (
                          <img src={p.cover_image_url} alt={p.title} className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--mt-text)]">{p.title}</p>
                        <p className="mt-1 line-clamp-1 text-xs text-[var(--mt-muted)]">
                          {p.excerpt ? truncateText(p.excerpt, 90) : "—"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[var(--mt-muted)]">{p.slug}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-6 py-4">
                    <FeaturedBadge featured={Boolean(p.is_featured)} />
                  </td>
                  <td className="px-6 py-4 text-[var(--mt-muted)]">{formatMaybeDate(p.published_at)}</td>
                  <td className="px-6 py-4 text-[var(--mt-muted)]">{formatMaybeDate(p.updated_at)}</td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/global/blog/${encodeURIComponent(p.id)}/editar`}
                      className="font-semibold text-[var(--mt-primary)] hover:underline"
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
