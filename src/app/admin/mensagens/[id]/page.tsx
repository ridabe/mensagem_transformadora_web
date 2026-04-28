import { redirect } from "next/navigation";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/profiles";

type AdminSermonEditPageProps = {
  params: Promise<{ id: string }>;
};

function getString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

function parseVisibility(value: string): "public" | "private" {
  return value === "private" ? "private" : "public";
}

function parseStatus(value: string): "draft" | "published" | "unpublished" | "archived" {
  if (value === "draft") return "draft";
  if (value === "unpublished") return "unpublished";
  if (value === "archived") return "archived";
  return "published";
}

function extractMissingEnvFromError(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const message = "message" in err && typeof err.message === "string" ? err.message : "";
  const match = message.match(/Variável de ambiente ausente:\s*(.+)$/);
  return match?.[1]?.trim() ? match[1].trim() : null;
}

export async function updateSermonAction(formData: FormData) {
  "use server";

  try {
    await createClient();
  } catch (err) {
    const missing = extractMissingEnvFromError(err);
    const url = missing
      ? `/admin/login?error=config&missing=${encodeURIComponent(missing)}`
      : "/admin/login?error=config";
    redirect(url);
  }

  await requireAdmin();

  const id = getString(formData, "id").trim();
  if (!id) redirect("/admin/mensagens");

  const sermonTitle = getString(formData, "sermon_title").trim();
  const mainVerse = getString(formData, "main_verse").trim();
  const finalSummaryRaw = getString(formData, "final_summary").trim();
  const visibility = parseVisibility(getString(formData, "visibility").trim());
  const status = parseStatus(getString(formData, "status").trim());

  const patch: Record<string, unknown> = {
    visibility,
    status,
  };

  if (sermonTitle) patch.sermon_title = sermonTitle;
  if (mainVerse) patch.main_verse = mainVerse;
  patch.final_summary = finalSummaryRaw ? finalSummaryRaw : null;

  const service = createServiceRoleClient();
  const { error } = await service
    .from("published_sermons")
    .update(patch)
    .eq("id", id);

  if (error) redirect(`/admin/mensagens/${id}?error=save`);
  redirect(`/admin/mensagens/${id}?saved=1`);
}

export async function deleteSermonAction(formData: FormData) {
  "use server";

  try {
    await createClient();
  } catch (err) {
    const missing = extractMissingEnvFromError(err);
    const url = missing
      ? `/admin/login?error=config&missing=${encodeURIComponent(missing)}`
      : "/admin/login?error=config";
    redirect(url);
  }

  await requireAdmin();

  const id = getString(formData, "id").trim();
  if (!id) redirect("/admin/mensagens");

  const service = createServiceRoleClient();
  const { error } = await service
    .from("published_sermons")
    .delete()
    .eq("id", id);

  if (error) redirect(`/admin/mensagens/${id}?error=delete`);
  redirect("/admin/mensagens?deleted=1");
}

export default async function AdminSermonEditPage({ params }: AdminSermonEditPageProps) {
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

  const { id } = await params;

  const service = createServiceRoleClient();
  const { data } = await service
    .from("published_sermons")
    .select("id,sermon_title,main_verse,final_summary,visibility,status,slug")
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    return (
      <main className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-lg font-semibold tracking-tight">Mensagem não encontrada</h2>
        <p className="mt-2 text-sm text-[var(--mt-muted)]">
          Verifique se o ID está correto.
        </p>
      </main>
    );
  }

  const title = typeof data.sermon_title === "string" ? data.sermon_title : "Mensagem";
  const mainVerse = typeof data.main_verse === "string" ? data.main_verse : "";
  const finalSummary = typeof data.final_summary === "string" ? data.final_summary : "";
  const visibility = typeof data.visibility === "string" ? data.visibility : "public";
  const status = typeof data.status === "string" ? data.status : "published";

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-[var(--mt-muted)]">Admin • Editar publicação</p>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm leading-6 text-[var(--mt-muted)]">
          Ajuste visibilidade e conteúdo público da mensagem.
        </p>
      </header>

      <form
        action={updateSermonAction}
        className="flex flex-col gap-4 rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6"
      >
        <input type="hidden" name="id" value={data.id} />

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">Título</span>
          <input
            type="text"
            name="sermon_title"
            defaultValue={title}
            className="h-11 w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">Versículo base</span>
          <input
            type="text"
            name="main_verse"
            defaultValue={mainVerse}
            className="h-11 w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">Resumo final</span>
          <textarea
            name="final_summary"
            defaultValue={finalSummary}
            rows={5}
            className="w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold">Visibilidade</span>
            <select
              name="visibility"
              defaultValue={visibility}
              className="h-11 w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
            >
              <option value="public">Pública</option>
              <option value="private">Privada</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold">Status</span>
            <select
              name="status"
              defaultValue={status}
              className="h-11 w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
            >
              <option value="published">Publicado</option>
              <option value="unpublished">Despublicado</option>
              <option value="draft">Rascunho</option>
              <option value="archived">Arquivado</option>
            </select>
          </label>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mt-navy)] px-5 text-sm font-semibold text-white hover:opacity-95"
            >
              Salvar
            </button>
            <a
              href={`/mensagens/${data.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-5 text-sm font-semibold text-[var(--mt-text)] hover:bg-black/5 dark:hover:bg-white/5"
            >
              Abrir público
            </a>
          </div>

          <button
            formAction={deleteSermonAction}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-red-500/40 bg-[var(--mt-surface)] px-5 text-sm font-semibold text-red-600 hover:bg-red-500/10 dark:text-red-400"
          >
            Excluir
          </button>
        </div>
      </form>
    </main>
  );
}
