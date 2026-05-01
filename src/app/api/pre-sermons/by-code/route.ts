import { json, publicErrorResponse } from "@/app/api/_shared/responses";
import { createServiceRoleClient } from "@/lib/supabase/server";

type DbPreSermonRow = {
  share_code: string;
  title: string;
  main_verse: string;
  secondary_verses: unknown;
  leader: { name: string } | null;
  church: { name: string } | null;
};

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === "string");
}

function getShareCode(request: Request): string | null {
  const url = new URL(request.url);
  const codeRaw = url.searchParams.get("code");
  if (!codeRaw) return null;
  const code = codeRaw.trim().toUpperCase();
  if (!code) return null;
  if (!/^MT-[A-HJ-NP-Z2-9]{5}$/.test(code)) return null;
  return code;
}

export async function GET(request: Request) {
  const code = getShareCode(request);
  if (!code) return publicErrorResponse(400, "Parâmetro code é obrigatório e deve ser válido.");

  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("pre_sermons")
    .select(
      `
        share_code,
        title,
        main_verse,
        secondary_verses,
        leader:profiles!pre_sermons_leader_id_fkey(name),
        church:churches!pre_sermons_church_id_fkey(name)
      `,
    )
    .eq("share_code", code)
    .eq("status", "active")
    .maybeSingle<DbPreSermonRow>();

  if (error) {
    console.error("[pre-sermons/by-code] erro ao consultar pre_sermons", error);
    return publicErrorResponse(500, "Não foi possível consultar o pré-sermão no momento.");
  }

  if (!data) return publicErrorResponse(404, "Pré-sermão não encontrado.");

  return json({
    success: true,
    sermon: {
      shareCode: data.share_code,
      title: data.title,
      mainVerse: data.main_verse,
      secondaryVerses: normalizeStringArray(data.secondary_verses),
      leader: { name: data.leader?.name ?? "" },
      church: { name: data.church?.name ?? "" },
    },
  });
}

export async function POST() {
  return publicErrorResponse(405, "Método não permitido.");
}

export async function PUT() {
  return publicErrorResponse(405, "Método não permitido.");
}

export async function PATCH() {
  return publicErrorResponse(405, "Método não permitido.");
}

export async function DELETE() {
  return publicErrorResponse(405, "Método não permitido.");
}
