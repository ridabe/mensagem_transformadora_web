import Link from "next/link";
import { redirect } from "next/navigation";

import { requireLeader } from "@/lib/auth/profiles";
import { buildSlugCandidates } from "@/app/api/_shared/slug";
import { formatLeaderDisplayName } from "@/lib/format";
import { validatePreSermonContent } from "@/lib/moderation/badWords";
import { resolvePublicationChurch } from "@/lib/church";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
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
  full_sermon: string | null;
  published_sermon_id: string | null;
  published_slug: string | null;
  published_at: string | null;
  status: PreSermonStatus | string;
  created_at: string;
  updated_at: string;
};

function getFormString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getErrorText(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const message = "message" in err && typeof err.message === "string" ? err.message : null;
  const details = "details" in err && typeof err.details === "string" ? err.details : null;
  const hint = "hint" in err && typeof err.hint === "string" ? err.hint : null;
  return message ?? details ?? hint ?? null;
}

function isMissingColumnError(err: unknown, column: string): boolean {
  if (!err || typeof err !== "object") return false;
  const code = "code" in err && typeof err.code === "string" ? err.code : null;
  const text = (getErrorText(err) ?? "").toLowerCase();
  const c = column.toLowerCase();
  if (code === "42703" || code === "PGRST204") {
    return text.includes(c) && (text.includes("does not exist") || text.includes("not exist") || text.includes("unknown"));
  }
  return text.includes(c) && (text.includes("does not exist") || text.includes("not exist"));
}

function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function formatIsoDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildFinalSummary(input: { notes: string | null; fullSermon: string | null }): string | null {
  const notes = input.notes?.trim() ? input.notes.trim() : null;
  if (notes) return notes.length > 280 ? `${notes.slice(0, 277)}...` : notes;

  const full = input.fullSermon?.trim() ? input.fullSermon.trim() : null;
  if (!full) return null;
  const normalized = full.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  return normalized.length > 280 ? `${normalized.slice(0, 277)}...` : normalized;
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
  const fullSermon = normalizeOptionalText(getFormString(formData, "full_sermon"));
  const status = parseStatus(getFormString(formData, "status"));
  const secondaryVerses = parseSecondaryVerses(getFormString(formData, "secondary_verses"));

  if (!title) redirect(`/lider/sermoes/${encodeURIComponent(id)}/editar?error=title`);
  if (!mainVerse) redirect(`/lider/sermoes/${encodeURIComponent(id)}/editar?error=main_verse`);

  const supabase = await createClient();
  const basePatch = {
    title,
    main_verse: mainVerse,
    secondary_verses: secondaryVerses,
    notes,
    status,
  };

  let result = await supabase
    .from("pre_sermons")
    .update(fullSermon ? { ...basePatch, full_sermon: fullSermon } : basePatch)
    .eq("id", id)
    .eq("leader_id", profile.authUserId);

  if (result.error && fullSermon && isMissingColumnError(result.error, "full_sermon")) {
    result = await supabase
      .from("pre_sermons")
      .update(basePatch)
      .eq("id", id)
      .eq("leader_id", profile.authUserId);
  }

  if (result.error) redirect(`/lider/sermoes/${encodeURIComponent(id)}/editar?error=update`);
  redirect(`/lider/sermoes/${encodeURIComponent(id)}/editar?saved=1`);
}

