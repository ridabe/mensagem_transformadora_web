import { createClient } from "@/lib/supabase/server";
import { getCurrentSubscription, getCurrentUsage, requireLeader } from "@/lib/auth/profiles";
import { formatPtBrDate } from "@/lib/format";
import { CreateCheckoutButton } from "./create-checkout-button";

type PlanRow = {
  code: string;
  name: string;
  description: string | null;
  price_in_cents: number;
  currency: string;
  billing_cycle: string;
  monthly_pre_sermon_limit: number | null;
  is_active: boolean;
};

/**
 * Normaliza o status retornado da assinatura para exibição/decisões.
 */
function normalizeSubscriptionStatus(value: string | null | undefined): string {
  return (value ?? "free").trim().toLowerCase() || "free";
}

/**
 * Formata um valor monetário em reais a partir de centavos.
 */
function formatPrice(priceInCents: number, currency: string): string {
  const value = Number.isFinite(priceInCents) ? priceInCents : 0;
  const currencyCode = currency?.trim() ? currency.trim() : "BRL";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currencyCode }).format(
    value / 100,
  );
}

/**
 * Determina a data "próxima renovação/cobrança" de forma robusta:
 * - para assinaturas pagas: prefere current_period_end
 * - para free ou fallback: usa o fim do ciclo calculado
 */
function getNextRenewalDate(input: {
  current_period_end: string | null;
  cycle_end: string | null;
}): Date | null {
  const raw = input.current_period_end?.trim() ? input.current_period_end : input.cycle_end;
  if (!raw) return null;
  const normalized =
    /[zZ]$/.test(raw) || /[+-]\d{2}:\d{2}$/.test(raw) ? raw : `${raw}Z`;
  const d = new Date(normalized);
  return Number.isFinite(d.getTime()) ? d : null;
}

/**
 * Formata uma data vinda do banco (timestamp sem timezone) como pt-BR usando UTC.
 */
function formatDbDate(dateRaw: string | null): string {
  if (!dateRaw) return "—";
  const normalized =
    /[zZ]$/.test(dateRaw) || /[+-]\d{2}:\d{2}$/.test(dateRaw) ? dateRaw : `${dateRaw}Z`;
  const d = new Date(normalized);
  return Number.isFinite(d.getTime()) ? formatPtBrDate(d) : "—";
}

/**
 * Aplica regras de "limite efetivo" conforme o status do plano:
 * - pago active/trialing: ilimitado
 * - past_due: permite durante tolerância (default 3 dias após current_period_end)
 * - demais status de falha: volta para o free
 */
function getEffectiveLimit(input: {
  plan: string;
  status: string;
  monthly_pre_sermon_limit: number | null;
  current_period_end: string | null;
}): { kind: "unlimited" } | { kind: "limited"; limit: number } {
  const plan = input.plan?.trim() ? input.plan.trim() : "free";
  const status = normalizeSubscriptionStatus(input.status);
  const isPaid = plan !== "free";

  const paidLimit =
    typeof input.monthly_pre_sermon_limit === "number" && input.monthly_pre_sermon_limit >= 0
      ? input.monthly_pre_sermon_limit
      : null;

  if (isPaid && (status === "active" || status === "trialing")) {
    if (paidLimit == null) return { kind: "unlimited" };
    return { kind: "limited", limit: paidLimit };
  }

  if (status === "past_due") {
    const endDate = input.current_period_end ? new Date(input.current_period_end) : null;
    const endOk = endDate && Number.isFinite(endDate.getTime()) ? endDate : null;
    const graceDays = Number.parseInt(process.env.MT_PAST_DUE_GRACE_DAYS?.trim() || "", 10);
    const safeGraceDays = Number.isFinite(graceDays) && graceDays >= 0 ? graceDays : 3;
    if (endOk) {
      const graceEndMs = endOk.getTime() + safeGraceDays * 24 * 60 * 60 * 1000;
      if (Date.now() <= graceEndMs) {
        if (isPaid && paidLimit == null) return { kind: "unlimited" };
        if (isPaid && paidLimit != null) return { kind: "limited", limit: paidLimit };
        return { kind: "limited", limit: 10 };
      }
    }
  }

  if (isPaid) return { kind: "limited", limit: 10 };

  const limit =
    typeof input.monthly_pre_sermon_limit === "number" && input.monthly_pre_sermon_limit >= 0
      ? input.monthly_pre_sermon_limit
      : 10;
  return { kind: "limited", limit };
}

/**
 * Traduz status técnicos de assinatura para rótulos legíveis.
 */
