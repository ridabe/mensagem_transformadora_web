import Link from "next/link";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/profiles";
import {
  archiveBlogPostAction,
  deleteBlogPostAction,
  getBlogPostById,
  getBlogPostCategorySlugs,
  getBlogPostTagSlugs,
  publishBlogPostAction,
  updateBlogPostAction,
} from "@/app/admin/global/actions";
import { formatPtBrDate } from "@/lib/format";
import { RichTextField } from "@/app/admin/global/blog/_components/RichTextField";

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

export default async function AdminGlobalBlogEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const { id } = await params;
  const post = await getBlogPostById(id).catch(() => null);
  if (!post) redirect("/admin/global/blog?error=invalid");

  const [categorySlugs, tagSlugs] = await Promise.all([
    getBlogPostCategorySlugs(post.id),
    getBlogPostTagSlugs(post.id),
  ]);

  const sp = searchParams ? await searchParams : undefined;
  const saved = getString(sp, "saved") === "1";
  const error = getString(sp, "error")?.trim() ?? "";

  const errorMessage =
    error === "title"
      ? "Título é obrigatório."
      : error === "slug"
        ? "Slug é obrigatório."
        : error === "slug_taken"
          ? "Slug já está em uso."
          : error === "confirm_delete"
            ? "Para excluir, marque a confirmação."
          : error === "update"
            ? "Não foi possível salvar o post."
            : "";

  const isPublished = String(post.status ?? "").toLowerCase() === "published";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-5">
        <p className="text-sm text-[var(--mt-muted)]">Admin Global • Blog</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">Editar post</h2>
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={post.status} />
              <span className="text-xs text-[var(--mt-muted)]">Criado: {formatMaybeDate(post.created_at)}</span>
              <span className="text-xs text-[var(--mt-muted)]">Atualizado: {formatMaybeDate(post.updated_at)}</span>
              <span className="text-xs text-[var(--mt-muted)]">Publicado: {formatMaybeDate(post.published_at)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {isPublished ? (
              <Link
                href={`/blog/${encodeURIComponent(post.slug)}`}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-5 text-sm font-semibold text-[var(--mt-text)] hover:bg-[var(--mt-surface-elevated)]"
              >
                Ver no site
              </Link>
            ) : null}
            <Link
              href="/admin/global/blog"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-5 text-sm font-semibold text-[var(--mt-text)] hover:bg-[var(--mt-surface-elevated)]"
            >
              Voltar
            </Link>
          </div>
        </div>
      </header>

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

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <form
          action={updateBlogPostAction}
          className="flex flex-col gap-6 rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6"
        >
          <input type="hidden" name="id" value={post.id} />

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold">Título</label>
              <input
                name="title"
                defaultValue={post.title}
                className="h-11 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold">Slug</label>
              <input
                name="slug"
                defaultValue={post.slug}
                className="h-11 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
                required
              />
              <p className="text-xs text-[var(--mt-muted)]">URL final: /blog/{post.slug}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">Resumo</label>
            <textarea
              name="excerpt"
              rows={4}
              defaultValue={post.excerpt ?? ""}
              className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 py-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">Conteúdo</label>
            <RichTextField name="content" initialHtml={post.content ?? ""} placeholder="Escreva seu post..." minHeightClassName="min-h-[420px]" />
            <p className="text-xs text-[var(--mt-muted)]">
              O conteúdo é salvo como HTML e renderizado no site com sanitização básica.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold">Categorias (separadas por vírgula)</label>
              <input
                name="categories"
                defaultValue={categorySlugs.join(", ")}
                placeholder="Ex.: fe, oracao, discipulado"
                className="h-11 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
              />
              <p className="text-xs text-[var(--mt-muted)]">Use nomes ou slugs; serão normalizados.</p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold">Tags (separadas por vírgula)</label>
              <input
                name="tags"
                defaultValue={tagSlugs.join(", ")}
                placeholder="Ex.: esperanca, paz, proposito"
                className="h-11 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
              />
              <p className="text-xs text-[var(--mt-muted)]">Use nomes ou slugs; serão normalizados.</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold">SEO title</label>
              <input
                name="seo_title"
                defaultValue={post.seo_title ?? ""}
                className="h-11 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold">SEO description</label>
              <input
                name="seo_description"
                defaultValue={post.seo_description ?? ""}
                className="h-11 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold">Imagem de capa (upload)</label>
              <input
                type="file"
                accept="image/*"
                name="cover_image"
                className="rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 py-2 text-sm"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold">Status</label>
                <select
                  name="status"
                  defaultValue={String(post.status ?? "draft")}
                  className="h-11 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
                >
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicado</option>
                  <option value="archived">Arquivado</option>
                </select>
              </div>

              <div className="flex items-end gap-3 rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface-elevated)] p-4">
                <input
                  id="is_featured"
                  type="checkbox"
                  name="is_featured"
                  value="1"
                  defaultChecked={Boolean(post.is_featured)}
                  className="h-4 w-4"
                />
                <label htmlFor="is_featured" className="text-sm font-semibold">
                  Post em destaque
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mt-navy)] px-5 text-sm font-semibold text-white hover:opacity-95"
            >
              Salvar alterações
            </button>
          </div>
        </form>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
          <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-5">
            <h3 className="text-sm font-semibold">Ações</h3>
            <div className="mt-4 flex flex-col gap-3">
              <form action={publishBlogPostAction}>
                <input type="hidden" name="id" value={post.id} />
                <button
                  type="submit"
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:opacity-95"
                >
                  Publicar
                </button>
              </form>

              <form action={archiveBlogPostAction}>
                <input type="hidden" name="id" value={post.id} />
                <button
                  type="submit"
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-slate-700 px-5 text-sm font-semibold text-white hover:opacity-95"
                >
                  Arquivar
                </button>
              </form>

              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900 dark:border-rose-900/30 dark:bg-rose-900/10 dark:text-rose-200">
                <p className="text-sm font-semibold">Excluir post</p>
                <p className="mt-2 text-sm text-rose-800/90 dark:text-rose-200/90">
                  Esta ação é permanente. Exige confirmação.
                </p>
                <form action={deleteBlogPostAction} className="mt-4 flex flex-col gap-3">
                  <input type="hidden" name="id" value={post.id} />
                  <label className="flex items-center gap-3 text-sm">
                    <input type="checkbox" name="confirm_delete" value="1" className="h-4 w-4" />
                    Confirmo que desejo excluir
                  </label>
                  <button
                    type="submit"
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-rose-600 px-5 text-sm font-semibold text-white hover:opacity-95"
                  >
                    Excluir
                  </button>
                </form>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)]">
            <div className="border-b border-[var(--mt-border)] p-5">
              <h3 className="text-sm font-semibold">Capa</h3>
              <p className="mt-1 text-sm text-[var(--mt-muted)]">
                {post.cover_image_url ? "Imagem configurada." : "Sem imagem ainda."}
              </p>
            </div>
            {post.cover_image_url ? (
              <div className="p-5">
                <div className="aspect-[16/9] overflow-hidden rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface-muted)]">
                  <img src={post.cover_image_url} alt={post.title} className="h-full w-full object-cover" />
                </div>
                <a
                  href={post.cover_image_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-sm font-semibold text-[var(--mt-primary)] hover:underline"
                >
                  Abrir imagem
                </a>
              </div>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  );
}
