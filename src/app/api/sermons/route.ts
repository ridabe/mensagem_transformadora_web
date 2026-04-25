import { createServiceRoleClient } from "@/lib/supabase/server";
import { createApiSupabaseClient, extractBearerToken } from "@/app/api/_shared/auth";
import { errorResponse, json } from "@/app/api/_shared/responses";
import { parseCreateSermonInput } from "@/app/api/_shared/payload";
import { buildPublicSermonUrl, buildSlugCandidates } from "@/app/api/_shared/slug";

export async function POST(request: Request) {
  const token = extractBearerToken(request.headers.get("authorization"));
  if (!token) return errorResponse(401, "Token ausente ou inválido.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "JSON inválido no corpo da requisição.");
  }

  const parsed = parseCreateSermonInput(body);
  if (!parsed.ok) {
    return errorResponse(400, "Payload inválido.", { missing: parsed.missing });
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
  const user = userData.user;
  if (userError || !user?.id) return errorResponse(401, "Token inválido ou expirado.");

  if (user.email) {
    try {
      const service = createServiceRoleClient();
      const displayNameRaw =
        typeof user.user_metadata?.display_name === "string"
          ? user.user_metadata.display_name
          : null;
      const displayName =
        displayNameRaw?.trim() || user.email.split("@")[0] || "Usuário";
      await service.from("profiles").upsert(
        { id: user.id, display_name: displayName, email: user.email },
        { onConflict: "id" },
      );
    } catch {
    }
  }

  const sermonTitle = parsed.data.sermon_title;
  if (typeof sermonTitle !== "string" || !sermonTitle.trim()) {
    return errorResponse(400, "Payload inválido.", { missing: ["sermonTitle"] });
  }

  const candidates = buildSlugCandidates(sermonTitle);
  let created: { id: string; slug: string } | null = null;
  let lastError: unknown = null;

  for (const slug of candidates) {
    const insertPayload = { ...parsed.data, user_id: user.id, slug };
    const { data, error } = await supabase
      .from("published_sermons")
      .insert(insertPayload)
      .select("id,slug")
      .single();

    if (!error && data?.id && data?.slug) {
      created = { id: data.id as string, slug: data.slug as string };
      break;
    }

    lastError = error;
  }

  if (!created) {
    return errorResponse(500, "Não foi possível criar a publicação.", { cause: lastError });
  }

  try {
    await supabase.from("publication_events").insert({
      sermon_id: created.id,
      user_id: user.id,
      event_type: "created",
      old_status: null,
      new_status: parsed.data.status ?? "published",
      old_visibility: null,
      new_visibility: parsed.data.visibility ?? "public",
      metadata: { source: "android_app" },
    });
  } catch {
  }

  return json(
    {
      id: created.id,
      slug: created.slug,
      url: buildPublicSermonUrl(created.slug),
    },
    201,
  );
}

