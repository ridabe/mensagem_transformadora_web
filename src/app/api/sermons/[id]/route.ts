import { createApiSupabaseClient, extractBearerToken } from "@/app/api/_shared/auth";
import { errorResponse, json } from "@/app/api/_shared/responses";
import { parseUpdateSermonInput } from "@/app/api/_shared/payload";
import { buildPublicSermonUrl, buildSlugCandidates } from "@/app/api/_shared/slug";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const token = extractBearerToken(request.headers.get("authorization"));
  if (!token) return errorResponse(401, "Token ausente ou inválido.");

  const { id } = await context.params;
  const sermonId = id?.trim();
  if (!sermonId) return errorResponse(400, "ID inválido.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "JSON inválido no corpo da requisição.");
  }

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

  const patch = parseUpdateSermonInput(body);
  const hasAnyPatch = Object.keys(patch).some((k) => k !== "source");
  if (!hasAnyPatch) return errorResponse(400, "Nenhum campo para atualizar.");

  const { data: existing, error: existingError } = await supabase
    .from("published_sermons")
    .select("id,slug,sermon_title,status,visibility")
    .eq("id", sermonId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) return errorResponse(500, "Falha ao buscar a mensagem.");
  if (!existing?.id) return errorResponse(404, "Mensagem não encontrada.");

  const oldStatus = typeof existing.status === "string" ? existing.status : null;
  const oldVisibility = typeof existing.visibility === "string" ? existing.visibility : null;

  const newTitle = typeof patch.sermon_title === "string" ? patch.sermon_title : null;
  if (!newTitle) {
    const { error } = await supabase
      .from("published_sermons")
      .update(patch)
      .eq("id", sermonId)
      .eq("user_id", userId);

    if (error) return errorResponse(500, "Não foi possível atualizar a publicação.");

    const slug = typeof existing.slug === "string" ? existing.slug : null;
    return json({ id: sermonId, slug, url: slug ? buildPublicSermonUrl(slug) : null });
  }

  const candidates = buildSlugCandidates(newTitle);
  let updatedSlug: string | null = null;
  let lastError: unknown = null;

  for (const slug of candidates) {
    const patchWithSlug = { ...patch, slug };
    const { error } = await supabase
      .from("published_sermons")
      .update(patchWithSlug)
      .eq("id", sermonId)
      .eq("user_id", userId);

    if (!error) {
      updatedSlug = slug;
      break;
    }

    lastError = error;
  }

  if (!updatedSlug) {
    return errorResponse(500, "Não foi possível atualizar a publicação.", { cause: lastError });
  }

  try {
    const newStatus = typeof patch.status === "string" ? patch.status : oldStatus;
    const newVisibility =
      typeof patch.visibility === "string" ? patch.visibility : oldVisibility;
    await supabase.from("publication_events").insert({
      sermon_id: sermonId,
      user_id: userId,
      event_type: "updated",
      old_status: oldStatus,
      new_status: newStatus,
      old_visibility: oldVisibility,
      new_visibility: newVisibility,
      metadata: { source: "android_app" },
    });
  } catch {
  }

  return json({ id: sermonId, slug: updatedSlug, url: buildPublicSermonUrl(updatedSlug) });
}

