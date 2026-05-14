import { json, errorResponse } from "@/app/api/_shared/responses";
import { getCurrentProfile, getCurrentSubscription } from "@/lib/auth/profiles";
import { isAiGenerationEnabledForFree } from "@/lib/app-settings";
import { generateSermon } from "@/lib/gemini";
import { createServiceRoleClient } from "@/lib/supabase/server";

function isPaidPlan(planCode: string): boolean {
  return planCode.trim().toLowerCase() !== "free";
}

function isActiveLikeStatus(status: string): boolean {
  return status === "active" || status === "trialing";
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return errorResponse(401, "Não autenticado.");

  // Verificar override individual antes de qualquer regra de plano
  const service = createServiceRoleClient();
  const { data: profileRow } = await service
    .from("profiles")
    .select("ai_sermon_enabled")
    .eq("id", profile.id)
    .maybeSingle<{ ai_sermon_enabled: boolean | null }>();

  const individualOverride = profileRow?.ai_sermon_enabled ?? null;

  if (individualOverride === false) {
    return errorResponse(403, "O acesso à geração de sermão via IA está bloqueado para sua conta.");
  }

  if (individualOverride !== true) {
    // null → segue regra de plano + configuração global
    const subscription = await getCurrentSubscription(profile.authUserId);
    const planCode = subscription.plan;
    const status = String(subscription.status ?? "free").trim().toLowerCase();

    const userIsFree = !isPaidPlan(planCode) || !isActiveLikeStatus(status);
    if (userIsFree) {
      const freeEnabled = await isAiGenerationEnabledForFree();
      if (!freeEnabled) {
        return errorResponse(
          403,
          "A geração de mensagem via IA está disponível apenas para planos pagos. Faça upgrade para acessar esta funcionalidade.",
        );
      }
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "Corpo da requisição inválido.");
  }

  const data = body as Record<string, unknown>;
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const mainVerse = typeof data.main_verse === "string" ? data.main_verse.trim() : "";
  const notes = typeof data.notes === "string" ? data.notes.trim() || null : null;
  const rawSecondary = data.secondary_verses;
  const secondaryVerses = Array.isArray(rawSecondary)
    ? rawSecondary.map(String).filter(Boolean)
    : [];

  if (!title) return errorResponse(400, "O título é obrigatório para gerar a mensagem.");
  if (!mainVerse) return errorResponse(400, "O versículo principal é obrigatório para gerar a mensagem.");

  try {
    const sermon = await generateSermon({ title, mainVerse, secondaryVerses, notes });
    return json({ sermon });
  } catch (err) {
    const message =
      err && typeof err === "object" && "message" in err && typeof err.message === "string"
        ? err.message
        : "Não foi possível gerar a mensagem. Tente novamente.";
    return errorResponse(500, message);
  }
}
