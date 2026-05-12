import type { MetadataRoute } from "next";

import { buildSiteUrl } from "@/app/api/_shared/slug";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const revalidate = 3600;

type BlogSitemapPostRow = {
  slug: string;
  updated_at: string;
  published_at: string | null;
};

async function fetchAllPublishedBlogPostsForSitemap(): Promise<BlogSitemapPostRow[]> {
  const service = createServiceRoleClient();
  const out: BlogSitemapPostRow[] = [];

  const pageSize = 1000;
  for (let offset = 0; offset < 10000; offset += pageSize) {
    const { data, error } = await service
      .from("blog_posts")
      .select("slug,updated_at,published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) break;
    const rows = (data ?? []) as BlogSitemapPostRow[];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }

  return out;
}

async function fetchAllBlogCategorySlugs(): Promise<string[]> {
  const service = createServiceRoleClient();
  const { data } = await service.from("blog_categories").select("slug").order("name", { ascending: true }).limit(2000);
  const rows = Array.isArray(data) ? (data as Array<{ slug?: string | null }>) : [];
  return rows.map((r) => String(r.slug ?? "")).filter(Boolean);
}

async function fetchAllBlogTagSlugs(): Promise<string[]> {
  const service = createServiceRoleClient();
  const { data } = await service.from("blog_tags").select("slug").order("name", { ascending: true }).limit(5000);
  const rows = Array.isArray(data) ? (data as Array<{ slug?: string | null }>) : [];
  return rows.map((r) => String(r.slug ?? "")).filter(Boolean);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = buildSiteUrl() ?? "https://mensagem-transformadora-web.vercel.app";

  const [posts, categorySlugs, tagSlugs] = await Promise.all([
    fetchAllPublishedBlogPostsForSitemap(),
    fetchAllBlogCategorySlugs(),
    fetchAllBlogTagSlugs(),
  ]);

  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${base}/blog`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  for (const p of posts) {
    const last = new Date(p.updated_at || p.published_at || now.toISOString());
    entries.push({
      url: `${base}/blog/${encodeURIComponent(p.slug)}`,
      lastModified: Number.isFinite(last.getTime()) ? last : now,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  for (const slug of categorySlugs) {
    entries.push({
      url: `${base}/blog/categoria/${encodeURIComponent(slug)}`,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  for (const slug of tagSlugs) {
    entries.push({
      url: `${base}/blog/tag/${encodeURIComponent(slug)}`,
      changeFrequency: "weekly",
      priority: 0.5,
    });
  }

  return entries;
}
