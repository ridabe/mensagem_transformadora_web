import { errorResponse, json } from "@/app/api/_shared/responses";
import { getCurrentProfile } from "@/lib/auth/profiles";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

type ChurchStatus = "active" | "inactive";

function parseStatus(value: unknown): ChurchStatus | null {
  if (value === "active" || value === "inactive") return value;
  return null;
}

async function requireAdminForApi(): Promise<
  { ok: true } | { ok: false; response: Response }
> {
  try {
    await createClient();
  } catch (err) {
    const message =
      err && typeof err === "object" && "message" in err && typeof err.message === "string"
        ? err.message
        : "Supabase não está configurado no ambiente.";
    return { ok: false, response: errorResponse(500, message) };
  }

  const profile = await getCurrentProfile().catch(() => null);
  if (!profile) return { ok: false, response: errorResponse(401, "Sessão inválida ou expirada.") };
  if (profile.status === "blocked") {
    return { ok: false, response: errorResponse(403, "Usuário bloqueado.") };
  }
  if (profile.role !== "admin") return { ok: false, response: errorResponse(403, "Acesso negado.") };

  return { ok: true };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminForApi();
  if (!auth.ok) return auth.response;

  const { id: idRaw } = await context.params;
  const id = idRaw?.trim();
  if (!id) return errorResponse(400, "ID ausente.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "JSON inválido no corpo da requisição.");
  }

  if (!body || typeof body !== "object") return errorResponse(400, "Payload inválido.");
  const status = parseStatus((body as Record<string, unknown>).status);
  if (!status) return errorResponse(400, "Status inválido. Use active ou inactive.");

  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("churches")
    .update({ status })
    .eq("id", id)
    .select("id,name,city,state,status,created_at,updated_at")
    .maybeSingle();

  if (error) return errorResponse(500, "Não foi possível atualizar o status.");
  if (!data) return errorResponse(404, "Igreja não encontrada.");

  return json(data);
}
