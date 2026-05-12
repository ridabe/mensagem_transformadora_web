import Link from "next/link";

import { requireAdmin } from "@/lib/auth/profiles";
import { createBlogPostAction } from "@/app/admin/global/actions";
import { RichTextField } from "@/app/admin/global/blog/_components/RichTextField";
import { TitleSlugFields } from "@/app/admin/global/blog/_components/TitleSlugFields";

function getString(
  sp: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  const v = sp?.[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

export default async function AdminGlobalBlogNewPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();

  const sp = searchParams ? await searchParams : undefined;
  const error = getString(sp, "error")?.trim() ?? "";

  const errorMessage =
    error === "title"
      ? "Título é obrigatório."
      : error === "slug"
        ? "Slug é obrigatório."
        : error === "slug_taken"
          ? "Slug já está em uso."
          : error === "create"
            ? "Não foi possível criar o post."
            : "";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-5">
        <p className="text-sm text-[var(--mt-muted)]">Admin Global • Blog</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Novo post</h2>
          <Link href="/admin/global/blog" className="text-sm font-semibold text-[var(--mt-primary)] hover:underline">
            Voltar
          </Link>
        </div>
        <p className="text-sm leading-6 text-[var(--mt-muted)]">
          Crie um rascunho e publique quando estiver pronto. Apenas posts publicados aparecem em /blog.
        </p>
      </header>

      {errorMessage ? (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900/30 dark:bg-rose-900/10 dark:text-rose-200">
          {errorMessage}
        </div>
      ) : null}

      <form action={createBlogPostAction} className="flex flex-col gap-6 rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <TitleSlugFields />

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Autor</label>
          <input
            name="author_name"
            placeholder="Ex.: Ricardo Silva"
            className="h-11 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
          />
          <p className="text-xs text-[var(--mt-muted)]">Nome que aparece publicamente no post.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">Resumo</label>
            <textarea
              name="excerpt"
              rows={4}
              placeholder="Resumo curto que aparece na lista e nas redes sociais…"
              className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 py-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
            />
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold">Imagem de capa</label>
              <input
                type="file"
                accept="image/*"
                name="cover_image"
                className="rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 py-2 text-sm"
              />
              <p className="text-xs text-[var(--mt-muted)]">Será enviada para o bucket blog-covers.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold">Status</label>
                <select
                  name="status"
                  defaultValue="draft"
                  className="h-11 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
                >
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicado</option>
                  <option value="archived">Arquivado</option>
                </select>
              </div>

              <div className="flex items-end gap-3 rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface-elevated)] p-4">
                <input id="is_featured" type="checkbox" name="is_featured" value="1" className="h-4 w-4" />
                <label htmlFor="is_featured" className="text-sm font-semibold">
                  Post em destaque
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">Categorias (separadas por vírgula)</label>
            <input
              name="categories"
              placeholder="Ex.: fé, oração, discipulado"
              className="h-11 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">Tags (separadas por vírgula)</label>
            <input
              name="tags"
              placeholder="Ex.: esperança, propósito, paz"
              className="h-11 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">SEO title</label>
            <input
              name="seo_title"
              placeholder="Título para Google (opcional)"
              className="h-11 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">SEO description</label>
            <input
              name="seo_description"
              placeholder="Descrição para Google (opcional)"
              className="h-11 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Conteúdo</label>
          <RichTextField name="content" initialHtml="" placeholder="Escreva seu post..." minHeightClassName="min-h-[320px]" />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Link
            href="/admin/global/blog"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-5 text-sm font-semibold text-[var(--mt-text)] hover:bg-[var(--mt-surface-elevated)]"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mt-navy)] px-5 text-sm font-semibold text-white hover:opacity-95"
          >
            Criar post
          </button>
        </div>
      </form>
    </div>
  );
}

