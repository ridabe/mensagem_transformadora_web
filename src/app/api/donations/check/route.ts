import { json, publicErrorResponse } from "@/app/api/_shared/responses";
import { checkDonationPixStatus } from "@/lib/abacatepay";

function isValidAppSource(request: Request): boolean {
  const raw = request.headers.get("x-app-source");
  return raw?.trim() === "mensagem-transformadora-android";
}

function getDonationId(request: Request): string | null {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  return id && id.trim() ? id.trim() : null;
}

export async function GET(request: Request) {
  if (!isValidAppSource(request)) {
    return publicErrorResponse(403, "Header x-app-source inválido ou ausente.");
  }

  const id = getDonationId(request);
  if (!id) return publicErrorResponse(400, "Parâmetro id é obrigatório.");

  try {
    const status = await checkDonationPixStatus(id);
    return json({
      success: true,
      donation: {
        id: status.id,
        status: status.status,
      },
    });
  } catch (err) {
    console.error("[donations/check] erro ao consultar pix", err);
    return publicErrorResponse(
      502,
      "Não foi possível consultar o Pix no momento. Tente novamente.",
    );
  }
}

export async function POST() {
  return publicErrorResponse(405, "Método não permitido.");
}