export async function publishPreSermonAction(formData: FormData) {
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
  const { data: preData, error: preError } = await supabase
    .from("pre_sermons")
    .select(
      "id,leader_id,share_code,title,main_verse,secondary_verses,notes,full_sermon,published_sermon_id,published_slug,published_at,status,created_at,updated_at,church_id",
    )
    .eq("id", id)
    .eq("leader_id", profile.authUserId)
    .maybeSingle();

  if (preError || !preData?.id) {
    if (preError && isMissingColumnError(preError, "full_sermon")) {
      redirect(
        `/lider/sermoes/${encodeURIComponent(id)}/editar?error=full_sermon&reason=${encodeURIComponent(
          "Banco de dados desatualizado para publicar. Aplique a migração de pre_sermons e tente novamente.",
        )}`,
      );
    }
    redirect(`/lider/sermoes/${encodeURIComponent(id)}/editar?error=publish_load`);
  }

  const row = preData as PreSermonRow & { church_id?: string | null };
  const alreadyPublished = Boolean(getString(row.published_slug) || getString(row.published_sermon_id));
  if (alreadyPublished) redirect(`/lider/sermoes/${encodeURIComponent(id)}/editar?published=1`);

  const fullSermon = getString(row.full_sermon);
  if (!fullSermon) redirect(`/lider/sermoes/${encodeURIComponent(id)}/editar?error=full_sermon`);

  const rawChurchId = typeof row.church_id === "string" ? row.church_id : null;
  const churchMeta = await resolvePublicationChurch(rawChurchId);
  const churchId = churchMeta?.churchId ?? null;
  const churchName = churchMeta?.churchName ?? "Igreja";
  const sermonDate = formatIsoDateOnly(new Date());
  const finalSummary = buildFinalSummary({ notes: row.notes, fullSermon });
  const leaderDisplayName = formatLeaderDisplayName(profile.ministryTitle, profile.name) || profile.name;

  const moderation = validatePreSermonContent({
    title: row.title,
    main_verse: row.main_verse,
    secondary_verses: Array.isArray(row.secondary_verses) ? row.secondary_verses : [],
    notes: row.notes ?? "",
    full_sermon: fullSermon,
    final_summary: finalSummary ?? "",
  });

  if (!moderation.valid) {
    const blockedFields = moderation.blockedFields.length ? moderation.blockedFields.join(",") : "";
    redirect(
      `/lider/sermoes/${encodeURIComponent(id)}/editar?error=moderation&blockedFields=${encodeURIComponent(blockedFields)}`,
    );
  }

  const candidates = buildSlugCandidates(row.title);
  let created: { id: string; slug: string } | null = null;

  for (const slug of candidates) {
    const payload = {
      user_id: profile.authUserId,
      local_sermon_id: null,
      user_name: leaderDisplayName,
      preacher_name: leaderDisplayName,
      church_id: churchId,
      church_name: churchName,
      sermon_date: sermonDate,
      sermon_time: null,
      sermon_title: row.title,
      slug,
      main_verse: row.main_verse,
      secondary_verses: Array.isArray(row.secondary_verses) ? row.secondary_verses : [],
      introduction: fullSermon,
      key_points: [],
      highlighted_phrases: [],
      personal_observations: null,
      practical_applications: null,
      conclusion: null,
      final_summary: finalSummary,
      visibility: "public",
      status: "published",
      source: "web_admin",
      published_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("published_sermons")
      .insert(payload)
      .select("id,slug")
      .single();

    if (!error && data?.id && data?.slug) {
      created = { id: String(data.id), slug: String(data.slug) };
      break;
    }
  }

  if (!created) redirect(`/lider/sermoes/${encodeURIComponent(id)}/editar?error=publish_create`);

  await supabase
    .from("pre_sermons")
    .update({
      published_sermon_id: created.id,
      published_slug: created.slug,
      published_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("leader_id", profile.authUserId);

  redirect(`/mensagens/${encodeURIComponent(created.slug)}`);
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

function getSearchParam(
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
  const error = getSearchParam(sp, "error");
  const saved = getSearchParam(sp, "saved");
  const created = getSearchParam(sp, "created");
  const warning = getSearchParam(sp, "warning");
  const blockedFieldsRaw = getSearchParam(sp, "blockedFields") ?? "";
  const blockedFields = new Set(
    blockedFieldsRaw
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
  );

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

  let dbOutdated = false;
  let load = await supabase
    .from("pre_sermons")
    .select(
      "id,leader_id,share_code,title,main_verse,secondary_verses,notes,full_sermon,published_sermon_id,published_slug,published_at,status,created_at,updated_at",
    )
    .eq("id", preSermonId)
    .eq("leader_id", profile.authUserId)
    .maybeSingle();

  if (load.error && isMissingColumnError(load.error, "full_sermon")) {
    dbOutdated = true;
    load = await supabase
      .from("pre_sermons")
      .select("id,leader_id,share_code,title,main_verse,secondary_verses,notes,status,created_at,updated_at")
      .eq("id", preSermonId)
      .eq("leader_id", profile.authUserId)
      .maybeSingle();
  }

  if (load.error) {
    return (
      <main className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-lg font-semibold tracking-tight">Pré-sermão</h2>
        <p className="mt-2 text-sm text-[var(--mt-muted)]">
          Não foi possível carregar o pré-sermão.
        </p>
      </main>
    );
  }

  const row = (load.data
    ? ({
        ...(load.data as Record<string, unknown>),
        full_sermon: dbOutdated ? null : (load.data as Record<string, unknown>).full_sermon ?? null,
        published_sermon_id: dbOutdated ? null : (load.data as Record<string, unknown>).published_sermon_id ?? null,
        published_slug: dbOutdated ? null : (load.data as Record<string, unknown>).published_slug ?? null,
        published_at: dbOutdated ? null : (load.data as Record<string, unknown>).published_at ?? null,
      } satisfies Record<string, unknown>)
    : null) as PreSermonRow | null;
  if (!row?.id) redirect("/lider/sermoes?error=notfound");

  const status = typeof row.status === "string" ? row.status : "active";
  const isArchived = status === "archived";

  const errorMessage =
    error === "title"
      ? "O título é obrigatório."
      : error === "main_verse"
        ? "O versículo principal é obrigatório."
        : error === "full_sermon"
          ? getSearchParam(sp, "reason")?.trim() || "Para publicar no site, preencha a mensagem completa."
        : error === "update"
          ? "Não foi possível salvar as alterações."
          : error === "archive"
            ? "Não foi possível arquivar o pré-sermão."
            : error === "publish_load"
              ? "Não foi possível preparar a publicação."
              : error === "publish_create"
                ? "Não foi possível publicar o sermão no site."
                : error === "moderation"
                  ? "Encontramos termos inadequados em alguns campos do pré-sermão. Revise o conteúdo antes de publicar."
            : null;

  const infoMessage =
    created === "1"
      ? "Pré-sermão criado. Copie o ID único para compartilhar e, se quiser, publique no site."
      : warning
        ? warning
      : saved === "1"
        ? "Alterações salvas."
        : null;

  const secondaryVersesText = stringifySecondaryVerses(row.secondary_verses);
  const publishedSlug = getString(row.published_slug);
  const fieldClass = (isBlocked: boolean, base: string) =>
    isBlocked ? `${base} border-red-500 ring-red-500 focus:ring-2` : base;

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-[var(--mt-muted)]">Área do líder • Pré-sermões</p>
        <h2 className="text-2xl font-semibold tracking-tight">Editar pré-sermão</h2>
        <p className="text-sm leading-6 text-[var(--mt-muted)]">
          Crie aqui o esboço do sermão e disponibilize para o membro da igreja compartilhando o ID
          único. Ele receberá no celular o título, o nome do pregador, o versículo principal e os
          versículos secundários. Caso você deseje inserir toda a mensagem aqui, poderá clicar em
          Publicar e, então, seu sermão irá para nossa página principal para que todos tenham acesso
          à Palavra de forma completa.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold">{row.share_code}</span>
          <CopyShareCodeButton code={row.share_code} />
          {!isArchived ? (
            publishedSlug ? (
              <Link
                href={`/mensagens/${encodeURIComponent(publishedSlug)}`}
                className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white shadow-md transition hover:-translate-y-[1px] hover:shadow-lg [background:var(--mt-gradient-gold)]"
              >
                Abrir no site
              </Link>
            ) : (
              <form action={publishPreSermonAction}>
                <input type="hidden" name="id" value={row.id} />
                <button
                  type="submit"
                  disabled={dbOutdated}
                  className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white shadow-md transition hover:-translate-y-[1px] hover:shadow-lg [background:var(--mt-gradient-gold)]"
                >
                  Publicar
                </button>
              </form>
            )
          ) : null}
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
            className={fieldClass(
              blockedFields.has("title"),
              "h-11 rounded-xl border border-[var(--mt-border)] bg-transparent px-4 outline-none ring-[var(--mt-navy)] focus:ring-2 disabled:opacity-60",
            )}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">Versículo principal</span>
          <input
            name="main_verse"
            required
            defaultValue={row.main_verse}
            disabled={isArchived}
            className={fieldClass(
              blockedFields.has("main_verse"),
              "h-11 rounded-xl border border-[var(--mt-border)] bg-transparent px-4 outline-none ring-[var(--mt-navy)] focus:ring-2 disabled:opacity-60",
            )}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">Versículos secundários (opcional)</span>
          <textarea
            name="secondary_verses"
            rows={4}
            defaultValue={secondaryVersesText}
            disabled={isArchived}
            className={fieldClass(
              blockedFields.has("secondary_verses"),
              "rounded-xl border border-[var(--mt-border)] bg-transparent px-4 py-3 text-sm outline-none ring-[var(--mt-navy)] focus:ring-2 disabled:opacity-60",
            )}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">Notas (opcional)</span>
          <textarea
            name="notes"
            rows={6}
            defaultValue={row.notes ?? ""}
            disabled={isArchived}
            className={fieldClass(
              blockedFields.has("notes"),
              "rounded-xl border border-[var(--mt-border)] bg-transparent px-4 py-3 text-sm outline-none ring-[var(--mt-navy)] focus:ring-2 disabled:opacity-60",
            )}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">Mensagem completa (opcional)</span>
          <textarea
            name="full_sermon"
            rows={12}
            defaultValue={row.full_sermon ?? ""}
            disabled={isArchived}
            className={fieldClass(
              blockedFields.has("full_sermon"),
              "rounded-xl border border-[var(--mt-border)] bg-transparent px-4 py-3 text-sm outline-none ring-[var(--mt-navy)] focus:ring-2 disabled:opacity-60",
            )}
            placeholder="Digite aqui a mensagem completa para publicar no site (opcional)."
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
