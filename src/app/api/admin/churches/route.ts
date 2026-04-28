import { errorResponse, json } from "@/app/api/_shared/responses";
import { getCurrentProfile } from "@/lib/auth/profiles";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

type ChurchStatus = "active" | "inactive";

type ChurchRow = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  status: ChurchStatus;
  created_at: string;
  updated_at: string;
};

function parseStatus(value: unknown): ChurchStatus | null {
  if (value === "active" || value === "inactive") return value;
  return null;
}

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
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

export async function GET() {
  const auth = await requireAdminForApi();
  if (!auth.ok) return auth.response;

  const service = createServiceRoleClient();

  const { data: churches, error } = await service
    .from("churches")
    .select("id,name,city,state,status,created_at,updated_at")
    .order("name", { ascending: true });

  if (error) return errorResponse(500, "Não foi possível listar igrejas.");

  const { data: leaderRows, error: leaderError } = await service
    .from("profiles")
    .select("church_id")
    .eq("role", "leader")
    .not("church_id", "is", null);

  if (leaderError) return errorResponse(500, "Não foi possível carregar líderes vinculados.");

  const counts = new Map<string, number>();
  for (const row of leaderRows ?? []) {
    const churchId = row && typeof row === "object" && "church_id" in row ? row.church_id : null;
    if (typeof churchId !== "string" || !churchId) continue;
    counts.set(churchId, (counts.get(churchId) ?? 0) + 1);
  }

  const items = ((churches ?? []) as ChurchRow[]).map((c) => ({
    ...c,
    leaders_count: counts.get(c.id) ?? 0,
  }));

  return json({ items });
}

export async function POST(request: Request) {
  const auth = await requireAdminForApi();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "JSON inválido no corpo da requisição.");
  }

  if (!body || typeof body !== "object") return errorResponse(400, "Payload inválido.");
  const record = body as Record<string, unknown>;

  const name = normalizeOptionalText(record.name);
  if (!name) return errorResponse(400, "Nome é obrigatório.");

  const city = normalizeOptionalText(record.city);
  const state = normalizeOptionalText(record.state);
  const status = parseStatus(record.status) ?? "active";

  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("churches")
    .insert({ name, city, state, status })
    .select("id,name,city,state,status,created_at,updated_at")
    .single();

  if (error || !data) return errorResponse(500, "Não foi possível criar a igreja.");

  return json(data, 201);
}
