import { createClient } from "@/lib/supabase/server";
import { requireLeader } from "@/lib/auth/profiles";

export default async function LiderAssinaturaPage() {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
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

  const { data } = await supabase
    .from("subscriptions")
    .select("plan,status,current_period_end")
    .eq("leader_id", profile.authUserId)
    .maybeSingle();

  const planRaw = data && typeof data.plan === "string" ? data.plan : "free";
  const planLabel = planRaw === "free" ? "Gratuito" : planRaw;

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-[var(--mt-muted)]">Área do líder • Assinatura</p>
        <h2 className="text-2xl font-semibold tracking-tight">Assinatura</h2>
      </header>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <p className="text-sm">
          Seu plano atual: <span className="font-semibold">{planLabel}</span>
        </p>
        <p className="mt-2 text-sm text-[var(--mt-muted)]">
          Em breve teremos planos com recursos avançados.
        </p>
      </section>
    </main>
  );
}
