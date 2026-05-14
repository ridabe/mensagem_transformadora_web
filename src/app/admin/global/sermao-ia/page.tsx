import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/profiles";
import { getAppSetting } from "@/lib/app-settings";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getAllProfilesForAiManagement, type ProfileRowForAi } from "@/app/admin/global/actions";

async function setProfileAiSermonAction(formData: FormData) {
  "use server";
  await requireAdmin();

  const id = String(formData.get("profile_id") ?? "").trim();
  const raw = String(formData.get("ai_sermon_enabled") ?? "").trim();
  const value: boolean | null = raw === "true" ? true : raw === "false" ? false : null;

  if (!id) redirect("/admin/global/sermao-ia?error=invalid");

  const service = createServiceRoleClient();
  const { error } = await service
    .from("profiles")
    .update({ ai_sermon_enabled: value })
    .eq("id", id);

  if (error) redirect("/admin/global/sermao-ia?error=update");
  redirect("/admin/global/sermao-ia?saved=1");
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function RoleBadge({ role }: { role: string }) {
  const labels: Record<string, string> = {
    admin: "Admin",
    leader: "Líder",
    church_admin: "Admin Igreja",
  };
  const colors: Record<string, string> = {
    admin: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
    leader: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
    church_admin: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[role] ?? colors.leader}`}>
      {labels[role] ?? role}
    </span>
  );
}

function AiBadge({ value }: { value: boolean | null }) {
  if (value === true)
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
        Liberado
      </span>
    );
  if (value === false)
    return (
      <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
        Bloqueado
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
      Padrão
    </span>
  );
}

function aiSelectValue(v: boolean | null): string {
  if (v === true) return "true";
  if (v === false) return "false";
  return "";
}

export default async function SermonIaPage({ searchParams }: PageProps) {
  await requireAdmin();

  const sp = searchParams ? await searchParams : undefined;
  const search = typeof sp?.q === "string" ? sp.q.trim() : "";
  const saved = sp?.saved === "1";
  const error = typeof sp?.error === "string" ? sp.error : null;

  const globalSetting = await getAppSetting("ai_generation_free_enabled");
  const globalFreeEnabled = globalSetting !== "false";

  let profiles: ProfileRowForAi[] = [];
  try {
    profiles = await getAllProfilesForAiManagement(search || undefined);
  } catch {}

  const overrides = profiles.filter((p) => p.ai_sermon_enabled !== null);

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight">IA — Controle por Usuário</h2>
        <p className="text-sm text-[var(--mt-muted)]">
          Libere ou bloqueie o sermão automático por IA para usuários específicos, independente do plano ou da regra global.
        </p>
      </header>

      {saved && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
          Configuração salva com sucesso.
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
          Erro ao salvar. Tente novamente.
        </div>
      )}

      {/* Contexto global */}
      <section className="flex flex-col gap-3 rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">
            Regra global para plano gratuito:{" "}
            <span className={globalFreeEnabled ? "text-emerald-600" : "text-rose-600"}>
              {globalFreeEnabled ? "Liberado para todos" : "Bloqueado para free"}
            </span>
          </p>
          <p className="text-xs text-[var(--mt-muted)]">
            Overrides individuais: <strong>{overrides.length}</strong> usuário{overrides.length !== 1 ? "s" : ""}
          </p>
        </div>
        <a
          href="/admin/global/configuracoes"
          className="text-sm font-semibold text-[var(--mt-primary)] hover:underline"
        >
          Alterar regra global →
        </a>
      </section>

      {/* Busca */}
      <form method="GET" className="flex gap-2">
        <input
          name="q"
          defaultValue={search}
          placeholder="Buscar por nome ou e-mail..."
          className="h-10 flex-1 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm outline-none focus:border-[var(--mt-navy)] focus:ring-1 focus:ring-[var(--mt-navy)]"
        />
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--mt-navy)] px-5 text-sm font-semibold text-white hover:opacity-90"
        >
          Buscar
        </button>
        {search && (
          <a
            href="/admin/global/sermao-ia"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm font-semibold hover:bg-[var(--mt-background)]"
          >
            Limpar
          </a>
        )}
      </form>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)]">
        {profiles.length === 0 ? (
          <div className="p-10 text-center text-sm text-[var(--mt-muted)]">
            {search ? "Nenhum usuário encontrado para esta busca." : "Nenhum usuário cadastrado."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--mt-border)] bg-[var(--mt-background)]">
              <tr>
                <th className="px-5 py-3 text-left font-semibold text-[var(--mt-text)]">Usuário</th>
                <th className="px-5 py-3 text-left font-semibold text-[var(--mt-text)]">Função</th>
                <th className="px-5 py-3 text-left font-semibold text-[var(--mt-text)]">Acesso IA</th>
                <th className="px-5 py-3 text-left font-semibold text-[var(--mt-text)]">Alterar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--mt-border)]">
              {profiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-[var(--mt-background)]">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-[var(--mt-text)]">{profile.name}</p>
                    <p className="text-xs text-[var(--mt-muted)]">{profile.email}</p>
                  </td>
                  <td className="px-5 py-4">
                    <RoleBadge role={profile.role} />
                  </td>
                  <td className="px-5 py-4">
                    <AiBadge value={profile.ai_sermon_enabled} />
                  </td>
                  <td className="px-5 py-4">
                    <form action={setProfileAiSermonAction} className="flex items-center gap-2">
                      <input type="hidden" name="profile_id" value={profile.id} />
                      <select
                        name="ai_sermon_enabled"
                        defaultValue={aiSelectValue(profile.ai_sermon_enabled)}
                        className="h-9 rounded-lg border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-xs outline-none focus:border-[var(--mt-navy)]"
                      >
                        <option value="">Padrão (regra global)</option>
                        <option value="true">Liberado individualmente</option>
                        <option value="false">Bloqueado individualmente</option>
                      </select>
                      <button
                        type="submit"
                        className="inline-flex h-9 items-center rounded-lg border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-xs font-semibold hover:bg-[var(--mt-background)]"
                      >
                        Salvar
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {profiles.length > 0 && (
        <p className="text-xs text-[var(--mt-muted)]">
          {search
            ? `${profiles.length} resultado${profiles.length !== 1 ? "s" : ""} para "${search}"`
            : `${profiles.length} usuário${profiles.length !== 1 ? "s" : ""} no total`}
        </p>
      )}
    </main>
  );
}
