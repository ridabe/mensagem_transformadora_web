import Link from "next/link";
import { redirect } from "next/navigation";

import { requireLeader } from "@/lib/auth/profiles";
import { createClient } from "@/lib/supabase/server";
import { CopyShareCodeButton } from "../../copy-share-code-button";

type RouteParams = { params: Promise<{ id: string }> };

type PreSermonStatus = "draft" | "active" | "archived";

type PreSermonRow = {
  id: string;
  leader_id: string;
  share_code: string;
  title: string;
  main_verse: string;
  secondary_verses: unknown;
  notes: string | null;
  status: PreSermonStatus | string;
  created_at: string;
  updated_at: string;
};

function getFormString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseStatus(value: string): "draft" | "active" {
  return value === "draft" ? "draft" : "active";
}

function parseSecondaryVerses(value: string): string[] | null {
  const lines = value
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.length ? lines : null;
}

function stringifySecondaryVerses(value: unknown): string {
  if (!value) return "";
  if (Array.isArray(value)) {
    const out = value
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean);
    return out.join("\n");
  }
  return "";
}

function extractMissingEnvFromError(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const message = "message" in err && typeof err.message === "string" ? err.message : "";
  const match = message.match(/Variável de ambiente ausente:\s*(.+)$/);
  return match?.[1]?.trim() ? match[1].trim() : null;
}

export async function updatePreSermonAction(formData: FormData) {
  "use server";

  try {
    await createClient();
  } catch (err) {
    const missing = extractMissingEnvFromError(err);
    const url = missing
      ? `/login?error=config&missing=${encodeURIComponent(missing)}`
      : "/login?error=config";
    redirect(url);
  }

  const profile = await requireLeader();

  const id = getFormString(formData, "id").trim();
  if (!id) redirect("/lider/sermoes?error=id");

  const title = normalizeOptionalText(getFormString(formData, "title"));
  const mainVerse = normalizeOptionalText(getFormString(formData, "main_verse"));
  const notes = normalizeOptionalText(getFormString(formData, "notes"));
  const status = parseStatus(getFormString(formData, "status"));
  const secondaryVerses = parseSecondaryVerses(getFormString(formData, "secondary_verses"));

  if (!title) redirect(`/lider/sermoes/${encodeURIComponent(id)}/editar?error=title`);
  if (!mainVerse) redirect(`/lider/sermoes/${encodeURIComponent(id)}/editar?error=main_verse`);

  const supabase = await createClient();
  const { error } = await supabase
    .from("pre_sermons")
    .update({
      title,
      main_verse: mainVerse,
      secondary_verses: secondaryVerses,
      notes,
      status,
    })
    .eq("id", id)
    .eq("leader_id", profile.authUserId);

  if (error) redirect(`/lider/sermoes/${encodeURIComponent(id)}/editar?error=update`);
  redirect(`/lider/sermoes/${encodeURIComponent(id)}/editar?saved=1`);
}

export async function archivePreSermonFromEditAction(formData: FormData) {
  "use server";

  try {
    await createClient();
  } catch (err) {
    const missing = extractMissingEnvFromError(err);
    const url = missing
      ? `/login?error=config&missing=${encodeURIComponent(missing)}`
      : "/login?error=config";
    redirect(url);
  }

  const profile = await requireLeader();
  const id = getFormString(formData, "id").trim();
  if (!id) redirect("/lider/sermoes?error=id");

  const supabase = await createClient();
  const { error } = await supabase
    .from("pre_sermons")
    .update({ status: "archived" })
    .eq("id", id)
    .eq("leader_id", profile.authUserId);

  if (error) redirect(`/lider/sermoes/${encodeURIComponent(id)}/editar?error=archive`);
  redirect("/lider/sermoes?archived=1");
}

