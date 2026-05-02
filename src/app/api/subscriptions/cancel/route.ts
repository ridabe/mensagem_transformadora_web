import { json, publicErrorResponse } from "@/app/api/_shared/responses";
import { cancelAbacatePaySubscription } from "@/lib/abacatepay";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

type DbSubscriptionRow = {
  id: string;
  leader_id: string | null;
  plan: string;
  status: string;
  provider: string | null;
  provider_subscription_id: string | null;
  provider_checkout_id: string | null;
  provider_customer_id: string | null;
  provider_product_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  metadata: unknown;
  updated_at: string | null;
};

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function isActiveSubscriptionStatus(statusRaw: string | null): boolean {
  const status = (statusRaw ?? "").trim().toLowerCase();
  return status === "active" || status === "trialing" || status === "paid";
}

function normalizeProviderStatus(value: unknown): string | null {
  const v = getString(value);
  return v ? v.trim().toUpperCase() : null;
}

function isSubscriptionIdLooksLikeAbacatePay(id: string): boolean {
  const normalized = id.trim();
  if (!normalized) return false;
  if (normalized.startsWith("bill_")) return false;
  if (normalized.startsWith("subs_")) return true;
  return false;
}

export async function POST() {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch {
    return publicErrorResponse(500, "Supabase não está configurado no ambiente.");
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;
  if (userError || !userId) return publicErrorResponse(401, "Você precisa estar autenticado.");

  const service = createServiceRoleClient();

  let existingSub: DbSubscriptionRow | null = null;
  try {
    const { data, error } = await service
      .from("subscriptions")
      .select(
        "id,leader_id,plan,status,provider,provider_subscription_id,provider_checkout_id,provider_customer_id,provider_product_id,current_period_start,current_period_end,cancelled_at,metadata,updated_at",
      )
      .eq("leader_id", userId)
      .maybeSingle<DbSubscriptionRow>();
    if (error) {
      console.error("[subscriptions/cancel] erro ao buscar subscription", error);
      return publicErrorResponse(500, "Não foi possível localizar sua assinatura agora. Tente novamente.");
    }
    existingSub = data ?? null;
  } catch (err) {
    console.error("[subscriptions/cancel] falha inesperada ao buscar subscription", err);
    return publicErrorResponse(500, "Não foi possível localizar sua assinatura agora. Tente novamente.");
  }

  const status = getString(existingSub?.status)?.toLowerCase() ?? "free";
  if (!existingSub?.id || !isActiveSubscriptionStatus(status)) {
    return publicErrorResponse(404, "Nenhuma assinatura ativa foi encontrada para cancelamento.");
  }

  const provider = getString(existingSub.provider)?.toLowerCase() ?? null;
  if (provider && provider !== "abacatepay") {
    return publicErrorResponse(400, "Sua assinatura atual não é gerenciada pela AbacatePay.");
  }

  const providerSubscriptionId = getString(existingSub.provider_subscription_id);
  if (!providerSubscriptionId) {
    return publicErrorResponse(
      400,
      "Sua assinatura ativa não possui um ID remoto para cancelamento. Entre em contato com o suporte.",
    );
  }

  if (!isSubscriptionIdLooksLikeAbacatePay(providerSubscriptionId)) {
    return publicErrorResponse(
      400,
      "ID remoto de assinatura inválido para cancelamento. Não é permitido cancelar usando um ID de checkout (bill_).",
    );
  }

  let cancelData: Record<string, unknown>;
  try {
    cancelData = await cancelAbacatePaySubscription(providerSubscriptionId);
  } catch (err) {
    const details =
      err && typeof err === "object" && "name" in err && err.name === "AbacatePayHttpError"
        ? err
        : null;
    console.error("[subscriptions/cancel] erro ao cancelar na AbacatePay", {
      message: err && typeof err === "object" && "message" in err ? err.message : String(err),
      status: details && "status" in details ? (details.status as number) : null,
      providerMessage: details && "providerMessage" in details ? (details.providerMessage as string | null) : null,
    });
    return publicErrorResponse(502, "Não foi possível cancelar sua assinatura agora. Tente novamente.");
  }

  const providerStatus =
    normalizeProviderStatus(cancelData.status) ??
    normalizeProviderStatus(cancelData.subscriptionStatus) ??
    normalizeProviderStatus(cancelData.subscription_status) ??
    "CANCELLED";

  const nowIso = new Date().toISOString();
  const nextMetadata: Record<string, unknown> = {
    ...(asRecord(existingSub.metadata) ?? {}),
    abacatepay: {
      ...(asRecord((asRecord(existingSub.metadata) ?? {}).abacatepay) ?? {}),
      cancelledAt: nowIso,
      cancelledByUser: true,
      status: providerStatus,
      subscriptionId: providerSubscriptionId,
    },
  };

  try {
    const patch = {
      status: "cancelled",
      cancelled_at: nowIso,
      metadata: nextMetadata,
    };

    const { data: updated, error: updateError } = await service
      .from("subscriptions")
      .update(patch)
      .eq("id", existingSub.id)
      .select(
        "id,leader_id,plan,status,provider,provider_subscription_id,provider_checkout_id,provider_customer_id,provider_product_id,current_period_start,current_period_end,cancelled_at,metadata,updated_at",
      )
      .single<DbSubscriptionRow>();

    if (updateError) {
      console.error("[subscriptions/cancel] cancelado na AbacatePay mas falhou ao atualizar banco", updateError);
      return json(
        {
          success: false,
          error: {
            message:
              "Assinatura cancelada na AbacatePay, mas não foi possível atualizar o sistema. Entre em contato com o suporte.",
            remoteCancelled: true,
          },
        },
        500,
      );
    }

    return json({ success: true, subscription: updated }, 200);
  } catch (err) {
    console.error("[subscriptions/cancel] cancelado na AbacatePay mas falhou ao atualizar banco", err);
    return json(
      {
        success: false,
        error: {
          message:
            "Assinatura cancelada na AbacatePay, mas não foi possível atualizar o sistema. Entre em contato com o suporte.",
          remoteCancelled: true,
        },
      },
      500,
    );
  }
}

export async function GET() {
  return publicErrorResponse(405, "Método não permitido.");
}