function getStatusLabel(statusRaw: string): string {
  const status = normalizeSubscriptionStatus(statusRaw);
  if (status === "free") return "Gratuito";
  if (status === "pending") return "Pendente";
  if (status === "active") return "Ativo";
  if (status === "trialing") return "Em teste";
  if (status === "past_due") return "Pagamento pendente";
  if (status === "cancelled") return "Cancelado";
  if (status === "expired") return "Expirado";
  if (status === "unpaid") return "Não pago";
  if (status === "incomplete") return "Incompleto";
  if (status === "failed") return "Falhou";
  return status;
}

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

  const [subscription, usage, plansResult] = await Promise.all([
    getCurrentSubscription(profile.authUserId),
    getCurrentUsage(profile.authUserId),
    supabase
      .from("plans")
      .select(
        "code,name,description,price_in_cents,currency,billing_cycle,monthly_pre_sermon_limit,is_active",
      )
      .eq("is_active", true)
      .order("price_in_cents", { ascending: true }),
  ]);

  const status = normalizeSubscriptionStatus(String(subscription.status || "free"));
  const plans = (plansResult.data ?? []) as PlanRow[];
  const plansByCode = new Map<string, PlanRow>();
  for (const p of plans) plansByCode.set(p.code, p);

  const currentPlan = plansByCode.get(subscription.plan) ?? null;
  const currentPlanLabel = currentPlan?.name ?? (subscription.plan === "free" ? "Gratuito" : subscription.plan);
  const statusLabel = getStatusLabel(String(subscription.status || "free"));

  const effectiveLimit = getEffectiveLimit({
    plan: subscription.plan,
    status,
    monthly_pre_sermon_limit: subscription.monthly_pre_sermon_limit,
    current_period_end: subscription.current_period_end,
  });

  const used = usage.used ?? 0;
  const remaining =
    effectiveLimit.kind === "limited" ? Math.max(0, effectiveLimit.limit - used) : null;

  const nextRenewal = getNextRenewalDate({
    current_period_end: subscription.current_period_end,
    cycle_end: usage.cycle_end,
  });
  const nextRenewalLabel = nextRenewal ? formatPtBrDate(nextRenewal) : "—";

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-[var(--mt-muted)]">Área do líder • Assinatura</p>
        <h2 className="text-2xl font-semibold tracking-tight">Assinatura</h2>
      </header>

      {status === "past_due" ? (
        <section className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6">
          <p className="text-sm font-semibold text-red-600 dark:text-red-300">
            Não conseguimos confirmar sua renovação. Regularize sua assinatura para evitar limitações.
          </p>
        </section>
      ) : status === "failed" || status === "expired" || status === "unpaid" || status === "incomplete" ? (
        <section className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6">
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
            Seu plano foi revertido para Gratuito
          </p>
        </section>
      ) : null}

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-[var(--mt-muted)]">Plano atual</p>
            <p className="text-lg font-semibold tracking-tight">{currentPlanLabel}</p>
          </div>
          <div className="flex flex-col gap-1 sm:items-end">
            <p className="text-sm text-[var(--mt-muted)]">Status</p>
            <span className="inline-flex items-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 py-1 text-sm font-semibold">
              {statusLabel}
            </span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-4">
            <p className="text-sm text-[var(--mt-muted)]">
              {effectiveLimit.kind === "unlimited" ? "Próxima cobrança" : "Próxima renovação"}
            </p>
            <p className="mt-2 text-sm font-semibold">{nextRenewalLabel}</p>
            {effectiveLimit.kind === "limited" ? (
              <p className="mt-2 text-xs text-[var(--mt-muted)]">
                Após essa data sua contagem volta automaticamente para {effectiveLimit.limit}.
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-4">
            <p className="text-sm text-[var(--mt-muted)]">Ciclo atual</p>
            <p className="mt-2 text-sm font-semibold">
              {formatDbDate(usage.cycle_start)} → {formatDbDate(usage.cycle_end)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h3 className="text-lg font-semibold tracking-tight">Seu consumo</h3>
        {effectiveLimit.kind === "unlimited" ? (
          <p className="mt-3 text-sm font-semibold">Pré-sermões ilimitados</p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-4">
              <p className="text-sm text-[var(--mt-muted)]">Usados</p>
              <p className="mt-2 text-sm font-semibold">
                {used} de {effectiveLimit.limit}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-4">
              <p className="text-sm text-[var(--mt-muted)]">Restantes</p>
              <p className="mt-2 text-sm font-semibold">{remaining}</p>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h3 className="text-lg font-semibold tracking-tight">Limites do plano atual</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-4">
            <p className="text-sm text-[var(--mt-muted)]">Pré-sermões por ciclo</p>
            {effectiveLimit.kind === "unlimited" ? (
              <p className="mt-2 text-sm font-semibold">Ilimitado</p>
            ) : (
              <p className="mt-2 text-sm font-semibold">{effectiveLimit.limit}</p>
            )}
          </div>

          <div className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-4">
            <p className="text-sm text-[var(--mt-muted)]">Renovação automática</p>
            <p className="mt-2 text-sm font-semibold">{nextRenewalLabel}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold tracking-tight">Planos disponíveis</h3>
          <p className="text-sm text-[var(--mt-muted)]">
            O checkout será habilitado em breve. Por enquanto, esta tela mostra seu consumo e prepara o upgrade.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {plans.map((p) => {
            const isCurrent = p.code === subscription.plan;
            const labelPrice = p.price_in_cents > 0 ? formatPrice(p.price_in_cents, p.currency) : "Grátis";
            const limitLabel =
              p.monthly_pre_sermon_limit == null
                ? "Pré-sermões ilimitados"
                : `Até ${p.monthly_pre_sermon_limit} pré-sermões/mês`;

            return (
              <div
                key={p.code}
                className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-semibold">{p.name}</p>
                    <p className="mt-1 text-sm text-[var(--mt-muted)]">{p.description ?? limitLabel}</p>
                  </div>
                  {isCurrent ? (
                    <span className="shrink-0 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 py-1 text-xs font-semibold text-[var(--mt-muted)]">
                      Atual
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-col gap-1">
                  <p className="text-sm font-semibold">{labelPrice}</p>
                  <p className="text-xs text-[var(--mt-muted)]">
                    {p.billing_cycle === "monthly" ? "Cobrança mensal" : p.billing_cycle}
                  </p>
                </div>

                <div className="mt-4">
                  {isCurrent ? (
                    <button
                      type="button"
                      disabled
                      className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-5 text-sm font-semibold text-[var(--mt-muted)]"
                    >
                      Plano atual
                    </button>
                  ) : (
                    <CreateCheckoutButton planCode={p.code} label={`Assinar ${p.name}`} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
