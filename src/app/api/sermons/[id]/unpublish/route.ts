import { createApiSupabaseClient, extractBearerToken } from "@/app/api/_shared/auth";
import { errorResponse, json } from "@/app/api/_shared/responses";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const token = extractBearerToken(request.headers.get("authorization"));
  if (!token) return errorResponse(401, "Token ausente ou inválido.");

  const { id } = await context.params;
  const sermonId = id?.trim();
  if (!sermonId) return errorResponse(400, "ID inválido.");

  let supabase;
  try {
    supabase = createApiSupabaseClient(token);
  } catch (err) {
    const message =
      err && typeof err === "object" && "message" in err && typeof err.message === "string"
        ? err.message
        : "Supabase não está configurado no ambiente.";
    return errorResponse(500, message);
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;
  if (userError || !userId) return errorResponse(401, "Token inválido ou expirado.");

  const { data: existing, error: existingError } = await supabase
    .from("published_sermons")
    .select("id,status,visibility")
    .eq("id", sermonId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) return errorResponse(500, "Falha ao buscar a mensagem.");
  if (!existing?.id) return errorResponse(404, "Mensagem não encontrada.");

  const oldStatus = typeof existing.status === "string" ? existing.status : null;
  const oldVisibility = typeof existing.visibility === "string" ? existing.visibility : null;

  const { error } = await supabase
    .from("published_sermons")
    .update({ status: "unpublished", source: "android_app" })
    .eq("id", sermonId)
    .eq("user_id", userId);

  if (error) return errorResponse(500, "Não foi possível despublicar a mensagem.");

  try {
    await supabase.from("publication_events").insert({
      sermon_id: sermonId,
      user_id: userId,
      event_type: "unpublished",
      old_status: oldStatus,
      new_status: "unpublished",
      old_visibility: oldVisibility,
      new_visibility: oldVisibility,
      metadata: { source: "android_app" },
    });
  } catch {
  }

  return json({ id: sermonId, status: "unpublished" });
}

