import crypto from "node:crypto";

import { errorResponse, json } from "@/app/api/_shared/responses";
import type {
  PublishedSermon,
  SermonKeyPoint,
} from "@/features/sermons/sermon.types";
import { createClient } from "@/lib/supabase/server";

type DbPublicSermonRow = {
  id: string;
  user_id: string;
  local_sermon_id: string | null;
  user_name: string;
  preacher_name: string;
  church_name: string;
  sermon_date: string;
  sermon_time: string | null;
  sermon_title: string;
  slug: string;
  main_verse: string;
  secondary_verses: unknown;
  introduction: string | null;
  key_points: unknown;
  highlighted_phrases: unknown;
  personal_observations: string | null;
  practical_applications: string | null;
  conclusion: string | null;
  final_summary: string | null;
  visibility: string;
  status: string;
  source: string;
  views_count: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string");
  return [];
}

function normalizeKeyPoints(value: unknown): SermonKeyPoint[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const record = raw as Record<string, unknown>;
      const id = typeof record.id === "string" ? record.id : crypto.randomUUID();
      const title = typeof record.title === "string" ? record.title : "";
      const content = typeof record.content === "string" ? record.content : "";
      const order = typeof record.order === "number" ? record.order : 0;
      return { id, title, content, order } satisfies SermonKeyPoint;
    })
    .filter((p): p is SermonKeyPoint => !!p && Boolean(p.title || p.content))
    .sort((a, b) => a.order - b.order);
}

function mapRowToPublishedSermon(row: DbPublicSermonRow): PublishedSermon {
  return {
    id: row.id,
    userId: row.user_id,
    localSermonId: row.local_sermon_id,
    userName: row.user_name,
    preacherName: row.preacher_name,
    churchName: row.church_name,
    sermonDate: row.sermon_date,
    sermonTime: row.sermon_time,
    sermonTitle: row.sermon_title,
    slug: row.slug,
    mainVerse: row.main_verse,
    secondaryVerses: normalizeStringArray(row.secondary_verses),
    introduction: row.introduction,
    keyPoints: normalizeKeyPoints(row.key_points),
    highlightedPhrases: normalizeStringArray(row.highlighted_phrases),
    personalObservations: row.personal_observations,
    practicalApplications: row.practical_applications,
    conclusion: row.conclusion,
    finalSummary: row.final_summary,
    visibility: row.visibility === "private" ? "private" : "public",
    status:
      row.status === "draft" ||
      row.status === "unpublished" ||
      row.status === "archived"
        ? row.status
        : "published",
    source:
      row.source === "web_admin" || row.source === "import"
        ? row.source
        : "android_app",
    viewsCount: row.views_count ?? 0,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug: slugRaw } = await context.params;
  const slug = slugRaw?.trim();
  if (!slug) return errorResponse(400, "Slug ausente.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("published_sermons")
    .select(
      `
        id,
        user_id,
        local_sermon_id,
        user_name,
        preacher_name,
        church_name,
        sermon_date,
        sermon_time,
        sermon_title,
        slug,
        main_verse,
        secondary_verses,
        introduction,
        key_points,
        highlighted_phrases,
        personal_observations,
        practical_applications,
        conclusion,
        final_summary,
        visibility,
        status,
        source,
        views_count,
        published_at,
        created_at,
        updated_at
      `,
    )
    .eq("slug", slug)
    .eq("visibility", "public")
    .eq("status", "published")
    .maybeSingle<DbPublicSermonRow>();

  if (error) {
    return errorResponse(500, "Falha ao consultar mensagem pública.", {
      code: error.code,
      message: error.message,
    });
  }

  if (!data) return errorResponse(404, "Mensagem não encontrada.");

  return json(mapRowToPublishedSermon(data));
}

