import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { buildSiteUrl } from "@/app/api/_shared/slug";
import { createClient } from "@/lib/supabase/server";
import { formatPtBrDate, truncateText } from "@/lib/format";
import bannerBlogImage from "../../../../../img/banner_blog.png";

type BlogPostListRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  created_at: string;
};

type BlogCategoryRow = { id: string; name: string; slug: string };
type BlogTagRow = { id: string; name: string; slug: string };
type BlogPopularPost = { id: string; title: string; slug: string; views: number };

function parseAdvancedQuery(input: string): { q: string; tag?: string } {
  const raw = String(input ?? "").trim();
  if (!raw) return { q: "" };

  const tokens = raw.split(/\s+/g).filter(Boolean);
  let tag: string | undefined;
  const kept: string[] = [];

  for (const t of tokens) {
    const lower = t.toLowerCase();
    if (!tag && (lower.startsWith("tag:") || lower.startsWith("tags:"))) {
      const v = t.slice(t.indexOf(":") + 1).trim();
      if (v) tag = v;
      continue;
    }
    kept.push(t);
  }

  return { q: kept.join(" ").trim(), tag };
}

async function fetchPopularPosts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: { candidatePostIds: string[]; limit: number },
): Promise<BlogPopularPost[]> {
  const limit = Math.max(1, Math.min(input.limit, 10));
  const candidateSet = new Set(input.candidatePostIds);
  if (!candidateSet.size) return [];

  const { data: countsData } = await supabase
    .from("blog_post_view_counts")
    .select("post_id,views")
    .order("views", { ascending: false })
    .limit(5000);

  const rawCounts = Array.isArray(countsData) ? (countsData as Array<{ post_id?: unknown; views?: unknown }>) : [];
  const orderedIds: string[] = [];
  const viewsById = new Map<string, number>();

  for (const row of rawCounts) {
    const postId = String(row.post_id ?? "");
    if (!postId || !candidateSet.has(postId)) continue;
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
    .select("id,title,slug")
    .eq("status", "published")
    .in("id", orderedIds)
    .limit(limit);

  const posts = (postsData ?? []) as Array<{ id: string; title: string; slug: string }>;
  const byId = new Map(posts.map((p) => [p.id, p]));

  const out: BlogPopularPost[] = [];
  for (const id of orderedIds) {
    const p = byId.get(id);
    if (!p) continue;
    out.push({ ...p, views: viewsById.get(id) ?? 0 });
  }
  return out;
}

async function getRuntimeBaseUrl(): Promise<string> {
  const configured = buildSiteUrl();
  if (configured) return configured;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;

  return "http://localhost:3000";
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

function getString(
  sp: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  const v = sp?.[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function formatPostDate(post: Pick<BlogPostListRow, "published_at" | "created_at">): string {
  const raw = post.published_at || post.created_at;
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return "";
  return formatPtBrDate(d);
}

function buildCanonicalUrl(base: string, categorySlug: string, qs: string): string {
  const cleanBase = base.replace(/\/+$/, "");
  const cleanPath = `/blog/categoria/${encodeURIComponent(categorySlug)}`;
  const cleanQs = qs ? `?${qs}` : "";
  return `${cleanBase}${cleanPath}${cleanQs}`;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Record<string, string | string[] | undefined>;
}): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const categorySlug = normalizeSlug(rawSlug);
  if (!categorySlug) return {};

  const rawQ = getString(searchParams, "q")?.trim() ?? "";
  const parsed = parseAdvancedQuery(rawQ);
  const q = parsed.q;
  const tag = normalizeSlug((getString(searchParams, "tag")?.trim() ?? "") || (parsed.tag?.trim() ?? ""));
  const page = Math.min(parsePositiveInt(getString(searchParams, "page"), 1), 200);

  const base = await getRuntimeBaseUrl();
  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (tag) qs.set("tag", tag);
  if (page > 1) qs.set("page", String(page));

  const canonical = buildCanonicalUrl(base, categorySlug, qs.toString());

  const supabase = await createClient();
  const { data } = await supabase.from("blog_categories").select("name").eq("slug", categorySlug).maybeSingle();
  const categoryName = typeof data?.name === "string" && data.name.trim() ? data.name.trim() : categorySlug;

  const titleBase = `Categoria: ${categoryName} — Blog`;
  const title = page > 1 ? `${titleBase} (Página ${page})` : titleBase;
  const description = "Posts publicados filtrados por categoria no Blog Mensagem Transformadora.";

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

export default async function BlogCategoriaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug: rawSlug } = await params;
  const categorySlug = normalizeSlug(rawSlug);
  if (!categorySlug) notFound();

  const sp = searchParams ? await searchParams : undefined;
  const rawQ = getString(sp, "q")?.trim() ?? "";
  const parsed = parseAdvancedQuery(rawQ);
  const q = parsed.q;
  const tagSlug = normalizeSlug((getString(sp, "tag")?.trim() ?? "") || (parsed.tag?.trim() ?? ""));
  const page = Math.min(parsePositiveInt(getString(sp, "page"), 1), 200);
  const pageSize = 18;
  const offset = (page - 1) * pageSize;

  const supabase = await createClient();

  const [{ data: categoryRow }, { data: categories }, { data: tags }] = await Promise.all([
    supabase.from("blog_categories").select("id,name,slug").eq("slug", categorySlug).maybeSingle(),
    supabase.from("blog_categories").select("id,name,slug").order("name", { ascending: true }).limit(60),
    supabase.from("blog_tags").select("id,name,slug").order("name", { ascending: true }).limit(100),
  ]);

  const category = (categoryRow ?? null) as BlogCategoryRow | null;
  if (!category?.id) notFound();

  const safeCategories = (categories ?? []) as BlogCategoryRow[];
  const safeTags = (tags ?? []) as BlogTagRow[];

  const selectedTag = tagSlug ? safeTags.find((t) => t.slug === tagSlug) ?? null : null;

  const categoryPostIds = async (): Promise<string[]> => {
    const { data } = await supabase.from("blog_post_categories").select("post_id").eq("category_id", category.id).limit(5000);
    const rows = Array.isArray(data) ? (data as Array<{ post_id?: string | null }>) : [];
    const ids = rows.map((r) => String(r.post_id ?? "")).filter(Boolean);
    return ids.length ? ids : ["00000000-0000-0000-0000-000000000000"];
  };

  const tagPostIds = async (): Promise<string[] | null> => {
    if (!selectedTag?.id) return null;
    const { data } = await supabase.from("blog_post_tags").select("post_id").eq("tag_id", selectedTag.id).limit(5000);
    const rows = Array.isArray(data) ? (data as Array<{ post_id?: string | null }>) : [];
    const ids = rows.map((r) => String(r.post_id ?? "")).filter(Boolean);
    return ids.length ? ids : ["00000000-0000-0000-0000-000000000000"];
  };

  const [catIds, tagIds] = await Promise.all([categoryPostIds(), tagPostIds()]);
  const candidateIds = tagIds ? catIds.filter((id) => new Set(tagIds).has(id)) : catIds;

  let postsQuery = supabase
    .from("blog_posts")
    .select("id,title,slug,excerpt,cover_image_url,published_at,created_at")
    .eq("status", "published")
    .in("id", candidateIds);

  if (q) {
    const escaped = q.replaceAll(",", " ");
    postsQuery = postsQuery.or(`title.ilike.%${escaped}%,excerpt.ilike.%${escaped}%,content.ilike.%${escaped}%`);
  }

  const countQuery = supabase
    .from("blog_posts")
    .select("id", { count: "exact", head: true })
    .eq("status", "published")
    .in("id", candidateIds);

  if (q) {
    const escaped = q.replaceAll(",", " ");
    countQuery.or(`title.ilike.%${escaped}%,excerpt.ilike.%${escaped}%,content.ilike.%${escaped}%`);
  }

  const [{ data: posts }, { count }] = await Promise.all([
    postsQuery.order("published_at", { ascending: false }).order("created_at", { ascending: false }).range(offset, offset + pageSize - 1),
    countQuery,
  ]);

  const safePosts = (posts ?? []) as BlogPostListRow[];
  const popularPosts = await fetchPopularPosts(supabase, { candidatePostIds: candidateIds, limit: 6 }).catch(() => []);

  const totalItems = typeof count === "number" && Number.isFinite(count) ? Math.max(0, count) : null;
  const totalPages = totalItems ? Math.max(1, Math.ceil(totalItems / pageSize)) : null;
  const hasPrev = page > 1;
  const hasNext = totalPages ? page < totalPages : safePosts.length === pageSize;

  const buildPageHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (selectedTag?.slug) params.set("tag", selectedTag.slug);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return qs ? `/blog/categoria/${encodeURIComponent(category.slug)}?${qs}` : `/blog/categoria/${encodeURIComponent(category.slug)}`;
  };

  const siteUrl = buildSiteUrl() ?? "https://mensagem-transformadora-web.vercel.app";
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/blog` },
      { "@type": "ListItem", position: 3, name: category.name, item: `${siteUrl}/blog/categoria/${encodeURIComponent(category.slug)}` },
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
          <Image src={bannerBlogImage} alt="Blog Mensagem Transformadora" className="h-auto w-full" priority />
        </div>

        <header className="flex flex-col gap-3">
          <p className="inline-flex max-w-fit rounded-full bg-[var(--mt-gold)]/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-[var(--mt-gold)]">
            Blog
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{category.name}</h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            Posts publicados na categoria {category.name}.
          </p>
          <div>
            <Link href="/blog" className="inline-flex text-sm font-semibold text-[var(--mt-navy)] hover:underline">
              Ver todas as publicações
            </Link>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
          <div className="flex flex-col gap-6">
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
                  <p className="mt-2 text-sm text-slate-600">Assim que um post for publicado nesta categoria, ele aparecerá aqui.</p>
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
                    const active = c.slug === category.slug;
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
                    params.set("category", category.slug);
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
          </aside>
        </section>
      </div>
    </main>
  );
}
