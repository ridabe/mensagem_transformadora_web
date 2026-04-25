import { createApiSupabaseClient, extractBearerToken } from "@/app/api/_shared/auth";
import { errorResponse, json } from "@/app/api/_shared/responses";

function parseIntParam(value: string | null, defaultValue: number): number {
  if (!value) return defaultValue;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : defaultValue;
}

export async function GET(request: Request) {
  const token = extractBearerToken(request.headers.get("authorization"));
  if (!token) return errorResponse(401, "Token ausente ou inválido.");

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

  const url = new URL(request.url);
  const page = Math.max(1, parseIntParam(url.searchParams.get("page"), 1));
  const pageSize = Math.max(1, Math.min(parseIntParam(url.searchParams.get("pageSize"), 20), 50));
  const status = url.searchParams.get("status")?.trim() || null;
  const visibility = url.searchParams.get("visibility")?.trim() || null;

  let query = supabase
    .from("published_sermons")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (visibility) query = query.eq("visibility", visibility);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query.range(from, to);
  if (error) return errorResponse(500, "Não foi possível listar suas mensagens.");

  return json({
    items: data ?? [],
    page,
    pageSize,
    total: count ?? 0,
  });
}

