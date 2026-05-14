import { requireAdmin } from "@/lib/auth/profiles";
import { getAppSetting, setAppSetting } from "@/lib/app-settings";
import { redirect } from "next/navigation";

async function updateAiSettingsAction(formData: FormData) {
  "use server";
  await requireAdmin();
  const value = formData.get("ai_generation_free_enabled") === "true" ? "true" : "false";
  await setAppSetting("ai_generation_free_enabled", value);
  redirect("/admin/global/configuracoes?saved=1");
}

type ConfiguracoesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminGlobalConfiguracoesPage({ searchParams }: ConfiguracoesPageProps) {
  await requireAdmin();

  const sp = searchParams ? await searchParams : undefined;
  const saved = sp && typeof sp.saved === "string" && sp.saved === "1";

  const currentValue = await getAppSetting("ai_generation_free_enabled");
  const aiFreeEnabled = currentValue !== "false";

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight">Configurações globais</h2>
        <p className="text-sm text-[var(--mt-muted)]">Gerencie funcionalidades e comportamentos da plataforma.</p>
      </header>

      {saved ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
          Configurações salvas com sucesso.
        </div>
      ) : null}

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h3 className="font-semibold tracking-tight">Geração de mensagem via IA</h3>
        <p className="mt-1 text-sm text-[var(--mt-muted)]">
          Controle o acesso dos usuários do plano gratuito à funcionalidade de geração de sermão
          com Inteligência Artificial. Usuários de planos pagos sempre têm acesso.
        </p>

        <form action={updateAiSettingsAction} className="mt-6 flex flex-col gap-4">
          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-medium">Acesso para plano gratuito (free)</legend>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--mt-border)] p-4 transition-colors has-[:checked]:border-[var(--mt-navy)] has-[:checked]:bg-[var(--mt-navy)]/5">
              <input
                type="radio"
                name="ai_generation_free_enabled"
                value="true"
                defaultChecked={aiFreeEnabled}
                className="mt-0.5 accent-[var(--mt-navy)]"
              />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold">Liberado</span>
                <span className="text-xs text-[var(--mt-muted)]">
                  Todos os usuários, incluindo o plano gratuito, podem gerar mensagens com IA.
                </span>
              </div>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--mt-border)] p-4 transition-colors has-[:checked]:border-[var(--mt-navy)] has-[:checked]:bg-[var(--mt-navy)]/5">
              <input
                type="radio"
                name="ai_generation_free_enabled"
                value="false"
                defaultChecked={!aiFreeEnabled}
                className="mt-0.5 accent-[var(--mt-navy)]"
              />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold">Bloqueado para plano gratuito</span>
                <span className="text-xs text-[var(--mt-muted)]">
                  Apenas usuários com plano pago ativo (Básico ou Pro) podem gerar mensagens com IA.
                  Usuários free verão uma mensagem de upgrade.
                </span>
              </div>
            </label>
          </fieldset>

          <div>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--mt-navy)] px-5 text-sm font-semibold text-white hover:opacity-95"
            >
              Salvar configurações
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
