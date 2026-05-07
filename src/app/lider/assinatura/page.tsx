import { redirect } from "next/navigation";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getCurrentSubscription, getCurrentUsage, requireLeader } from "@/lib/auth/profiles";
import { formatPtBrDate } from "@/lib/format";
import { CreateCheckoutButton } from "./create-checkout-button";
import { CancelSubscriptionButton } from "./cancel-subscription-button";

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

type DbSubscriptionMetaRow = {
  status: string;
  metadata: unknown;
};

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

export async function cancelPendingSubscriptionAction() {
  "use server";

  const profile = await requireLeader();
  const service = createServiceRoleClient();

  const { data: sub } = await service
    .from("subscriptions")
    .select("id,status,metadata")
    .eq("leader_id", profile.authUserId)
    .maybeSingle<{ id: string; status: string; metadata: unknown }>();

  const status = getString(sub?.status)?.toLowerCase() ?? "free";
  if (!sub?.id || status !== "pending") redirect("/lider/assinatura");

  const currentMetadata = asRecord(sub.metadata) ?? {};
  const nextMetadata: Record<string, unknown> = { ...currentMetadata };
  delete nextMetadata.checkoutUrl;
  delete nextMetadata.pendingPlanCode;

  const patch = {
    plan: "free",
    status: "free",
    provider_checkout_id: null,
    provider_subscription_id: null,
    provider_product_id: null,
    current_period_start: null,
    current_period_end: null,
    cancelled_at: null,
    metadata: nextMetadata,
  };

  await service.from("subscriptions").update(patch).eq("id", sub.id);
  redirect("/lider/assinatura");
}

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
  cancelled_at: string | null;
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

  if (status === "cancelled") {
    if (isPaid && paidLimit != null) {
      const endDate = input.current_period_end ? new Date(input.current_period_end) : null;
      const endOk = endDate && Number.isFinite(endDate.getTime()) ? endDate : null;
      if (endOk && Date.now() <= endOk.getTime()) return { kind: "limited", limit: paidLimit };

      const cancelledDate = input.cancelled_at ? new Date(input.cancelled_at) : null;
      const cancelledOk =
        cancelledDate && Number.isFinite(cancelledDate.getTime()) ? cancelledDate : null;
      const graceDays = Number.parseInt(process.env.MT_PAST_DUE_GRACE_DAYS?.trim() || "", 10);
      const safeGraceDays = Number.isFinite(graceDays) && graceDays >= 0 ? graceDays : 3;
      if (cancelledOk) {
        const graceEndMs = cancelledOk.getTime() + safeGraceDays * 24 * 60 * 60 * 1000;
        if (Date.now() <= graceEndMs) return { kind: "limited", limit: paidLimit };
      }
    }

    return { kind: "limited", limit: 10 };
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

  const service = createServiceRoleClient();
  const { data: churchRow } = profile.churchId
    ? await service
        .from("churches")
        .select("id,status,plan_type,plan_status,name")
        .eq("id", profile.churchId)
        .maybeSingle<{ id: string; status: string; plan_type: string | null; plan_status: string | null; name: string }>()
    : { data: null };

  const isBusinessChurchUnlimited =
    Boolean(churchRow?.id) &&
    String(churchRow?.status ?? "") === "active" &&
    String(churchRow?.plan_type ?? "") === "business" &&
    String(churchRow?.plan_status ?? "") === "active";

  if (isBusinessChurchUnlimited) {
    const usage = await getCurrentUsage(profile.authUserId);
    const used = usage.used ?? 0;
    const nextRenewal = getNextRenewalDate({ current_period_end: null, cycle_end: usage.cycle_end });
    const nextRenewalLabel = nextRenewal ? formatPtBrDate(nextRenewal) : "—";

    return (
      <main className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <p className="text-sm text-[var(--mt-muted)]">Área do líder • Assinatura</p>
          <h2 className="text-2xl font-semibold tracking-tight">Assinatura</h2>
        </header>

        <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-sm text-[var(--mt-muted)]">Plano atual</p>
              <p className="text-lg font-semibold tracking-tight">Business (Igreja)</p>
              <p className="mt-1 text-xs text-[var(--mt-muted)]">
                Seu acesso é gerenciado pela sua igreja{churchRow?.name ? ` (${churchRow.name})` : ""}.
              </p>
            </div>
            <div className="flex flex-col gap-1 sm:items-end">
              <p className="text-sm text-[var(--mt-muted)]">Status</p>
              <span className="inline-flex items-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 py-1 text-sm font-semibold">
                Ativo
              </span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-4">
              <p className="text-sm text-[var(--mt-muted)]">Renovação do ciclo</p>
              <p className="mt-2 text-sm font-semibold">{nextRenewalLabel}</p>
              <p className="mt-2 text-xs text-[var(--mt-muted)]">
                O ciclo é usado apenas para contagem/relatórios. Seu limite é ilimitado.
              </p>
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
          <p className="mt-3 text-sm font-semibold">Pré-sermões ilimitados</p>
          <p className="mt-2 text-xs text-[var(--mt-muted)]">Criados no ciclo atual: {used}</p>
        </section>
      </main>
    );
  }

  const [subscription, usage, plansResult, rawSubscriptionResult] = await Promise.all([
    getCurrentSubscription(profile.authUserId),
    getCurrentUsage(profile.authUserId),
    supabase
      .from("plans")
      .select(
        "code,name,description,price_in_cents,currency,billing_cycle,monthly_pre_sermon_limit,is_active",
      )
      .eq("is_active", true)
      .order("price_in_cents", { ascending: true }),
    supabase
      .from("subscriptions")
      .select("status,metadata")
      .eq("leader_id", profile.authUserId)
      .maybeSingle<DbSubscriptionMetaRow>(),
  ]);

  const status = normalizeSubscriptionStatus(String(subscription.status || "free"));
  const showCancelButton = status === "active" || status === "trialing" || status === "paid";
  const plans = (plansResult.data ?? []) as PlanRow[];
  const plansByCode = new Map<string, PlanRow>();
  for (const p of plans) plansByCode.set(p.code, p);

  const currentPlan = plansByCode.get(subscription.plan) ?? null;
  const baseCurrentPlanLabel =
    currentPlan?.name ?? (subscription.plan === "free" ? "Gratuito" : subscription.plan);
  const currentPlanLabel =
    status === "cancelled" && subscription.plan !== "free"
      ? `${baseCurrentPlanLabel} (cancelado)`
      : baseCurrentPlanLabel;
  const statusLabel = getStatusLabel(String(subscription.status || "free"));

  const rawMetadata = rawSubscriptionResult.data?.metadata ?? null;
  const pendingPlanCode = getString(asRecord(rawMetadata)?.pendingPlanCode) ?? null;
  const pendingPlanName = pendingPlanCode ? (plansByCode.get(pendingPlanCode)?.name ?? pendingPlanCode) : null;
  const pendingCheckoutUrl = getString(asRecord(rawMetadata)?.checkoutUrl) ?? null;

  const effectiveLimit = getEffectiveLimit({
    plan: subscription.plan,
    status,
    monthly_pre_sermon_limit: subscription.monthly_pre_sermon_limit,
    current_period_end: subscription.current_period_end,
    cancelled_at: subscription.cancelled_at,
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
      ) : status === "pending" ? (
        <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
          <p className="text-sm font-semibold text-[var(--mt-text)]">Assinatura pendente</p>
          <p className="mt-2 text-sm text-[var(--mt-muted)]">
            {pendingPlanName
              ? `Você iniciou a assinatura do plano ${pendingPlanName}, mas o pagamento ainda não foi confirmado.`
              : "Você iniciou uma assinatura, mas o pagamento ainda não foi confirmado."}
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            {pendingCheckoutUrl ? (
              <a
                href={pendingCheckoutUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-[1px] hover:shadow-lg [background:var(--mt-gradient-gold)]"
              >
                Continuar pagamento
              </a>
            ) : null}
            <form action={cancelPendingSubscriptionAction} className="w-full sm:w-auto">
              <button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface-elevated)] px-5 text-sm font-semibold text-[var(--mt-text)] transition hover:bg-black/5"
              >
                Cancelar tentativa
              </button>
            </form>
          </div>
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
            {status === "cancelled" ? (
              <p className="mt-1 text-xs text-[var(--mt-muted)]">
                {subscription.monthly_pre_sermon_limit == null
                  ? "Plano ilimitado cancelado: seu limite volta para 10 pré-sermões por ciclo."
                  : nextRenewal
                    ? `Assinatura cancelada: você mantém seu limite até ${nextRenewalLabel} (ou por até 3 dias) e depois volta para 10.`
                    : "Assinatura cancelada: você mantém seu limite até o fim do período atual (ou por até 3 dias) e depois volta para 10."}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1 sm:items-end">
            <p className="text-sm text-[var(--mt-muted)]">Status</p>
            <span className="inline-flex items-center rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 py-1 text-sm font-semibold">
              {statusLabel}
            </span>
            {showCancelButton ? (
              <CancelSubscriptionButton className="mt-3 w-full sm:mt-2 sm:w-auto" />
            ) : null}
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
            <p className="text-sm text-[var(--mt-muted)]">Pré-sermões restantes no ciclo</p>
            {effectiveLimit.kind === "unlimited" ? (
              <p className="mt-2 text-sm font-semibold">Ilimitado</p>
            ) : (
              <div className="mt-2 flex flex-col gap-1">
                <p className="text-sm font-semibold">{remaining}</p>
                <p className="text-xs text-[var(--mt-muted)]">de {effectiveLimit.limit} por ciclo</p>
              </div>
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
