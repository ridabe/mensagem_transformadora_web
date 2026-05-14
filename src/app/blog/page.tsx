import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { formatPtBrDate, truncateText } from "@/lib/format";
import { buildSiteUrl } from "@/app/api/_shared/slug";
import bannerBlogImage from "../../../img/banner_blog.png";

type BlogPostListRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  is_featured: boolean;
  published_at: string | null;
  created_at: string;
};

type BlogCategoryRow = {
  id: string;
  name: string;
  slug: string;
};

type BlogTagRow = {
  id: string;
  name: string;
  slug: string;
};

type BlogPopularPost = BlogPostListRow & { views: number };

async function getRuntimeBaseUrl(): Promise<string> {
  const configured = buildSiteUrl();
  if (configured) return configured;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;

  return "http://localhost:3000";
}

function getString(
  sp: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  const v = sp?.[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

function formatPostDate(post: Pick<BlogPostListRow, "published_at" | "created_at">): string {
  const raw = post.published_at || post.created_at;
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return "";
  return formatPtBrDate(d);
}

function buildBlogQueryString(input: { q?: string; category?: string; tag?: string }) {
  const params = new URLSearchParams();
  if (input.q?.trim()) params.set("q", input.q.trim());
  if (input.category?.trim()) params.set("category", input.category.trim());
  if (input.tag?.trim()) params.set("tag", input.tag.trim());
  return params.toString() ? `?${params.toString()}` : "";
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

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

function buildCanonicalUrl(base: string, path: string, qs: string): string {
  const cleanBase = base.replace(/\/+$/, "");
  const cleanPath = `/${path.replace(/^\/+/, "")}`;
  const cleanQs = qs.startsWith("?") ? qs : qs ? `?${qs}` : "";
  return `${cleanBase}${cleanPath}${cleanQs}`;
}

function parseAdvancedQuery(input: string): { q: string; tag?: string; category?: string } {
  const raw = String(input ?? "").trim();
  if (!raw) return { q: "" };

  const tokens = raw.split(/\s+/g).filter(Boolean);
  let tag: string | undefined;
  let category: string | undefined;
  const kept: string[] = [];

  for (const t of tokens) {
    const lower = t.toLowerCase();
    if (!tag && (lower.startsWith("tag:") || lower.startsWith("tags:"))) {
      const v = t.slice(t.indexOf(":") + 1).trim();
      if (v) tag = v;
      continue;
    }
    if (!category && (lower.startsWith("cat:") || lower.startsWith("categoria:") || lower.startsWith("category:"))) {
      const v = t.slice(t.indexOf(":") + 1).trim();
      if (v) category = v;
      continue;
    }
    kept.push(t);
  }

  return { q: kept.join(" ").trim(), tag, category };
}

async function fetchPopularPosts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: { candidatePostIds?: string[] | null; limit: number },
): Promise<BlogPopularPost[]> {
  const limit = Math.max(1, Math.min(input.limit, 12));
  const candidates = input.candidatePostIds ?? null;

  const maxCounts = candidates ? Math.min(Math.max(candidates.length, 50), 5000) : 5000;

  const countsQuery = supabase
    .from("blog_post_view_counts")
    .select("post_id,views")
    .order("views", { ascending: false })
    .limit(Math.min(maxCounts, 5000));

  const { data: countsData } = await countsQuery;
  const rawCounts = Array.isArray(countsData) ? (countsData as Array<{ post_id?: unknown; views?: unknown }>) : [];

  const orderedIds: string[] = [];
  const viewsById = new Map<string, number>();

  const candidateSet = candidates ? new Set(candidates) : null;
  for (const row of rawCounts) {
    const postId = String(row.post_id ?? "");
    if (!postId) continue;
    if (candidateSet && !candidateSet.has(postId)) continue;
    const v = typeof row.views === "number" ? row.views : Number(row.views ?? 0);
    const views = Number.isFinite(v) && v >= 0 ? v : 0;
    if (!views) continue;
    if (!viewsById.has(postId)) orderedIds.push(postId);
    viewsById.set(postId, views);
    if (orderedIds.length >= limit) break;
  }

  if (!orderedIds.length) return [];

  const { data: postsData } = await supabase
    .from("blog_posts")
    .select("id,title,slug,excerpt,cover_image_url,is_featured,published_at,created_at")
    .eq("status", "published")
    .in("id", orderedIds)
    .limit(limit);

  const posts = (postsData ?? []) as BlogPostListRow[];
  const byId = new Map(posts.map((p) => [p.id, p]));

  const out: BlogPopularPost[] = [];
  for (const id of orderedIds) {
    const p = byId.get(id);
    if (!p) continue;
    out.push({
      ...p,
      views: viewsById.get(id) ?? 0,
    });
  }
  return out;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}): Promise<Metadata> {
  const q = getString(searchParams, "q")?.trim() ?? "";
  const categorySlug = getString(searchParams, "category")?.trim() ?? "";
  const tagSlug = getString(searchParams, "tag")?.trim() ?? "";
  const page = Math.min(parsePositiveInt(getString(searchParams, "page"), 1), 200);

  const base = await getRuntimeBaseUrl();

  let title = "Blog — Mensagem Transformadora";
  if (q) title = `Buscar: ${q} — Blog`;
  else if (categorySlug) title = `Categoria: ${categorySlug} — Blog`;
  else if (tagSlug) title = `Tag: ${tagSlug} — Blog`;
  if (page > 1) title = `${title} (Página ${page})`;

  const description =
    q || categorySlug || tagSlug
      ? "Resultados filtrados do Blog Mensagem Transformadora."
      : "Artigos, reflexões e conteúdos para fortalecer sua caminhada e apoiar líderes e igrejas.";

  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (categorySlug) qs.set("category", categorySlug);
  if (tagSlug) qs.set("tag", tagSlug);
  if (page > 1) qs.set("page", String(page));

  const canonical = buildCanonicalUrl(base, "/blog", qs.toString());

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      locale: "pt_BR",
      siteName: "Mensagem Transformadora",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const rawQ = getString(sp, "q")?.trim() ?? "";
  const parsed = parseAdvancedQuery(rawQ);
  const q = parsed.q;
  const categorySlug = normalizeSlug((getString(sp, "category")?.trim() ?? "") || (parsed.category?.trim() ?? ""));
  const tagSlug = normalizeSlug((getString(sp, "tag")?.trim() ?? "") || (parsed.tag?.trim() ?? ""));
  const page = Math.min(parsePositiveInt(getString(sp, "page"), 1), 200);
  const pageSize = 18;
  const offset = (page - 1) * pageSize;

  const supabase = await createClient();

  const [{ data: categories }, { data: tags }] = await Promise.all([
    supabase.from("blog_categories").select("id,name,slug").order("name", { ascending: true }).limit(60),
    supabase.from("blog_tags").select("id,name,slug").order("name", { ascending: true }).limit(100),
  ]);

  const safeCategories = (categories ?? []) as BlogCategoryRow[];
  const safeTags = (tags ?? []) as BlogTagRow[];

  const selectedCategory = categorySlug
    ? safeCategories.find((c) => c.slug === categorySlug) ?? null
    : null;
  const selectedTag = tagSlug ? safeTags.find((t) => t.slug === tagSlug) ?? null : null;

  const activePostIdsByCategory = async (): Promise<string[] | null> => {
    if (!selectedCategory?.id) return null;
    const { data } = await supabase
      .from("blog_post_categories")
      .select("post_id")
      .eq("category_id", selectedCategory.id)
      .limit(5000);
    const rows = Array.isArray(data) ? (data as Array<{ post_id?: string | null }>) : [];
    const ids = rows.map((r) => String(r.post_id ?? "")).filter(Boolean);
    return ids.length ? ids : ["00000000-0000-0000-0000-000000000000"];
  };

  const activePostIdsByTag = async (): Promise<string[] | null> => {
    if (!selectedTag?.id) return null;
    const { data } = await supabase.from("blog_post_tags").select("post_id").eq("tag_id", selectedTag.id).limit(5000);
    const rows = Array.isArray(data) ? (data as Array<{ post_id?: string | null }>) : [];
    const ids = rows.map((r) => String(r.post_id ?? "")).filter(Boolean);
    return ids.length ? ids : ["00000000-0000-0000-0000-000000000000"];
  };

  const [categoryPostIds, tagPostIds] = await Promise.all([activePostIdsByCategory(), activePostIdsByTag()]);

  const popularCandidateIds =
    categoryPostIds && tagPostIds
      ? categoryPostIds.filter((id) => new Set(tagPostIds).has(id))
      : categoryPostIds || tagPostIds || null;

  let featuredQuery = supabase
    .from("blog_posts")
    .select("id,title,slug,excerpt,cover_image_url,is_featured,published_at,created_at")
    .eq("status", "published")
    .eq("is_featured", true);

  const showFeatured = page === 1;

  let postsQuery = supabase
    .from("blog_posts")
    .select("id,title,slug,excerpt,cover_image_url,is_featured,published_at,created_at")
    .eq("status", "published");

  if (q) {
    const escaped = q.replaceAll(",", " ");
    featuredQuery = featuredQuery.or(`title.ilike.%${escaped}%,excerpt.ilike.%${escaped}%,content.ilike.%${escaped}%`);
    postsQuery = postsQuery.or(`title.ilike.%${escaped}%,excerpt.ilike.%${escaped}%,content.ilike.%${escaped}%`);
  }

  if (categoryPostIds) {
    featuredQuery = featuredQuery.in("id", categoryPostIds);
    postsQuery = postsQuery.in("id", categoryPostIds);
  }

  if (tagPostIds) {
    featuredQuery = featuredQuery.in("id", tagPostIds);
    postsQuery = postsQuery.in("id", tagPostIds);
  }

  const { data: featuredRow } = await featuredQuery
    .order("published_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const featuredManual = (showFeatured ? featuredRow : null) as BlogPostListRow | null;

  if (featuredManual?.id) {
    postsQuery = postsQuery.neq("id", featuredManual.id);
  }

  const countQuery = supabase.from("blog_posts").select("id", { count: "exact", head: true }).eq("status", "published");

  if (q) {
    const escaped = q.replaceAll(",", " ");
    countQuery.or(`title.ilike.%${escaped}%,excerpt.ilike.%${escaped}%,content.ilike.%${escaped}%`);
  }
  if (categoryPostIds) countQuery.in("id", categoryPostIds);
  if (tagPostIds) countQuery.in("id", tagPostIds);
  if (featuredManual?.id) countQuery.neq("id", featuredManual.id);

  const [{ data: posts, error: postsError }, { data: recentPosts }, { count }] = await Promise.all([
    postsQuery
      .order("published_at", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1),
    supabase
      .from("blog_posts")
      .select("id,title,slug,published_at,created_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(6),
    countQuery,
  ]);

  if (postsError) {
    throw new Error("Falha ao carregar posts do blog.");
  }

  let safePosts = (posts ?? []) as BlogPostListRow[];
  const safeRecentPosts = (recentPosts ?? []) as Array<Pick<BlogPostListRow, "id" | "title" | "slug" | "published_at" | "created_at">>;

  const popularPosts = await fetchPopularPosts(supabase, { candidatePostIds: popularCandidateIds, limit: 6 }).catch(() => []);
  const featuredAuto =
    showFeatured && !featuredManual?.id && !q && !selectedCategory && !selectedTag ? popularPosts[0] ?? null : null;
  if (featuredAuto?.id) {
    safePosts = safePosts.filter((p) => p.id !== featuredAuto.id);
  }
  const featured = featuredManual ?? featuredAuto;

  const hasFilters = Boolean(q || selectedCategory || selectedTag);
  const filterLabel = q
    ? `Buscando por “${q}”`
    : selectedCategory
      ? `Categoria: ${selectedCategory.name}`
      : selectedTag
        ? `Tag: ${selectedTag.name}`
        : "";

  const totalItems = typeof count === "number" && Number.isFinite(count) ? Math.max(0, count) : null;
  const totalPages = totalItems ? Math.max(1, Math.ceil(totalItems / pageSize)) : null;
  const hasPrev = page > 1;
  const hasNext = totalPages ? page < totalPages : safePosts.length === pageSize;

  const buildPageHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (selectedCategory?.slug) params.set("category", selectedCategory.slug);
    if (selectedTag?.slug) params.set("tag", selectedTag.slug);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return qs ? `/blog?${qs}` : "/blog";
  };

  const siteUrl = buildSiteUrl() ?? "https://mensagem-transformadora-web.vercel.app";
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/blog` },
    ],
  };
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <Image
          src={bannerBlogImage}
          alt="Blog Mensagem Transformadora"
          className="h-auto w-full"
          priority
        />
      </div>
      <header className="flex flex-col gap-3">
        <p className="inline-flex max-w-fit rounded-full bg-[var(--mt-gold)]/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-[var(--mt-gold)]">
          Blog
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Mensagem Transformadora</h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Artigos, reflexões e conteúdos para fortalecer sua caminhada e apoiar líderes e igrejas.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="flex flex-col gap-6">
          {hasFilters ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-slate-600">{filterLabel}</p>
                <Link href="/blog" className="inline-flex text-sm font-semibold text-[var(--mt-navy)] hover:underline">
                  Limpar filtros
                </Link>
              </div>
            </div>
          ) : null}

          {featured ? (
            <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
              <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="relative">
                  {featured.cover_image_url ? (
                    <div className="relative min-h-[220px] w-full">
                      <Image
                        src={featured.cover_image_url}
                        alt={featured.title}
                        fill
                        sizes="(min-width: 1024px) 55vw, 100vw"
                        className="object-cover"
                        priority
                      />
                    </div>
                  ) : (
                    <div className="h-full min-h-[220px] w-full bg-[radial-gradient(circle_at_top_right,rgba(245,200,66,0.25),transparent_45%),radial-gradient(circle_at_30%_20%,rgba(36,54,96,0.18),transparent_40%),linear-gradient(180deg,rgba(26,39,68,0.14),rgba(26,39,68,0.04))]" />
                  )}
                </div>

                <div className="flex flex-col gap-4 p-6 sm:p-8">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex rounded-full bg-[var(--mt-amber)]/15 px-3 py-1 text-xs font-semibold text-[var(--mt-amber)]">
                      Em destaque
                    </span>
                    <span className="text-xs text-slate-600">{formatPostDate(featured)}</span>
                  </div>

                  <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{featured.title}</h2>
                  <p className="text-sm leading-6 text-slate-600">
                    {featured.excerpt ? truncateText(featured.excerpt, 220) : "Leia o post completo para aprofundar a reflexão."}
                  </p>

                  <div className="mt-1 flex flex-col gap-3 sm:flex-row">
                    <Link
                      href={`/blog/${encodeURIComponent(featured.slug)}`}
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mt-navy)] px-5 text-sm font-semibold text-white hover:opacity-95"
                    >
                      Leia mais
                    </Link>
                    <Link
                      href={`/blog${buildBlogQueryString({ q, category: selectedCategory?.slug ?? "", tag: selectedTag?.slug ?? "" })}`}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                    >
                      Ver todos
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ) : null}

          <section className="grid gap-4 sm:grid-cols-2">
            {safePosts.length ? (
              safePosts.map((post) => (
                <article
                  key={post.id}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:bg-slate-50"
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
                    {post.cover_image_url ? (
                      <Image
                        src={post.cover_image_url}
                        alt={post.title}
                        fill
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="h-full w-full bg-[radial-gradient(circle_at_top_right,rgba(245,200,66,0.18),transparent_40%),linear-gradient(180deg,rgba(26,39,68,0.10),rgba(26,39,68,0.02))]" />
                    )}
                  </div>

                  <div className="flex flex-col gap-3 p-5">
                    <p className="text-xs text-slate-600">{formatPostDate(post)}</p>
                    <h3 className="text-base font-semibold leading-6 tracking-tight">{post.title}</h3>
                    <p className="text-sm leading-6 text-slate-600">
                      {post.excerpt ? truncateText(post.excerpt, 140) : "Leia o post para conferir a mensagem completa."}
                    </p>

                    <div className="pt-1">
                      <Link
                        href={`/blog/${encodeURIComponent(post.slug)}`}
                        className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--mt-navy)] px-4 text-sm font-semibold text-white hover:opacity-95"
                      >
                        Leia mais
                      </Link>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="sm:col-span-2 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
                <p className="text-sm font-medium">Nenhum post encontrado</p>
                <p className="mt-2 text-sm text-slate-600">
                  {hasFilters ? "Tente ajustar sua busca ou filtros." : "Assim que um post for publicado, ele aparecerá aqui."}
                </p>
              </div>
            )}
          </section>

          {totalPages && totalPages > 1 ? (
            <nav className="mt-2 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-sm">
              <div className="text-slate-600">
                Página {page} de {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={hasPrev ? buildPageHref(page - 1) : "#"}
                  aria-disabled={!hasPrev}
                  className={
                    hasPrev
                      ? "inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-900 hover:bg-slate-50"
                      : "inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-400"
                  }
                >
                  Anterior
                </Link>
                <Link
                  href={hasNext ? buildPageHref(page + 1) : "#"}
                  aria-disabled={!hasNext}
                  className={
                    hasNext
                      ? "inline-flex h-10 items-center justify-center rounded-xl bg-[var(--mt-navy)] px-4 font-semibold text-white hover:opacity-95"
                      : "inline-flex h-10 items-center justify-center rounded-xl bg-slate-200 px-4 font-semibold text-slate-500"
                  }
                >
                  Próxima
                </Link>
              </div>
            </nav>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold">Buscar</h2>
            <form className="mt-3 flex flex-col gap-3">
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Buscar por título ou trecho…"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--mt-amber)]"
              />
              {selectedCategory?.slug ? <input type="hidden" name="category" value={selectedCategory.slug} /> : null}
              {selectedTag?.slug ? <input type="hidden" name="tag" value={selectedTag.slug} /> : null}
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mt-navy)] px-5 text-sm font-semibold text-white hover:opacity-95"
              >
                Buscar
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold">Posts recentes</h2>
            <div className="mt-3 flex flex-col gap-3">
              {safeRecentPosts.length ? (
                safeRecentPosts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/blog/${encodeURIComponent(p.slug)}`}
                    className="group rounded-xl border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50"
                  >
                    <p className="text-sm font-semibold leading-6 group-hover:underline">{p.title}</p>
                    <p className="mt-1 text-xs text-slate-600">{formatPostDate(p)}</p>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-slate-600">Ainda não há posts publicados.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold">Posts populares</h2>
            <div className="mt-3 flex flex-col gap-3">
              {popularPosts.length ? (
                popularPosts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/blog/${encodeURIComponent(p.slug)}`}
                    className="group rounded-xl border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50"
                  >
                    <p className="text-sm font-semibold leading-6 group-hover:underline">{p.title}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {new Intl.NumberFormat("pt-BR").format(p.views)} visualizações
                    </p>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-slate-600">Sem dados de visualização ainda.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold">Categorias</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {safeCategories.length ? (
                safeCategories.map((c) => {
                  const active = selectedCategory?.slug === c.slug;
                  const params = new URLSearchParams();
                  if (q) params.set("q", q);
                  if (selectedTag?.slug) params.set("tag", selectedTag.slug);
                  const qs = params.toString();
                  const href = qs ? `/blog/categoria/${encodeURIComponent(c.slug)}?${qs}` : `/blog/categoria/${encodeURIComponent(c.slug)}`;
                  return (
                    <Link
                      key={c.id}
                      href={href}
                      className={
                        active
                          ? "inline-flex items-center rounded-full bg-[var(--mt-navy)] px-3 py-1 text-xs font-semibold text-white"
                          : "inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-900 hover:bg-slate-50"
                      }
                    >
                      {c.name}
                    </Link>
                  );
                })
              ) : (
                <p className="text-sm text-slate-600">Sem categorias.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold">Tags</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {safeTags.length ? (
                safeTags.map((t) => {
                  const active = selectedTag?.slug === t.slug;
                  const params = new URLSearchParams();
                  if (q) params.set("q", q);
                  if (selectedCategory?.slug) params.set("category", selectedCategory.slug);
                  const qs = params.toString();
                  const href = qs ? `/blog/tag/${encodeURIComponent(t.slug)}?${qs}` : `/blog/tag/${encodeURIComponent(t.slug)}`;
                  return (
                    <Link
                      key={t.id}
                      href={href}
                      className={
                        active
                          ? "inline-flex items-center rounded-full bg-[var(--mt-gold)] px-3 py-1 text-xs font-semibold text-[var(--mt-navy)]"
                          : "inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-900 hover:bg-slate-50"
                      }
                    >
                      {t.name}
                    </Link>
                  );
                })
              ) : (
                <p className="text-sm text-slate-600">Sem tags.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold">Newsletter (em breve)</h2>
            <p className="mt-2 text-sm text-slate-600">Receba conteúdos do blog por e-mail quando lançarmos.</p>
            <form className="mt-3 flex flex-col gap-3">
              <input
                type="email"
                placeholder="Seu e-mail"
                disabled
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-500 outline-none"
              />
              <button
                type="button"
                disabled
                className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-200 px-5 text-sm font-semibold text-slate-500"
              >
                Quero receber
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold tracking-tight">Leve a mensagem para a igreja</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Organize sua pregação na web e deixe a congregação anotar no app durante o culto.
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <a
                href="https://play.google.com/store/search?q=mensagem%20transformadora&c=apps"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mt-navy)] px-5 text-sm font-semibold text-white hover:opacity-95"
              >
                Baixar meu app
              </a>
              <Link
                href="/cadastro"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                Criar conta grátis
              </Link>
            </div>
          </section>
        </aside>
      </section>
      </div>
    </main>
  );
}
