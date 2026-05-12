import { NextResponse } from "next/server";

import { getDbPool } from "@/lib/db";

function normalizeSlug(value: unknown): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";
  return raw
    .toLowerCase()
    .replaceAll(/[\s_]+/g, "-")
    .replaceAll(/[^a-z0-9-]/g, "")
    .replaceAll(/-+/g, "-")
    .replaceAll(/^-|-$/g, "");
}

async function resolvePublishedPostIdBySlug(slug: string): Promise<string | null> {
  const pool = getDbPool();
  const res = await pool.query<{ id: string }>(
    "select id from public.blog_posts where slug = $1 and status = 'published' limit 1",
    [slug],
  );
  return res.rows[0]?.id ?? null;
}

async function getCurrentViews(postId: string): Promise<number> {
  const pool = getDbPool();
  const res = await pool.query<{ views: string | number }>(
    "select views from public.blog_post_view_counts where post_id = $1 limit 1",
    [postId],
  );
  const raw = res.rows[0]?.views;
  const n = typeof raw === "string" ? Number.parseInt(raw, 10) : Number(raw ?? 0);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

async function incrementViews(postId: string): Promise<number> {
  const pool = getDbPool();
  await pool.query("insert into public.blog_post_view_counts (post_id, views) values ($1, 0) on conflict do nothing", [
    postId,
  ]);
  const res = await pool.query<{ views: string | number }>(
    "update public.blog_post_view_counts set views = views + 1, updated_at = now() where post_id = $1 returning views",
    [postId],
  );
  const raw = res.rows[0]?.views;
  const n = typeof raw === "string" ? Number.parseInt(raw, 10) : Number(raw ?? 0);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export async function POST(request: Request) {
  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
  }

  const slug = normalizeSlug((payload as { slug?: unknown } | null)?.slug);
  if (!slug) {
    return NextResponse.json({ error: "Slug inválido." }, { status: 400 });
  }

  const postId = await resolvePublishedPostIdBySlug(slug);
  if (!postId) {
    return NextResponse.json({ error: "Post não encontrado." }, { status: 404 });
  }

  const cookieKey = `mt_blog_viewed_${slug}`;
  const hasCookie = request.headers.get("cookie")?.includes(`${cookieKey}=`) ?? false;

  const views = hasCookie ? await getCurrentViews(postId) : await incrementViews(postId);

  const res = NextResponse.json(
    { views },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );

  if (!hasCookie) {
    res.cookies.set(cookieKey, "1", {
      path: "/",
      maxAge: 60 * 60 * 12,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    });
  }

  return res;
}