type EditPageProps = RouteParams & {
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

export default async function LiderEditarSermoesPage({ params, searchParams }: EditPageProps) {
  const { id } = await params;
  const preSermonId = id?.trim();
  if (!preSermonId) redirect("/lider/sermoes");

  const sp = searchParams ? await searchParams : undefined;
  const error = getString(sp, "error");
  const saved = getString(sp, "saved");

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

  const profile = await requireLeader();
  const supabase = await createClient();

  const { data, error: loadError } = await supabase
    .from("pre_sermons")
    .select(
      "id,leader_id,share_code,title,main_verse,secondary_verses,notes,status,created_at,updated_at",
    )
    .eq("id", preSermonId)
    .eq("leader_id", profile.authUserId)
    .maybeSingle();

  if (loadError) {
    return (
      <main className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-lg font-semibold tracking-tight">Pré-sermão</h2>
        <p className="mt-2 text-sm text-[var(--mt-muted)]">
          Não foi possível carregar o pré-sermão.
        </p>
      </main>
    );
  }

  const row = data as PreSermonRow | null;
  if (!row?.id) redirect("/lider/sermoes?error=notfound");

  const status = typeof row.status === "string" ? row.status : "active";
  const isArchived = status === "archived";

  const errorMessage =
    error === "title"
      ? "O título é obrigatório."
      : error === "main_verse"
        ? "O versículo principal é obrigatório."
        : error === "update"
          ? "Não foi possível salvar as alterações."
          : error === "archive"
            ? "Não foi possível arquivar o pré-sermão."
            : null;

  const infoMessage = saved === "1" ? "Alterações salvas." : null;

  const secondaryVersesText = stringifySecondaryVerses(row.secondary_verses);

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-[var(--mt-muted)]">Área do líder • Pré-sermões</p>
        <h2 className="text-2xl font-semibold tracking-tight">Editar pré-sermão</h2>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold">{row.share_code}</span>
          <CopyShareCodeButton code={row.share_code} />
          {isArchived ? (
            <span className="rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 py-2 text-sm font-semibold text-[var(--mt-muted)]">
              Arquivado
            </span>
          ) : null}
        </div>
      </header>

      {infoMessage ? (
        <div className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-4 text-sm text-[var(--mt-text)]">
          {infoMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-4 text-sm text-[var(--mt-text)]">
          {errorMessage}
        </div>
      ) : null}

      <form
        action={updatePreSermonAction}
        className="flex flex-col gap-4 rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6"
      >
        <input type="hidden" name="id" value={row.id} />

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">Título</span>
          <input
            name="title"
            required
            defaultValue={row.title}
            disabled={isArchived}
            className="h-11 rounded-xl border border-[var(--mt-border)] bg-transparent px-4 outline-none ring-[var(--mt-navy)] focus:ring-2 disabled:opacity-60"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">Versículo principal</span>
          <input
            name="main_verse"
            required
            defaultValue={row.main_verse}
            disabled={isArchived}
            className="h-11 rounded-xl border border-[var(--mt-border)] bg-transparent px-4 outline-none ring-[var(--mt-navy)] focus:ring-2 disabled:opacity-60"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">Versículos secundários (opcional)</span>
          <textarea
            name="secondary_verses"
            rows={4}
            defaultValue={secondaryVersesText}
            disabled={isArchived}
            className="rounded-xl border border-[var(--mt-border)] bg-transparent px-4 py-3 text-sm outline-none ring-[var(--mt-navy)] focus:ring-2 disabled:opacity-60"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">Notas (opcional)</span>
          <textarea
            name="notes"
            rows={6}
            defaultValue={row.notes ?? ""}
            disabled={isArchived}
            className="rounded-xl border border-[var(--mt-border)] bg-transparent px-4 py-3 text-sm outline-none ring-[var(--mt-navy)] focus:ring-2 disabled:opacity-60"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">Status</span>
          <select
            name="status"
            defaultValue={status === "draft" ? "draft" : "active"}
            disabled={isArchived}
            className="h-11 rounded-xl border border-[var(--mt-border)] bg-transparent px-4 text-sm outline-none ring-[var(--mt-navy)] focus:ring-2 disabled:opacity-60"
          >
            <option value="draft">Rascunho</option>
            <option value="active">Ativo</option>
          </select>
        </label>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          {!isArchived ? (
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mt-navy)] px-5 text-sm font-semibold text-white hover:opacity-95"
            >
              Salvar
            </button>
          ) : null}

          <Link
            href="/lider/sermoes"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-5 text-sm font-semibold text-[var(--mt-text)] hover:bg-black/5 dark:hover:bg-white/5"
          >
            Voltar
          </Link>

          {!isArchived ? (
            <button
              type="submit"
              formAction={archivePreSermonFromEditAction}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-5 text-sm font-semibold text-[var(--mt-text)] hover:bg-black/5 dark:hover:bg-white/5"
            >
              Arquivar
            </button>
          ) : null}
        </div>
      </form>
    </main>
  );
}
