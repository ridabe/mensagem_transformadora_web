import crypto from "node:crypto";

import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

import type { PoolClient } from "pg";
import type {
  PublicSermonsQuery,
  PublicSermonsResult,
  PublishedSermon,
  SermonKeyPoint,
} from "./sermon.types";

type DbPublicSermonRow = {
  id: string;
  user_id: string;
  local_sermon_id: string | null;
  user_name: string;
  preacher_name: string;
  church_name: string;
  sermon_date: Date | string;
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
  published_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
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

function toIsoDate(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  return value;
}

function toYyyyMmDd(value: Date | string): string {
  const iso = toIsoDate(value);
  return iso.slice(0, 10);
}

function mapRowToPublishedSermon(row: DbPublicSermonRow): PublishedSermon {
  return {
    id: row.id,
    userId: row.user_id,
    localSermonId: row.local_sermon_id,
    userName: row.user_name,
    preacherName: row.preacher_name,
    churchName: row.church_name,
    sermonDate: toYyyyMmDd(row.sermon_date),
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
    publishedAt: row.published_at ? toIsoDate(row.published_at) : null,
    createdAt: toIsoDate(row.created_at),
    updatedAt: toIsoDate(row.updated_at),
  };
}

export async function getPublicSermons(
  query: PublicSermonsQuery,
): Promise<PublicSermonsResult> {
  const pageSize = Math.max(1, Math.min(query.pageSize ?? 12, 24));
  const page = Math.max(1, query.page ?? 1);
  const offset = (page - 1) * pageSize;

  const q = query.q?.trim() ? query.q.trim() : undefined;

  const supabase = await createSupabaseServerClient();
  let queryBuilder = supabase
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
      { count: "exact" },
    )
    .eq("visibility", "public")
    .eq("status", "published")
    .eq("source", "web_admin");

  if (q) {
    const pattern = `%${q}%`;
    queryBuilder = queryBuilder.or(
      [
        `sermon_title.ilike.${pattern}`,
        `preacher_name.ilike.${pattern}`,
        `church_name.ilike.${pattern}`,
        `main_verse.ilike.${pattern}`,
        `final_summary.ilike.${pattern}`,
      ].join(","),
    );
  }

  const { data, error, count } = await queryBuilder
    .order("sermon_date", { ascending: false })
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as unknown as DbPublicSermonRow[];
  return {
    items: rows.map(mapRowToPublishedSermon),
    page,
    pageSize,
    total: count ?? 0,
  };
}

export async function getPublicSermonBySlug(
  slug: string,
): Promise<PublishedSermon | null> {
  const supabase = await createSupabaseServerClient();
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
    .eq("source", "web_admin")
    .maybeSingle<DbPublicSermonRow>();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapRowToPublishedSermon(data);
}

export async function incrementPublicSermonView(
  client: PoolClient,
  sermonId: string,
  input: {
    viewerIp?: string | null;
    userAgent?: string | null;
    referrer?: string | null;
  },
): Promise<void> {
  const viewerIp = input.viewerIp?.trim() ? input.viewerIp.trim() : null;
  const viewerIpHash = viewerIp
    ? crypto.createHash("sha256").update(viewerIp).digest("hex")
    : null;

  await client.query(
    "select public.increment_sermon_view($1, $2, $3, $4)",
    [sermonId, viewerIpHash, input.userAgent ?? null, input.referrer ?? null],
  );
}
