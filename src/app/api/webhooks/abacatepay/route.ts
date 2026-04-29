import crypto from "node:crypto";

import { json } from "@/app/api/_shared/responses";
import { createServiceRoleClient } from "@/lib/supabase/server";

type AbacatePayWebhookPayload = {
  id?: unknown;
  event?: unknown;
  apiVersion?: unknown;
  devMode?: unknown;
  data?: unknown;
};

type DbSubscriptionRow = {
  id: string;
  leader_id: string | null;
  plan: string;
  status: string;
  provider: string | null;
  provider_customer_id: string | null;
  provider_checkout_id: string | null;
  provider_product_id: string | null;
  provider_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  last_payment_at: string | null;
  metadata: unknown;
};

type DbPaymentEventRow = {
  id: string;
  processed_at: string | null;
};

type DbProfileRow = {
  id: string;
  auth_user_id: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function getRequiredEnv(name: string): string | null {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : null;
}

function parseIsoDate(value: unknown): Date | null {
  const v = getString(value);
  if (!v) return null;
  const normalized = /[zZ]$/.test(v) || /[+-]\d{2}:\d{2}$/.test(v) ? v : `${v}Z`;
  const d = new Date(normalized);
  return Number.isFinite(d.getTime()) ? d : null;
}

function addOneMonthUtc(date: Date): Date {
  const d = new Date(date.getTime());
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}

function parseAbacateSignatureHeader(
  headerValue: string,
): { timestamp: string | null; v1: string | null } {
  const raw = headerValue.trim();
  if (!raw) return { timestamp: null, v1: null };
  const parts = raw.split(",").map((p) => p.trim());
  let timestamp: string | null = null;
  let v1: string | null = null;

  for (const part of parts) {
    const [k, ...rest] = part.split("=");
    const key = (k ?? "").trim();
    const value = rest.join("=").trim();
    if (!key || !value) continue;
    if (key === "t") timestamp = value;
    if (key === "v1") v1 = value;
  }

  return { timestamp, v1 };
}

function computeAbacateSignatureV1(params: { secret: string; timestamp: string; rawBody: string }): string {
  const signedPayload = `${params.timestamp}.${params.rawBody}`;
  return crypto.createHmac("sha256", params.secret).update(signedPayload).digest("hex");
}

function validateWebhookSecret(request: Request): boolean {
  const expected = getRequiredEnv("ABACATEPAY_WEBHOOK_SECRET");
  if (!expected) return false;
  const url = new URL(request.url);
  const provided = url.searchParams.get("webhookSecret")?.trim() ?? "";
  if (!provided) return false;
  return safeEqual(provided, expected);
}

function validateWebhookHmacIfPresent(request: Request, rawBody: string): boolean {
  const secret = getRequiredEnv("ABACATEPAY_WEBHOOK_SECRET");
  if (!secret) return false;

  const header = request.headers.get("x-abacate-signature");

  if (!header || !header.trim()) return true;

  const parsed = parseAbacateSignatureHeader(header);
  if (!parsed.timestamp || !parsed.v1) return false;

  const expected = computeAbacateSignatureV1({
    secret,
    timestamp: parsed.timestamp,
    rawBody,
  });

  return safeEqual(parsed.v1.toLowerCase(), expected.toLowerCase());
}

function extractAbacateData(payload: AbacatePayWebhookPayload): {
  eventId: string | null;
  eventType: string | null;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  subscriptionCanceledAt: Date | null;
  customerId: string | null;
  checkoutId: string | null;
  checkoutExternalId: string | null;
  profileId: string | null;
  productId: string | null;
  planCode: string | null;
  paymentUpdatedAt: Date | null;
  subscriptionUpdatedAt: Date | null;
  rawData: Record<string, unknown> | null;
} {
  const root = asRecord(payload);
  const data = asRecord(root?.data);
  const sub = asRecord(data?.subscription);
  const cust = asRecord(data?.customer);
  const pay = asRecord(data?.payment);
  const checkout = asRecord(data?.checkout);
  const metadata =
    asRecord(sub?.metadata) ??
    asRecord(checkout?.metadata) ??
    asRecord(root?.metadata) ??
    asRecord(data?.metadata) ??
    null;
  const items = Array.isArray(checkout?.items) ? (checkout?.items as unknown[]) : [];
  const firstItem = items.length ? asRecord(items[0]) : null;

  const eventId = getString(root?.id);
  const eventType = getString(root?.event);

  const subscriptionId = getString(sub?.id);
  const subscriptionStatus = getString(sub?.status);
  const subscriptionCanceledAt = parseIsoDate(sub?.canceledAt);
  const subscriptionUpdatedAt = parseIsoDate(sub?.updatedAt) ?? parseIsoDate(sub?.createdAt);

  const customerId = getString(cust?.id) ?? getString(data?.customerId) ?? getString(checkout?.customerId);
  const checkoutId = getString(checkout?.id);
  const checkoutExternalId = getString(checkout?.externalId);
  const profileId = getString(metadata?.profileId) ?? checkoutExternalId ?? null;

  const productId = getString(firstItem?.id) ?? getString(data?.productId);
  const planCode = getString(metadata?.planCode) ?? getString(metadata?.plan) ?? null;

  const paymentUpdatedAt =
    parseIsoDate(pay?.updatedAt) ?? parseIsoDate(pay?.createdAt) ?? parseIsoDate(data?.paidAt);

  return {
    eventId,
    eventType,
    subscriptionId,
    subscriptionStatus,
    subscriptionCanceledAt,
    customerId,
    checkoutId,
    checkoutExternalId,
    profileId,
    productId,
    planCode,
    paymentUpdatedAt,
    subscriptionUpdatedAt,
    rawData: data ?? null,
  };
}

function resolvePlanCode(input: { planCode: string | null; productId: string | null }): string | null {
  if (input.planCode) return input.planCode;
  if (!input.productId) return null;

  const basicId = getRequiredEnv("ABACATEPAY_BASIC_PRODUCT_ID");
  const proId = getRequiredEnv("ABACATEPAY_PRO_PRODUCT_ID");

  if (basicId && safeEqual(input.productId, basicId)) return "plano_basico";
  if (proId && safeEqual(input.productId, proId)) return "plano_pro";
  return null;
}

async function findSubscription(service: ReturnType<typeof createServiceRoleClient>, input: {
  providerSubscriptionId: string | null;
  providerCheckoutId: string | null;
  providerCustomerId: string | null;
  profileId: string | null;
}): Promise<DbSubscriptionRow | null> {
  if (input.providerSubscriptionId) {
    const { data } = await service
      .from("subscriptions")
      .select(
        "id,leader_id,plan,status,provider,provider_customer_id,provider_checkout_id,provider_product_id,provider_subscription_id,current_period_start,current_period_end,cancelled_at,last_payment_at,metadata",
      )
      .eq("provider_subscription_id", input.providerSubscriptionId)
      .maybeSingle<DbSubscriptionRow>();
    if (data?.id) return data;
  }

  if (input.providerCheckoutId) {
    const { data } = await service
      .from("subscriptions")
      .select(
        "id,leader_id,plan,status,provider,provider_customer_id,provider_checkout_id,provider_product_id,provider_subscription_id,current_period_start,current_period_end,cancelled_at,last_payment_at,metadata",
      )
      .eq("provider_checkout_id", input.providerCheckoutId)
      .maybeSingle<DbSubscriptionRow>();
    if (data?.id) return data;
  }

  if (input.providerCustomerId) {
    const { data } = await service
      .from("subscriptions")
      .select(
        "id,leader_id,plan,status,provider,provider_customer_id,provider_checkout_id,provider_product_id,provider_subscription_id,current_period_start,current_period_end,cancelled_at,last_payment_at,metadata",
      )
      .eq("provider_customer_id", input.providerCustomerId)
      .maybeSingle<DbSubscriptionRow>();
    if (data?.id) return data;
  }

  const profileId = input.profileId;
  if (profileId) {
    const { data: profile } = await service
      .from("profiles")
      .select("id,auth_user_id")
      .eq("id", profileId)
      .maybeSingle<DbProfileRow>();

    const leaderId = profile?.auth_user_id ?? null;
    if (leaderId) {
      const { data } = await service
        .from("subscriptions")
        .select(
          "id,leader_id,plan,status,provider,provider_customer_id,provider_checkout_id,provider_product_id,provider_subscription_id,current_period_start,current_period_end,cancelled_at,last_payment_at,metadata",
        )
        .eq("leader_id", leaderId)
        .maybeSingle<DbSubscriptionRow>();
      if (data?.id) return data;
    }
  }

  return null;
}

async function markEventProcessed(service: ReturnType<typeof createServiceRoleClient>, paymentEventId: string) {
  await service.from("payment_events").update({ processed_at: new Date().toISOString() }).eq("id", paymentEventId);
}

async function ensurePaymentEventRecord(service: ReturnType<typeof createServiceRoleClient>, input: {
  eventId: string;
  eventType: string;
  providerSubscriptionId: string | null;
  payload: unknown;
}): Promise<{ kind: "already_processed" } | { kind: "ready"; id: string }> {
  const { data: existing } = await service
    .from("payment_events")
    .select("id,processed_at")
    .eq("provider_event_id", input.eventId)
    .maybeSingle<DbPaymentEventRow>();

  if (existing?.id && existing.processed_at) return { kind: "already_processed" };
  if (existing?.id) return { kind: "ready", id: existing.id };

  const insertPayload = {
    provider: "abacatepay",
    event_type: input.eventType,
    provider_event_id: input.eventId,
    provider_subscription_id: input.providerSubscriptionId,
    payload: input.payload,
    processed_at: null,
  };

  const { data: inserted, error } = await service
    .from("payment_events")
    .insert(insertPayload)
    .select("id,processed_at")
    .single<DbPaymentEventRow>();

  if (!error && inserted?.id) return { kind: "ready", id: inserted.id };

  const { data: raceExisting } = await service
    .from("payment_events")
    .select("id,processed_at")
    .eq("provider_event_id", input.eventId)
    .maybeSingle<DbPaymentEventRow>();

  if (raceExisting?.id && raceExisting.processed_at) return { kind: "already_processed" };
  if (raceExisting?.id) return { kind: "ready", id: raceExisting.id };

  throw new Error("Falha ao registrar payment_events.");
}

export async function POST(request: Request) {
  if (!validateWebhookSecret(request)) return json({}, { status: 401 });

  let rawBody = "";
  try {
    rawBody = await request.text();
  } catch {
    return json({}, { status: 400 });
  }

  if (!validateWebhookHmacIfPresent(request, rawBody)) return json({}, { status: 401 });

  let payload: AbacatePayWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as AbacatePayWebhookPayload;
  } catch {
    return json({ success: false }, { status: 400 });
  }

  const extracted = extractAbacateData(payload);
  const eventId = extracted.eventId;
  const eventType = extracted.eventType;

  if (!eventId || !eventType) {
    return json({ success: true, ignored: true }, 200);
  }

  const service = createServiceRoleClient();

  let paymentEvent;
  try {
    paymentEvent = await ensurePaymentEventRecord(service, {
      eventId,
      eventType,
      providerSubscriptionId: extracted.subscriptionId,
      payload,
    });
  } catch (err) {
    console.error("[webhooks/abacatepay] erro ao salvar payment_event", err);
    return json({}, { status: 500 });
  }

  if (paymentEvent.kind === "already_processed") {
    return json({ success: true }, 200);
  }

  const subscription =
    await findSubscription(service, {
      providerSubscriptionId: extracted.subscriptionId,
      providerCheckoutId: extracted.checkoutId,
      providerCustomerId: extracted.customerId,
      profileId: extracted.profileId,
    });

  const now = new Date();

  if (!subscription?.id) {
    await markEventProcessed(service, paymentEvent.id);
    return json({ success: true, ignored: true }, 200);
  }

  const planCode = resolvePlanCode({ planCode: extracted.planCode, productId: extracted.productId });
  const periodStart = extracted.paymentUpdatedAt ?? extracted.subscriptionUpdatedAt ?? now;
  const periodEnd = addOneMonthUtc(periodStart);

  const mergedMetadata: Record<string, unknown> = {
    ...(asRecord(subscription.metadata) ?? {}),
    abacatepay: {
      ...(asRecord((asRecord(subscription.metadata) ?? {}).abacatepay) ?? {}),
      lastEventId: eventId,
      lastEventType: eventType,
      lastEventAt: now.toISOString(),
      lastPayload: payload,
    },
  };

  try {
    if (eventType === "subscription.completed") {
      const patch: Record<string, unknown> = {
        status: "active",
        provider: "abacatepay",
        provider_subscription_id: extracted.subscriptionId ?? subscription.provider_subscription_id,
        provider_customer_id: extracted.customerId ?? subscription.provider_customer_id,
        provider_checkout_id: extracted.checkoutId ?? subscription.provider_checkout_id,
        provider_product_id: extracted.productId ?? subscription.provider_product_id,
        last_payment_at: (extracted.paymentUpdatedAt ?? periodStart).toISOString(),
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancelled_at: null,
        metadata: mergedMetadata,
      };
      if (planCode) patch.plan = planCode;

      const { error } = await service.from("subscriptions").update(patch).eq("id", subscription.id);
      if (error) throw error;
    } else if (eventType === "subscription.renewed") {
      const patch: Record<string, unknown> = {
        status: "active",
        provider_subscription_id: extracted.subscriptionId ?? subscription.provider_subscription_id,
        provider_customer_id: extracted.customerId ?? subscription.provider_customer_id,
        provider_checkout_id: extracted.checkoutId ?? subscription.provider_checkout_id,
        provider_product_id: extracted.productId ?? subscription.provider_product_id,
        last_payment_at: (extracted.paymentUpdatedAt ?? periodStart).toISOString(),
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        metadata: mergedMetadata,
      };
      if (planCode) patch.plan = planCode;

      const { error } = await service.from("subscriptions").update(patch).eq("id", subscription.id);
      if (error) throw error;
    } else if (eventType === "subscription.cancelled") {
      const cancelledAt =
        extracted.subscriptionCanceledAt ?? extracted.subscriptionUpdatedAt ?? extracted.paymentUpdatedAt ?? now;

      const patch: Record<string, unknown> = {
        status: "cancelled",
        plan: "free",
        cancelled_at: cancelledAt.toISOString(),
        metadata: {
          ...mergedMetadata,
          cancelled: {
            at: cancelledAt.toISOString(),
            previousPlan: subscription.plan,
            providerStatus: extracted.subscriptionStatus,
          },
        },
      };

      const { error } = await service.from("subscriptions").update(patch).eq("id", subscription.id);
      if (error) throw error;
    } else {
      await markEventProcessed(service, paymentEvent.id);
      return json({ success: true, ignored: true }, 200);
    }

    await markEventProcessed(service, paymentEvent.id);
    return json({ success: true }, 200);
  } catch (err) {
    console.error("[webhooks/abacatepay] erro ao processar evento", err);
    return json({}, { status: 500 });
  }
}

export async function GET() {
  return json({ success: false }, { status: 405 });
}
