import "server-only";

type DonationStatus = "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";

type CreateDonationPixResult = {
  id: string;
  status: DonationStatus;
  brCode: string;
  brCodeBase64: string;
  expiresAt: string;
};

type CheckDonationPixStatusResult = {
  id: string;
  status: DonationStatus;
};

type CreateCustomerResult = {
  id: string;
};

type CreateSubscriptionCheckoutResult = {
  checkoutId: string | null;
  subscriptionId: string | null;
  checkoutUrl: string;
};

function getRequiredEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`${name} não configurada no ambiente.`);
  return v.trim();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function getDonationStatus(value: unknown): DonationStatus | null {
  const s = getString(value);
  if (!s) return null;
  const normalized = s.trim().toUpperCase();
  if (normalized === "PENDING") return "PENDING";
  if (normalized === "PAID") return "PAID";
  if (normalized === "EXPIRED") return "EXPIRED";
  if (normalized === "CANCELLED") return "CANCELLED";
  return null;
}

function pickFirstString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const v = getString(obj[key]);
    if (v) return v;
  }
  return null;
}

function unwrapApiData(payload: unknown): Record<string, unknown> | null {
  const root = asRecord(payload);
  if (!root) return null;
  const data = asRecord(root.data);
  return data ?? root;
}

async function fetchAbacatePay(
  path: string,
  init: Omit<RequestInit, "headers"> & { headers?: Record<string, string> },
): Promise<{ ok: true; data: unknown } | { ok: false; status: number; data: unknown }> {
  const apiKey = getRequiredEnv("ABACATEPAY_API_KEY");
  const timeoutMs = 15_000;
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  const res = await fetch(`https://api.abacatepay.com${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${apiKey}`,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
    signal: controller?.signal,
  });

  if (timeoutId) clearTimeout(timeoutId);

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) return { ok: false, status: res.status, data };
  return { ok: true, data };
}

export async function createDonationPix(amountInCents: number): Promise<CreateDonationPixResult> {
  const result = await fetchAbacatePay("/v2/transparents/create", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      method: "PIX",
      data: {
        amount: amountInCents,
        description: "Doação para manter o app Mensagem Transformadora",
        expiresIn: 3600,
        metadata: {
          source: "android-app",
          project: "mensagem-transformadora",
          type: "donation",
        },
      },
    }),
  });

  if (!result.ok) {
    throw new Error(`AbacatePay retornou HTTP ${result.status}`);
  }

  const payload = unwrapApiData(result.data);
  if (!payload) throw new Error("Resposta inválida da AbacatePay.");

  const id = pickFirstString(payload, ["id", "pixId", "transactionId", "transparentId"]);
  const status = getDonationStatus(payload.status) ?? getDonationStatus(payload.paymentStatus);
  const brCode = pickFirstString(payload, ["brCode", "brcode", "copyAndPaste", "pixCopyPaste"]);
  const brCodeBase64 = pickFirstString(payload, [
    "brCodeBase64",
    "brcodeBase64",
    "qrCodeBase64",
    "qrcodeBase64",
  ]);
  const expiresAt = pickFirstString(payload, ["expiresAt", "expires_at", "expirationDate"]);

  if (!id || !status || !brCode || !brCodeBase64 || !expiresAt) {
    throw new Error("Resposta incompleta da AbacatePay.");
  }

  return { id, status, brCode, brCodeBase64, expiresAt };
}

export async function checkDonationPixStatus(id: string): Promise<CheckDonationPixStatusResult> {
  const encoded = encodeURIComponent(id);
  const result = await fetchAbacatePay(`/v2/transparents/check?id=${encoded}`, { method: "GET" });

  if (!result.ok) {
    throw new Error(`AbacatePay retornou HTTP ${result.status}`);
  }

  const payload = unwrapApiData(result.data);
  if (!payload) throw new Error("Resposta inválida da AbacatePay.");

  const donationId = pickFirstString(payload, ["id", "pixId", "transactionId", "transparentId"]) ?? id;
  const status = getDonationStatus(payload.status) ?? getDonationStatus(payload.paymentStatus);
  if (!status) throw new Error("Resposta incompleta da AbacatePay.");

  return { id: donationId, status };
}

export function getAbacatePayProductId(planCode: string): string | null {
  const normalized = planCode?.trim() ? planCode.trim() : "";
  if (!normalized) return null;
  if (normalized === "plano_basico") return process.env.ABACATEPAY_BASIC_PRODUCT_ID?.trim() || null;
  if (normalized === "plano_pro") return process.env.ABACATEPAY_PRO_PRODUCT_ID?.trim() || null;
  return null;
}

export async function createAbacatePayCustomer(input: {
  email: string;
  name?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<CreateCustomerResult> {
  const email = input.email?.trim() ? input.email.trim() : "";
  if (!email) throw new Error("E-mail inválido para criação de customer.");

  const result = await fetchAbacatePay("/v2/customers/create", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      data: {
        email,
        name: input.name?.trim() ? input.name.trim() : undefined,
      },
      metadata: input.metadata ?? undefined,
    }),
  });

  if (!result.ok) {
    throw new Error(`AbacatePay retornou HTTP ${result.status}`);
  }

  const payload = unwrapApiData(result.data);
  if (!payload) throw new Error("Resposta inválida da AbacatePay.");

  const id = pickFirstString(payload, ["id", "customerId", "custId"]);
  if (!id) throw new Error("Resposta incompleta da AbacatePay.");

  return { id };
}

export async function createAbacatePaySubscriptionCheckout(payload: {
  items: { id: string; quantity: number }[];
  customerId: string;
  methods: string[];
  returnUrl: string;
  completionUrl: string;
  externalId: string;
  metadata: Record<string, unknown>;
}): Promise<CreateSubscriptionCheckoutResult> {
  const result = await fetchAbacatePay("/v2/subscriptions/create", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!result.ok) {
    throw new Error(`AbacatePay retornou HTTP ${result.status}`);
  }

  const data = unwrapApiData(result.data);
  if (!data) throw new Error("Resposta inválida da AbacatePay.");

  const checkoutUrl =
    pickFirstString(data, ["url", "checkoutUrl", "paymentUrl", "redirectUrl"]) ?? null;
  if (!checkoutUrl) throw new Error("Resposta incompleta da AbacatePay.");

  const checkoutId = pickFirstString(data, ["checkoutId", "id", "billId", "billingId"]);
  const subscriptionId = pickFirstString(data, ["subscriptionId", "subscription_id", "subId"]);

  return { checkoutId, subscriptionId, checkoutUrl };
}
