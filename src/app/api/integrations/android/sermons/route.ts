import crypto from "node:crypto";

import { parseCreateSermonInput } from "@/app/api/_shared/payload";
import { json } from "@/app/api/_shared/responses";
import { buildPublicSermonUrl, buildSlugCandidates } from "@/app/api/_shared/slug";
import { createServiceRoleClient } from "@/lib/supabase/server";

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function normalizeSermonDate(value: string): { ok: true; value: string } | { ok: false } {
  const raw = value.trim();
  if (!raw) return { ok: false };
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { ok: true, value: raw };
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) return { ok: true, value: raw.slice(0, 10) };
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(raw)) return { ok: true, value: raw.replaceAll("/", "-") };
  return { ok: false };
}

function buildMissingDetails(missing: string[]): string[] {
  return missing.map((field) => `Campo ${field} é obrigatório.`);
}

function getRequiredEnv(name: string): string | null {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function POST(request: Request) {
  const expectedToken = getRequiredEnv("ANDROID_PUBLISH_TOKEN");
  const defaultUserId = getRequiredEnv("ANDROID_DEFAULT_USER_ID");

  if (!expectedToken || !defaultUserId || !isUuid(defaultUserId)) {
    return json({ error: "Configuração do servidor ausente ou inválida." }, 500);
  }

  const headerTokenRaw = request.headers.get("x-app-publish-token");
  const headerToken = headerTokenRaw?.trim() ? headerTokenRaw.trim() : null;
  if (!headerToken || !safeEqual(headerToken, expectedToken)) {
    return json({ error: "Token de publicação inválido." }, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(
      { error: "Payload inválido.", details: ["JSON inválido no corpo da requisição."] },
      400,
    );
  }

  const parsed = parseCreateSermonInput(body);
  if (!parsed.ok) {
    return json(
      { error: "Payload inválido.", details: buildMissingDetails(parsed.missing) },
      400,
    );
  }

  const sermonDateRaw = typeof parsed.data.sermon_date === "string" ? parsed.data.sermon_date : "";
  const dateNormalized = normalizeSermonDate(sermonDateRaw);
  if (!dateNormalized.ok) {
    return json(
      { error: "Payload inválido.", details: ["Campo sermonDate deve estar no formato YYYY-MM-DD."] },
      400,
    );
  }

  const sermonTitle = typeof parsed.data.sermon_title === "string" ? parsed.data.sermon_title : "";
  if (!sermonTitle.trim()) {
    return json(
      { error: "Payload inválido.", details: ["Campo sermonTitle é obrigatório."] },
      400,
    );
  }

  const status = typeof parsed.data.status === "string" ? parsed.data.status : "published";
  const publishedAt = status === "published" ? new Date().toISOString() : null;

  const service = createServiceRoleClient();
  const candidates = buildSlugCandidates(sermonTitle);

  let created: { id: string; slug: string } | null = null;
  let lastError: unknown = null;

  for (const slug of candidates) {
    const insertPayload: Record<string, unknown> = {
      ...parsed.data,
      user_id: defaultUserId,
      sermon_date: dateNormalized.value,
      slug,
      published_at: publishedAt,
    };

    const { data, error } = await service
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
    return json(
      { error: "Não foi possível criar a publicação.", details: lastError ?? null },
      500,
    );
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
