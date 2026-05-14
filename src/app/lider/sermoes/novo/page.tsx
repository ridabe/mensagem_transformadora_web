import { redirect } from "next/navigation";

import { canCreatePreSermon, getCurrentSubscription, requireLeader } from "@/lib/auth/profiles";
import { isAiGenerationEnabledForFree } from "@/lib/app-settings";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { SermonForm } from "./_components/SermonForm";

type PreSermonStatus = "draft" | "active";

function getFormString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toShareCode(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function parseStatus(value: string): PreSermonStatus {
  return value === "draft" ? "draft" : "active";
}

function extractMissingEnvFromError(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const message = "message" in err && typeof err.message === "string" ? err.message : "";
  const match = message.match(/Variável de ambiente ausente:\s*(.+)$/);
  return match?.[1]?.trim() ? match[1].trim() : null;
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

function getPreSermonLimitMessage(sp: Record<string, string | string[] | undefined> | undefined): string | null {
  const raw = getString(sp, "reason")?.trim() ?? "";
  return raw ? raw : null;
}

function getCreateErrorMessage(sp: Record<string, string | string[] | undefined> | undefined): string | null {
  const raw = getString(sp, "reason")?.trim() ?? "";
  return raw ? raw : null;
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
  const permission = await canCreatePreSermon(profile.authUserId);
  if (!permission.allowed) {
    const msg =
      "errorMessage" in permission && typeof permission.errorMessage === "string"
        ? permission.errorMessage
        : "Não foi possível criar o pré-sermão agora.";
    redirect(`/lider/sermoes/novo?error=limit&reason=${encodeURIComponent(msg)}`);
  }

  const title = normalizeOptionalText(getFormString(formData, "title"));
  const mainVerse = normalizeOptionalText(getFormString(formData, "main_verse"));
  const notes = normalizeOptionalText(getFormString(formData, "notes"));
  const fullSermon = normalizeOptionalText(getFormString(formData, "full_sermon"));
  const status = parseStatus(getFormString(formData, "status"));
  const secondaryVerses = formData.getAll("secondary_verses").map(String).filter(Boolean) || null;

  if (!title) redirect("/lider/sermoes/novo?error=title");
  if (!mainVerse) redirect("/lider/sermoes/novo?error=main_verse");

  const supabase = await createClient();
  const basePayload = {
    leader_id: profile.authUserId,
    church_id: profile.churchId,
    title,
    main_verse: mainVerse,
    secondary_verses: secondaryVerses,
    notes,
    status,
  };

  const payload = fullSermon ? { ...basePayload, full_sermon: fullSermon } : basePayload;

  let insert = await supabase.from("pre_sermons").insert(payload).select("id,share_code").single();
  if (insert.error && fullSermon && isMissingColumnError(insert.error, "full_sermon")) {
    insert = await supabase.from("pre_sermons").insert(basePayload).select("id,share_code").single();
    if (!insert.error && insert.data?.id) {
      redirect(
        `/lider/sermoes/${encodeURIComponent(String(insert.data.id))}/editar?created=1&code=${encodeURIComponent(
          toShareCode(insert.data.share_code),
        )}&warning=${encodeURIComponent(
          "Sua mensagem foi salva, mas o banco ainda não está atualizado para armazenar a mensagem completa.",
        )}`,
      );
    }
  }

  if (insert.error || !insert.data?.id) {
    console.error("[pre_sermons INSERT error]", {
      code: insert.error?.code,
      message: insert.error?.message,
      details: insert.error?.details,
      hint: insert.error?.hint,
      leader_id: profile.authUserId,
      payload_keys: Object.keys(payload),
    });
    const details = getErrorText(insert.error) ?? "Não foi possível criar a mensagem.";
    redirect(`/lider/sermoes/novo?error=create&reason=${encodeURIComponent(details)}`);
  }

  const code = toShareCode(insert.data.share_code);
  redirect(
    `/lider/sermoes/${encodeURIComponent(String(insert.data.id))}/editar?created=1&code=${encodeURIComponent(code)}`,
  );
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
  const limitReason = getPreSermonLimitMessage(sp);
  const createReason = getCreateErrorMessage(sp);

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

  const service = createServiceRoleClient();
  const [subscription, aiFreeEnabled, profileOverride] = await Promise.all([
    getCurrentSubscription(profile.authUserId),
    isAiGenerationEnabledForFree(),
    service
      .from("profiles")
      .select("ai_sermon_enabled")
      .eq("id", profile.id)
      .maybeSingle<{ ai_sermon_enabled: boolean | null }>()
      .then((r) => r.data?.ai_sermon_enabled ?? null),
  ]);

  const isPaidActive =
    subscription.plan !== "free" &&
    (subscription.status === "active" || subscription.status === "trialing");

  const aiDisabledForFree =
    profileOverride === true
      ? false
      : profileOverride === false
        ? true
        : !isPaidActive && !aiFreeEnabled;

  const errorMessage =
    error === "title"
      ? "O título é obrigatório."
      : error === "main_verse"
        ? "O versículo principal é obrigatório."
        : error === "limit"
          ? limitReason ??
            "Seu plano atingiu o limite de pré-sermões neste ciclo. Seu ciclo será renovado automaticamente na próxima data de renovação ou você pode fazer upgrade agora."
          : error === "create"
            ? createReason ?? "Não foi possível criar a mensagem."
            : null;

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-[var(--mt-muted)]">Área do líder • Mensagens</p>
        <h2 className="text-2xl font-semibold tracking-tight">Crie a mensagem</h2>
        <p className="text-sm leading-6 text-[var(--mt-muted)]">
          Crie aqui o esboço do sermão e disponibilize para o membro da igreja compartilhando o ID
          único. Ele receberá no celular o título, o nome do pregador, o versículo principal e os
          versículos secundários. Caso você deseje inserir toda a mensagem aqui, poderá clicar em
          Publicar e, então, seu sermão irá para nossa página principal para que todos tenham acesso
          à Palavra de forma completa.
        </p>
      </header>

      <SermonForm
        action={createPreSermonAction}
        aiDisabledForFree={aiDisabledForFree}
        errorMessage={errorMessage}
      />
    </main>
  );
}
