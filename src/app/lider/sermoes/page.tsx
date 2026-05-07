import Link from "next/link";
import { redirect } from "next/navigation";

import { formatPtBrDate, truncateText } from "@/lib/format";
import { requireLeader } from "@/lib/auth/profiles";
import { createClient } from "@/lib/supabase/server";
import { CopyShareCodeButton } from "./copy-share-code-button";

type PreSermonStatus = "draft" | "active" | "archived";

type PreSermonRow = {
  id: string;
  share_code: string;
  title: string;
  status: PreSermonStatus | string;
  created_at: string;
  updated_at: string;
};

type LiderSermoesPageProps = {
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

function getFormString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

function extractMissingEnvFromError(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const message = "message" in err && typeof err.message === "string" ? err.message : "";
  const match = message.match(/Variável de ambiente ausente:\s*(.+)$/);
  return match?.[1]?.trim() ? match[1].trim() : null;
}

export async function archivePreSermonAction(formData: FormData) {
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

  if (error) redirect("/lider/sermoes?error=archive");
  redirect("/lider/sermoes?archived=1");
}

export default async function LiderSermoesPage({ searchParams }: LiderSermoesPageProps) {
  const sp = searchParams ? await searchParams : undefined;
  const error = getString(sp, "error");
  const reason = getString(sp, "reason");
  const saved = getString(sp, "saved");
  const archived = getString(sp, "archived");
  const code = getString(sp, "code");

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

  const errorMessage =
    error === "id"
      ? "ID inválido."
      : error === "archive"
        ? "Não foi possível arquivar a mensagem."
        : error === "church_admin_not_allowed"
          ? reason?.trim() || "Esta opção só está disponível para líderes associados a uma igreja com Plano Business ativo."
        : null;

  const infoMessage =
    saved === "1"
      ? "Mensagem criada com sucesso."
      : archived === "1"
        ? "Mensagem arquivada."
        : null;

  const { data: rowsData, error: rowsError } = await supabase
    .from("pre_sermons")
    .select("id,share_code,title,status,created_at,updated_at")
    .eq("leader_id", profile.authUserId)
    .order("updated_at", { ascending: false });

  const rows: PreSermonRow[] = ((rowsData ?? []) as PreSermonRow[]).filter((r) => r?.id);

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-[var(--mt-muted)]">Área do líder • Mensagens</p>
        <h2 className="text-2xl font-semibold tracking-tight">Suas mensagens</h2>
        <p className="text-sm leading-6 text-[var(--mt-muted)]">
          Crie aqui o esboço do sermão e disponibilize para o membro da igreja compartilhando o ID
          único. Ele receberá no celular o título, o nome do pregador, o versículo principal e os
          versículos secundários. Caso você deseje inserir toda a mensagem aqui, poderá clicar em
          Publicar e, então, seu sermão irá para nossa página principal para que todos tenham acesso
          à Palavra de forma completa.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Link
            href="/lider/sermoes/novo"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mt-navy)] px-5 text-sm font-semibold text-white hover:opacity-95"
          >
            Crie a mensagem
          </Link>
        </div>
      </header>

      {infoMessage ? (
        <div className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-4 text-sm text-[var(--mt-text)]">
          <p>{infoMessage}</p>
          {typeof code === "string" && code.trim() ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold">{code.trim()}</span>
              <CopyShareCodeButton code={code.trim()} />
            </div>
          ) : null}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-4 text-sm text-[var(--mt-text)]">
          {errorMessage}
        </div>
      ) : null}

      {rowsError ? (
        <div className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
          <h2 className="text-lg font-semibold tracking-tight">Mensagens</h2>
          <p className="mt-2 text-sm text-[var(--mt-muted)]">
            Não foi possível carregar sua lista de mensagens.
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--mt-border)] bg-[var(--mt-surface)] p-8 text-center">
          <p className="text-sm font-medium">Nenhuma mensagem ainda</p>
          <p className="mt-2 text-sm text-[var(--mt-muted)]">
            Crie sua primeira mensagem para gerar um ID único compartilhável.
          </p>
          <div className="mt-5 flex justify-center">
            <Link
              href="/lider/sermoes/novo"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mt-navy)] px-5 text-sm font-semibold text-white hover:opacity-95"
            >
              Crie a mensagem
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)]">
          <div className="grid grid-cols-1 gap-0 divide-y divide-[var(--mt-border)]">
            {rows.map((r) => {
              const status = typeof r.status === "string" ? r.status : "active";
              const updatedAt = r.updated_at ? new Date(r.updated_at) : null;
              const updatedLabel = updatedAt ? formatPtBrDate(updatedAt) : null;

              return (
                <div
                  key={r.id}
                  className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[var(--mt-muted)]">
                      {r.share_code} • {status}
                      {updatedLabel ? ` • atualizado em ${updatedLabel}` : ""}
                    </p>
                    <p className="mt-1 truncate text-base font-semibold">
                      {truncateText(r.title, 80)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <CopyShareCodeButton code={r.share_code} />
                    {status !== "archived" ? (
                      <>
                        <Link
                          href={`/lider/sermoes/${encodeURIComponent(r.id)}/editar`}
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm font-semibold text-[var(--mt-text)] hover:bg-black/5 dark:hover:bg-white/5"
                        >
                          Editar
                        </Link>
                        <form action={archivePreSermonAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <button
                            type="submit"
                            className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm font-semibold text-[var(--mt-text)] hover:bg-black/5 dark:hover:bg-white/5"
                          >
                            Arquivar
                          </button>
                        </form>
                      </>
                    ) : (
                      <span className="rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 py-2 text-sm font-semibold text-[var(--mt-muted)]">
                        Arquivado
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}

