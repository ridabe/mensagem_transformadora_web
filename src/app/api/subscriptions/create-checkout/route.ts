import { publicErrorResponse, json } from "@/app/api/_shared/responses";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import {
  createAbacatePayCustomer,
  createAbacatePaySubscriptionCheckout,
  getAbacatePayProductId,
} from "@/lib/abacatepay";

type CreateCheckoutBody = {
  planCode?: unknown;
};

type DbProfileRow = {
  id: string;
  auth_user_id: string;
  role: string;
  status: string;
  name: string;
  display_name?: string | null;
  email: string;
  church_id: string | null;
};

type DbPlanRow = {
  code: string;
  is_active: boolean;
  price_in_cents: number;
  abacatepay_product_id: string | null;
};

type DbSubscriptionRow = {
  id: string;
  leader_id: string | null;
  plan: string;
  status: string;
  provider_customer_id: string | null;
  provider_checkout_id: string | null;
  provider_subscription_id: string | null;
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

function getCheckoutUrlFromMetadata(metadata: unknown): string | null {
  const obj = asRecord(metadata);
  const url = obj ? getString(obj.checkoutUrl) : null;
  return url;
}

function getPendingPlanCodeFromMetadata(metadata: unknown): string | null {
  const obj = asRecord(metadata);
  const planCode = obj ? getString(obj.pendingPlanCode) : null;
  return planCode;
}

function parseDbTimestamp(value: string | null): Date | null {
  const v = value?.trim() ? value.trim() : "";
  if (!v) return null;
  const normalized = /[zZ]$/.test(v) || /[+-]\d{2}:\d{2}$/.test(v) ? v : `${v}Z`;
  const d = new Date(normalized);
  return Number.isFinite(d.getTime()) ? d : null;
}

function mapPlanForAbacatePayMetadata(planCode: string): string {
  const normalized = planCode?.trim() ? planCode.trim().toLowerCase() : "";
  if (normalized === "plano_basico" || normalized === "basic") return "basic";
  if (normalized === "plano_pro" || normalized === "pro") return "pro";
  return planCode;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return publicErrorResponse(400, "JSON inválido no corpo da requisição.");
  }

  const planCode = getString((body as CreateCheckoutBody | null)?.planCode) ?? null;
  if (!planCode) return publicErrorResponse(400, "planCode é obrigatório.");
  if (planCode === "free") return publicErrorResponse(400, "Plano gratuito não gera checkout.");

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return publicErrorResponse(500, "Supabase não está configurado no ambiente.");
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;
  if (userError || !userId) return publicErrorResponse(401, "Você precisa estar autenticado.");

  const service = createServiceRoleClient();
  const { data: profileRow } = await service
    .from("profiles")
    .select("id,auth_user_id,role,status,name,display_name,email,church_id")
    .eq("auth_user_id", userId)
    .maybeSingle<DbProfileRow>();

  if (!profileRow?.id) return publicErrorResponse(403, "Perfil não encontrado.");
  if (String(profileRow.role || "").toLowerCase() !== "leader") {
    return publicErrorResponse(403, "Apenas líderes podem assinar planos.");
  }
  if (String(profileRow.status || "").toLowerCase() === "blocked") {
    return publicErrorResponse(403, "Sua conta está bloqueada.");
  }

  const { data: planRow } = await service
    .from("plans")
    .select("code,is_active,price_in_cents,abacatepay_product_id")
    .eq("code", planCode)
    .maybeSingle<DbPlanRow>();

  if (!planRow?.code) return publicErrorResponse(400, "Plano inválido.");
  if (!planRow.is_active) return publicErrorResponse(400, "Plano indisponível no momento.");
  if (planRow.code === "free" || planRow.price_in_cents === 0) {
    return publicErrorResponse(400, "Plano gratuito não gera checkout.");
  }

  const productId =
    getString(planRow.abacatepay_product_id) ??
    getAbacatePayProductId(planRow.code);
  if (!productId) return publicErrorResponse(500, "Produto de assinatura não configurado.");

  const { data: existingSub } = await service
    .from("subscriptions")
    .select(
      "id,leader_id,plan,status,provider_customer_id,provider_checkout_id,provider_subscription_id,metadata,updated_at",
    )
    .eq("leader_id", userId)
    .maybeSingle<DbSubscriptionRow>();

  const now = new Date();
  const updatedAt = parseDbTimestamp(existingSub?.updated_at ?? null);
  const pendingReuseWindowMs = 15 * 60 * 1000;

  if (existingSub?.id) {
    const currentPlan = getString(existingSub.plan) ?? "free";
    const currentStatus = getString(existingSub.status)?.toLowerCase() ?? "free";

    if (currentStatus === "active" || currentStatus === "trialing") {
      if (currentPlan === planRow.code) return publicErrorResponse(409, "Você já possui este plano ativo.");
      return publicErrorResponse(409, "Você já possui um plano ativo. Cancele antes de trocar de plano.");
    }

    if (currentStatus === "pending" && updatedAt) {
      const age = now.getTime() - updatedAt.getTime();
      const pendingPlanCode = getPendingPlanCodeFromMetadata(existingSub.metadata);
      const url = getCheckoutUrlFromMetadata(existingSub.metadata);
      if (age >= 0 && age <= pendingReuseWindowMs && pendingPlanCode === planRow.code && url) {
        return json({ success: true, checkoutUrl: url }, 200);
      }
    }
  }

  let customerId = existingSub?.provider_customer_id ?? null;
  if (!customerId) {
    try {
      const customerName = getString(profileRow.display_name) ?? profileRow.name;
      const created = await createAbacatePayCustomer({
        email: profileRow.email,
        name: customerName,
        metadata: {
          project: "mensagem-transformadora",
          profileId: profileRow.id,
        },
      });
      customerId = created.id;
    } catch (err) {
      const details =
        err && typeof err === "object" && "name" in err && err.name === "AbacatePayHttpError"
          ? err
          : null;
      console.error("[subscriptions/create-checkout] erro ao criar customer", {
        message: err && typeof err === "object" && "message" in err ? err.message : String(err),
        status: details && "status" in details ? (details.status as number) : null,
        providerMessage: details && "providerMessage" in details ? (details.providerMessage as string | null) : null,
      });
      customerId = null;
    }
  }

  const returnUrl = "https://mensagem-transformadora-web.vercel.app/dashboard";
  const completionUrl = "https://mensagem-transformadora-web.vercel.app/dashboard?payment=success";

  const checkoutExternalId = `${profileRow.id}:${planRow.code}:${Date.now()}`;

  let checkout;
  try {
    const abacateMetadataPlan = mapPlanForAbacatePayMetadata(planRow.code);
    checkout = await createAbacatePaySubscriptionCheckout({
      items: [{ id: productId, quantity: 1 }],
      ...(customerId ? { customerId } : {}),
      returnUrl,
      completionUrl,
      externalId: checkoutExternalId,
      metadata: {
        plan: abacateMetadataPlan,
        planCode: planRow.code,
        profileId: profileRow.id,
        churchId: profileRow.church_id,
        project: "mensagem-transformadora",
      },
    });
  } catch (err) {
    const details =
      err && typeof err === "object" && "name" in err && err.name === "AbacatePayHttpError"
        ? err
        : null;
    console.error("[subscriptions/create-checkout] erro ao criar checkout", {
      message: err && typeof err === "object" && "message" in err ? err.message : String(err),
      status: details && "status" in details ? (details.status as number) : null,
      providerMessage: details && "providerMessage" in details ? (details.providerMessage as string | null) : null,
    });
    return publicErrorResponse(
      502,
      "Não foi possível iniciar sua assinatura agora. Tente novamente.",
    );
  }

  const metadata = {
    ...(asRecord(existingSub?.metadata) ?? {}),
    project: "mensagem-transformadora",
    pendingPlanCode: planRow.code,
    pendingCheckoutExternalId: checkoutExternalId,
    checkoutUrl: checkout.checkoutUrl,
  };

  const existingPlan = getString(existingSub?.plan) ?? "free";
  const existingStatus = getString(existingSub?.status)?.toLowerCase() ?? "free";
  const planToPersist =
    existingStatus === "active" || existingStatus === "trialing" ? existingPlan : "free";
  const patch = {
    provider: "abacatepay",
    provider_customer_id: customerId,
    provider_product_id: productId,
    provider_checkout_id: checkout.checkoutId,
    provider_subscription_id: checkout.subscriptionId,
    plan: planToPersist,
    status: "pending",
    metadata,
  };

  if (existingSub?.id) {
    const { error: updateError } = await service.from("subscriptions").update(patch).eq("id", existingSub.id);
    if (updateError) {
      console.error("[subscriptions/create-checkout] erro ao salvar subscription", updateError);
      return publicErrorResponse(
        500,
        "Não foi possível iniciar sua assinatura agora. Tente novamente.",
      );
    }
  } else {
    const { error: insertError } = await service.from("subscriptions").insert({
      leader_id: userId,
      ...patch,
    });
    if (insertError) {
      console.error("[subscriptions/create-checkout] erro ao inserir subscription", insertError);
      return publicErrorResponse(
        500,
        "Não foi possível iniciar sua assinatura agora. Tente novamente.",
      );
    }
  }

  return json({ success: true, checkoutUrl: checkout.checkoutUrl }, 201);
}

export async function GET() {
  return publicErrorResponse(405, "Método não permitido.");
}
