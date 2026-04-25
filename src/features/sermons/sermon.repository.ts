import crypto from "node:crypto";

import { getDbPool } from "@/lib/db";

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
  sermon_date: Date;
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
  views_count: number;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
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
    sermonDate: row.sermon_date.toISOString().slice(0, 10),
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
    publishedAt: row.published_at ? row.published_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function buildPublicSearchWhere(
  q: string | undefined,
): { whereSql: string; params: string[] } {
  const params: string[] = [];
  if (!q) {
    return {
      whereSql: "",
      params,
    };
  }

  params.push(`%${q}%`);
  const p1 = `$${params.length}`;

  return {
    whereSql: ` AND (
      sermon_title ILIKE ${p1}
      OR preacher_name ILIKE ${p1}
      OR church_name ILIKE ${p1}
      OR main_verse ILIKE ${p1}
      OR coalesce(final_summary, '') ILIKE ${p1}
    )`,
    params,
  };
}

export async function getPublicSermons(
  query: PublicSermonsQuery,
): Promise<PublicSermonsResult> {
  const pageSize = Math.max(1, Math.min(query.pageSize ?? 12, 24));
  const page = Math.max(1, query.page ?? 1);
  const offset = (page - 1) * pageSize;

  const pool = getDbPool();

  const q = query.q?.trim() ? query.q.trim() : undefined;
  const { whereSql, params } = buildPublicSearchWhere(q);

  const baseFilter = `WHERE visibility = 'public' AND status = 'published'`;

  const countSql = `
    SELECT count(*)::int AS total
    FROM public.published_sermons
    ${baseFilter}
    ${whereSql}
  `;

  const listSql = `
    SELECT
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
    FROM public.published_sermons
    ${baseFilter}
    ${whereSql}
    ORDER BY sermon_date DESC, published_at DESC NULLS LAST, created_at DESC
    LIMIT $${params.length + 1}
    OFFSET $${params.length + 2}
  `;

  const countParams = [...params];
  const listParams = [...params, pageSize, offset];

  const client = await pool.connect();
  try {
    const countRes = await client.query<{ total: number }>(countSql, countParams);
    const total = countRes.rows[0]?.total ?? 0;

    const listRes = await client.query<DbPublicSermonRow>(listSql, listParams);
    const items = listRes.rows.map(mapRowToPublishedSermon);

    return {
      items,
      page,
      pageSize,
      total,
    };
  } finally {
    client.release();
  }
}

export async function getPublicSermonBySlug(
  slug: string,
): Promise<PublishedSermon | null> {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    const res = await client.query<DbPublicSermonRow>(
      `
      SELECT
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
      FROM public.published_sermons
      WHERE visibility = 'public'
        AND status = 'published'
        AND slug = $1
      LIMIT 1
      `,
      [slug],
    );

    const row = res.rows[0];
    if (!row) return null;
    return mapRowToPublishedSermon(row);
  } finally {
    client.release();
  }
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
