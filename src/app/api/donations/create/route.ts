import { publicErrorResponse } from "@/app/api/_shared/responses";
import { json } from "@/app/api/_shared/responses";
import { createDonationPix } from "@/lib/abacatepay";

function isValidAppSource(request: Request): boolean {
  const raw = request.headers.get("x-app-source");
  return raw?.trim() === "mensagem-transformadora-android";
}

function parseAmountInCents(body: unknown): { ok: true; value: number } | { ok: false; message: string } {
  if (!body || typeof body !== "object") return { ok: false, message: "Payload inválido." };
  const amount = (body as Record<string, unknown>).amountInCents;
  if (typeof amount !== "number" || !Number.isInteger(amount)) {
    return { ok: false, message: "amountInCents é obrigatório e deve ser um número inteiro." };
  }
  if (amount < 500) return { ok: false, message: "Valor mínimo é 500 (R$ 5,00)." };
  if (amount > 50_000) return { ok: false, message: "Valor máximo é 50000 (R$ 500,00)." };
  return { ok: true, value: amount };
}

export async function POST(request: Request) {
  if (!isValidAppSource(request)) {
    return publicErrorResponse(403, "Header x-app-source inválido ou ausente.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return publicErrorResponse(400, "JSON inválido no corpo da requisição.");
  }

  const parsed = parseAmountInCents(body);
  if (!parsed.ok) return publicErrorResponse(400, parsed.message);

  try {
    const created = await createDonationPix(parsed.value);
    return json(
      {
        success: true,
        donation: {
          id: created.id,
          status: created.status,
          amountInCents: parsed.value,
          brCode: created.brCode,
          brCodeBase64: created.brCodeBase64,
          expiresAt: created.expiresAt,
        },
      },
      201,
    );
  } catch (err) {
    console.error("[donations/create] erro ao criar pix", err);
    return publicErrorResponse(
      502,
      "Não foi possível gerar o Pix no momento. Tente novamente.",
    );
  }
}

export async function GET() {
  return publicErrorResponse(405, "Método não permitido.");
}

