import Link from "next/link";
import { redirect } from "next/navigation";

import { canCreatePreSermon, requireLeader } from "@/lib/auth/profiles";
import { createClient } from "@/lib/supabase/server";

type PreSermonStatus = "draft" | "active";

function getFormString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseStatus(value: string): PreSermonStatus {
  return value === "draft" ? "draft" : "active";
}

function parseSecondaryVerses(value: string): string[] | null {
  const lines = value
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.length ? lines : null;
}

function extractMissingEnvFromError(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const message = "message" in err && typeof err.message === "string" ? err.message : "";
  const match = message.match(/Variável de ambiente ausente:\s*(.+)$/);
  return match?.[1]?.trim() ? match[1].trim() : null;
}

export async function createPreSermonAction(formData: FormData) {
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
  const allowed = await canCreatePreSermon(profile.authUserId);
  if (!allowed) redirect("/lider/assinatura?error=upgrade");

  const title = normalizeOptionalText(getFormString(formData, "title"));
  const mainVerse = normalizeOptionalText(getFormString(formData, "main_verse"));
  const notes = normalizeOptionalText(getFormString(formData, "notes"));
  const status = parseStatus(getFormString(formData, "status"));
  const secondaryVerses = parseSecondaryVerses(getFormString(formData, "secondary_verses"));

  if (!title) redirect("/lider/sermoes/novo?error=title");
  if (!mainVerse) redirect("/lider/sermoes/novo?error=main_verse");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pre_sermons")
    .insert({
      leader_id: profile.authUserId,
      church_id: profile.churchId,
      title,
      main_verse: mainVerse,
      secondary_verses: secondaryVerses,
      notes,
      status,
    })
    .select("id,share_code")
    .single();

  if (error || !data?.id) redirect("/lider/sermoes/novo?error=create");

  const code = typeof data.share_code === "string" ? data.share_code : "";
  redirect(`/lider/sermoes?saved=1&code=${encodeURIComponent(code)}`);
}

type LiderNovoSermoesPageProps = {
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

export default async function LiderNovoSermoesPage({ searchParams }: LiderNovoSermoesPageProps) {
  const sp = searchParams ? await searchParams : undefined;
  const error = getString(sp, "error");

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

  await requireLeader();

  const errorMessage =
    error === "title"
      ? "O título é obrigatório."
      : error === "main_verse"
        ? "O versículo principal é obrigatório."
        : error === "create"
          ? "Não foi possível criar o pré-sermão."
          : null;

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-[var(--mt-muted)]">Área do líder • Pré-sermões</p>
        <h2 className="text-2xl font-semibold tracking-tight">Novo pré-sermão</h2>
        <p className="text-sm leading-6 text-[var(--mt-muted)]">
          O código MT-XXXXX é gerado automaticamente após salvar.
        </p>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-4 text-sm text-[var(--mt-text)]">
          {errorMessage}
        </div>
      ) : null}

      <form
        action={createPreSermonAction}
        className="flex flex-col gap-4 rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6"
      >
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">Título</span>
          <input
            name="title"
            required
            className="h-11 rounded-xl border border-[var(--mt-border)] bg-transparent px-4 outline-none ring-[var(--mt-navy)] focus:ring-2"
            placeholder="Ex: Série sobre fé — Parte 1"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">Versículo principal</span>
          <input
            name="main_verse"
            required
            className="h-11 rounded-xl border border-[var(--mt-border)] bg-transparent px-4 outline-none ring-[var(--mt-navy)] focus:ring-2"
            placeholder="Ex: João 3:16"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">Versículos secundários (opcional)</span>
          <textarea
            name="secondary_verses"
            rows={4}
            className="rounded-xl border border-[var(--mt-border)] bg-transparent px-4 py-3 text-sm outline-none ring-[var(--mt-navy)] focus:ring-2"
            placeholder={"Um por linha\nEx: Romanos 8:28\nEx: Salmos 23:1"}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">Notas (opcional)</span>
          <textarea
            name="notes"
            rows={6}
            className="rounded-xl border border-[var(--mt-border)] bg-transparent px-4 py-3 text-sm outline-none ring-[var(--mt-navy)] focus:ring-2"
            placeholder="Rascunho, ideias, estrutura…"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">Status</span>
          <select
            name="status"
            defaultValue="active"
            className="h-11 rounded-xl border border-[var(--mt-border)] bg-transparent px-4 text-sm outline-none ring-[var(--mt-navy)] focus:ring-2"
          >
            <option value="draft">Rascunho</option>
            <option value="active">Ativo</option>
          </select>
        </label>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mt-navy)] px-5 text-sm font-semibold text-white hover:opacity-95"
          >
            Salvar
          </button>
          <Link
            href="/lider/sermoes"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-5 text-sm font-semibold text-[var(--mt-text)] hover:bg-black/5 dark:hover:bg-white/5"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </main>
  );
}

