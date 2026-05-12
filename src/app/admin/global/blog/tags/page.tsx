import Link from "next/link";

import { requireAdmin } from "@/lib/auth/profiles";
import {
  createBlogTagAction,
  deleteBlogTagAction,
  getBlogTags,
  updateBlogTagAction,
} from "@/app/admin/global/actions";
import { BlogAdminNav } from "@/app/admin/global/blog/_components/BlogAdminNav";

function getString(
  sp: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  const v = sp?.[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

function getErrorMessage(error: string): string {
  if (error === "name") return "Nome é obrigatório.";
  if (error === "slug") return "Slug é obrigatório.";
  if (error === "slug_taken") return "Slug já está em uso.";
  if (error === "confirm_delete") return "Para excluir, marque a confirmação.";
  if (error === "create") return "Não foi possível criar a tag.";
  if (error === "update") return "Não foi possível salvar a tag.";
  if (error === "delete") return "Não foi possível excluir a tag.";
  if (error === "invalid") return "Dados inválidos.";
  return "";
}

export default async function AdminGlobalBlogTagsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();

  const sp = searchParams ? await searchParams : undefined;
  const saved = getString(sp, "saved") === "1";
  const error = getString(sp, "error")?.trim() ?? "";
  const editId = getString(sp, "id")?.trim() ?? "";

  const tags = await getBlogTags().catch(() => []);
  const editing = editId ? tags.find((t) => t.id === editId) ?? null : null;

  const errorMessage = error ? getErrorMessage(error) : "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Blog</h2>
          <p className="text-sm text-[var(--mt-muted)]">Tags</p>
        </div>
      </div>

      <BlogAdminNav />

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

      <form
        action={editing ? updateBlogTagAction : createBlogTagAction}
        className="flex flex-col gap-4 rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6"
      >
        {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">Nome</label>
            <input
              name="name"
              defaultValue={editing?.name ?? ""}
              className="h-11 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">Slug</label>
            <input
              name="slug"
              defaultValue={editing?.slug ?? ""}
              placeholder="Ex.: esperanca, paz"
              className="h-11 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
            />
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          {editing ? (
            <Link
              href="/admin/global/blog/tags"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-5 text-sm font-semibold text-[var(--mt-text)] hover:bg-[var(--mt-surface-elevated)]"
            >
              Cancelar
            </Link>
          ) : null}
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mt-primary)] px-5 text-sm font-semibold text-white hover:opacity-90"
          >
            {editing ? "Salvar tag" : "Criar tag"}
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)]">
        {tags.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-[var(--mt-muted)]">Nenhuma tag cadastrada ainda</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--mt-border)] bg-[var(--mt-background)]">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-[var(--mt-text)]">Nome</th>
                <th className="px-6 py-3 text-left font-semibold text-[var(--mt-text)]">Slug</th>
                <th className="px-6 py-3 text-left font-semibold text-[var(--mt-text)]">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--mt-border)]">
              {tags.map((t) => (
                <tr key={t.id} className="hover:bg-[var(--mt-background)]">
                  <td className="px-6 py-4 font-semibold text-[var(--mt-text)]">{t.name}</td>
                  <td className="px-6 py-4 text-[var(--mt-muted)]">{t.slug}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Link
                        href={`/admin/global/blog/tags?id=${encodeURIComponent(t.id)}`}
                        className="font-semibold text-[var(--mt-primary)] hover:underline"
                      >
                        Editar
                      </Link>
                      <form action={deleteBlogTagAction} className="flex items-center gap-3">
                        <input type="hidden" name="id" value={t.id} />
                        <label className="inline-flex items-center gap-2 text-xs text-[var(--mt-muted)]">
                          <input type="checkbox" name="confirm_delete" value="1" className="h-4 w-4" />
                          Confirmar
                        </label>
                        <button type="submit" className="text-xs font-semibold text-rose-600 hover:underline">
                          Excluir
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {tags.length > 0 ? (
        <div className="rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-4 text-sm text-[var(--mt-muted)]">
          Total de {tags.length} tag{tags.length !== 1 ? "s" : ""}
        </div>
      ) : null}
    </div>
  );
}

