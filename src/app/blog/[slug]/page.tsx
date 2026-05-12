import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { buildSiteUrl } from "@/app/api/_shared/slug";
import { createClient } from "@/lib/supabase/server";
import { formatPtBrDate, truncateText } from "@/lib/format";
import { CopyLinkButton } from "./copy-link-button";
import { ViewsCounter } from "./views-counter";

type BlogPostRow = {
  id: string;
  author_id: string | null;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  status: string;
  is_featured: boolean;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type ProfileAuthorRow = {
  auth_user_id: string;
  display_name: string | null;
  name: string | null;
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

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

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

function buildBlogPostDescription(post: BlogPostRow): string {
  const seo = post.seo_description?.trim();
  if (seo) return truncateText(seo, 160);

  const excerpt = post.excerpt?.trim();
  if (excerpt) return truncateText(excerpt, 160);

  const content = post.content?.trim() ?? "";
  if (content) return truncateText(content, 160);

  return "Leia o post completo no Blog do Mensagem Transformadora.";
}

function sanitizeHtmlBasic(html: string): string {
  const input = String(html ?? "");
  if (!input.trim()) return "";
  return input
    .replaceAll(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replaceAll(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replaceAll(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "")
    .replaceAll(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    .replaceAll(/javascript:/gi, "");
}

function stripHtmlToText(html: string): string {
  const raw = String(html ?? "");
  return raw
    .replaceAll(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replaceAll(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replaceAll(/<\/?[^>]+>/g, " ")
    .replaceAll(/&nbsp;/gi, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function countWords(text: string): number {
  const raw = String(text ?? "").trim();
  if (!raw) return 0;
  return raw.split(/\s+/g).filter(Boolean).length;
}

function estimateReadingTimeMinutesFromHtml(html: string): { minutes: number; words: number } {
  const text = stripHtmlToText(html);
  const words = countWords(text);
  const minutes = Math.max(1, Math.ceil(words / 200));
  return { minutes, words };
}

function pickSingleRelationRow<T extends { id: string; name: string; slug: string }>(value: unknown): T | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    const first = value[0] as T | undefined;
    return first && typeof first === "object" ? first : null;
  }
  if (typeof value === "object") return value as T;
  return null;
}

function formatPostDate(post: Pick<BlogPostRow, "published_at" | "created_at">): string {
  const raw = post.published_at || post.created_at;
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return "";
  return formatPtBrDate(d);
}

async function fetchPublishedPostBySlug(slug: string): Promise<BlogPostRow | null> {
  const supabase = await createClient();
  const s = normalizeSlug(slug);
  if (!s) return null;

  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      "id,author_id,title,slug,excerpt,content,cover_image_url,status,is_featured,seo_title,seo_description,published_at,created_at,updated_at",
    )
    .eq("slug", s)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw new Error("Falha ao buscar post.");
  return (data ?? null) as BlogPostRow | null;
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const post = await fetchPublishedPostBySlug(rawSlug);
  if (!post) return {};

  const title = post.seo_title?.trim() || post.title;
  const description = buildBlogPostDescription(post);

  const siteUrl = buildSiteUrl() ?? (await getRuntimeBaseUrl());
  const canonical = `${siteUrl.replace(/\/+$/, "")}/blog/${post.slug}`;

  const images = post.cover_image_url ? [{ url: post.cover_image_url }] : undefined;

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      type: "article",
      title,
      description,
      url: canonical,
      locale: "pt_BR",
      siteName: "Mensagem Transformadora",
      images,
    },
    twitter: {
      card: post.cover_image_url ? "summary_large_image" : "summary",
      title,
      description,
      images: post.cover_image_url ? [post.cover_image_url] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug: rawSlug } = await params;
  const post = await fetchPublishedPostBySlug(rawSlug);
  if (!post) notFound();

  const supabase = await createClient();

  const [authorRes, categoriesRes, tagsRes] = await Promise.all([
    post.author_id
      ? supabase
          .from("profiles")
          .select("auth_user_id,display_name,name")
          .eq("auth_user_id", post.author_id)
          .maybeSingle<ProfileAuthorRow>()
      : Promise.resolve({ data: null as ProfileAuthorRow | null }),
    supabase
      .from("blog_post_categories")
      .select("blog_categories(id,name,slug)")
      .eq("post_id", post.id)
      .limit(30),
    supabase.from("blog_post_tags").select("blog_tags(id,name,slug)").eq("post_id", post.id).limit(60),
  ]);

  const authorName =
    authorRes.data?.display_name?.trim() ||
    authorRes.data?.name?.trim() ||
    "Mensagem Transformadora";

  const categories = Array.isArray(categoriesRes.data)
    ? (categoriesRes.data
        .map((r) => pickSingleRelationRow<BlogCategoryRow>((r as { blog_categories?: unknown }).blog_categories))
        .filter(Boolean) as BlogCategoryRow[])
    : [];

  const tags = Array.isArray(tagsRes.data)
    ? (tagsRes.data
        .map((r) => pickSingleRelationRow<BlogTagRow>((r as { blog_tags?: unknown }).blog_tags))
        .filter(Boolean) as BlogTagRow[])
    : [];

  const relatedPostIds = async (): Promise<string[] | null> => {
    if (!categories.length && !tags.length) return null;

    const categoryIds = categories.map((c) => c.id);
    const tagIds = tags.map((t) => t.id);

    const [cats, tgs] = await Promise.all([
      categoryIds.length
        ? supabase
            .from("blog_post_categories")
            .select("post_id")
            .in("category_id", categoryIds)
            .limit(250)
        : Promise.resolve({ data: [] as Array<{ post_id?: string | null }> }),
      tagIds.length
        ? supabase.from("blog_post_tags").select("post_id").in("tag_id", tagIds).limit(250)
        : Promise.resolve({ data: [] as Array<{ post_id?: string | null }> }),
    ]);

    const ids = new Set<string>();
    for (const row of Array.isArray(cats.data) ? cats.data : []) {
      const id = String((row as { post_id?: string | null }).post_id ?? "");
      if (id) ids.add(id);
    }
    for (const row of Array.isArray(tgs.data) ? tgs.data : []) {
      const id = String((row as { post_id?: string | null }).post_id ?? "");
      if (id) ids.add(id);
    }

    ids.delete(post.id);
    const arr = Array.from(ids);
    return arr.length ? arr : null;
  };

  const candidateIds = await relatedPostIds();

  let related: Array<Pick<BlogPostRow, "id" | "title" | "slug" | "excerpt" | "cover_image_url" | "published_at" | "created_at">> = [];
  if (candidateIds?.length) {
    const { data } = await supabase
      .from("blog_posts")
      .select("id,title,slug,excerpt,cover_image_url,published_at,created_at")
      .eq("status", "published")
      .in("id", candidateIds.slice(0, 60))
      .order("published_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(6);
    related = (data ?? []) as typeof related;
  }

  if (!related.length) {
    const { data } = await supabase
      .from("blog_posts")
      .select("id,title,slug,excerpt,cover_image_url,published_at,created_at")
      .eq("status", "published")
      .neq("id", post.id)
      .order("published_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(6);
    related = (data ?? []) as typeof related;
  }

  const siteUrl = buildSiteUrl() ?? (await getRuntimeBaseUrl());
  const shareUrl = `${siteUrl.replace(/\/+$/, "")}/blog/${post.slug}`;

  const reading = estimateReadingTimeMinutesFromHtml(post.content ?? "");

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.seo_title?.trim() || post.title,
    description: buildBlogPostDescription(post),
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at,
    mainEntityOfPage: { "@type": "WebPage", "@id": shareUrl },
    author: { "@type": "Person", name: authorName },
    publisher: {
      "@type": "Organization",
      name: "Mensagem Transformadora",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl.replace(/\/+$/, "")}/logo.svg`,
      },
    },
  };
  if (post.cover_image_url) jsonLd.image = [post.cover_image_url];
  if (reading.words) jsonLd.wordCount = reading.words;
  if (reading.minutes) jsonLd.timeRequired = `PT${reading.minutes}M`;
  if (categories.length) jsonLd.articleSection = categories.map((c) => c.name);
  if (tags.length) jsonLd.keywords = tags.map((t) => t.name).join(", ");

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="text-sm">
        <Link href="/blog" className="font-semibold text-[var(--mt-navy)] hover:underline">
          Blog
        </Link>
        <span className="text-slate-600"> {" / "} </span>
        <span className="text-slate-600">{post.title}</span>
      </nav>

      <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="relative">
          {post.cover_image_url ? (
            <div className="relative h-[260px] w-full sm:h-[340px]">
              <Image
                src={post.cover_image_url}
                alt={post.title}
                fill
                sizes="(min-width: 1024px) 896px, 100vw"
                className="object-cover"
                priority
              />
            </div>
          ) : (
            <div className="h-[220px] w-full bg-[radial-gradient(circle_at_top_right,rgba(245,200,66,0.22),transparent_45%),radial-gradient(circle_at_30%_20%,rgba(36,54,96,0.16),transparent_40%),linear-gradient(180deg,rgba(26,39,68,0.14),rgba(26,39,68,0.04))] sm:h-[300px]" />
          )}
        </div>

        <div className="flex flex-col gap-6 p-6 sm:p-10">
          <header className="flex flex-col gap-3">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
              <span>{authorName}</span>
              <span>•</span>
              <span>{formatPostDate(post)}</span>
              <span>•</span>
              <span>{reading.minutes} min de leitura</span>
              <span>•</span>
              <span>
                <ViewsCounter slug={post.slug} />
              </span>
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{post.title}</h1>
            {post.excerpt ? (
              <p className="max-w-3xl text-sm leading-7 text-slate-600">{post.excerpt}</p>
            ) : null}
          </header>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/blog/categoria/${encodeURIComponent(c.slug)}`}
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-900 hover:bg-slate-50"
                >
                  {c.name}
                </Link>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${post.title} ${shareUrl}`)}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-[var(--mt-navy)] hover:underline"
              >
                WhatsApp
              </a>
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(post.title)}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-[var(--mt-navy)] hover:underline"
              >
                X
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-[var(--mt-navy)] hover:underline"
              >
                Facebook
              </a>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(post.title)}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-[var(--mt-navy)] hover:underline"
              >
                Telegram
              </a>
              <CopyLinkButton url={shareUrl} />
            </div>
          </div>

          <section className="prose prose-neutral max-w-none">
            <div
              className="text-slate-900"
              dangerouslySetInnerHTML={{ __html: sanitizeHtmlBasic(post.content ?? "") }}
            />
          </section>

          {tags.length ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold">Tags</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.map((t) => (
                  <Link
                    key={t.id}
                    href={`/blog/tag/${encodeURIComponent(t.slug)}`}
                    className="inline-flex items-center rounded-full bg-[var(--mt-gold)] px-3 py-1 text-xs font-semibold text-[var(--mt-navy)] hover:opacity-95"
                  >
                    {t.name}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold">Newsletter (em breve)</h2>
            <p className="mt-2 text-sm text-slate-600">Estamos preparando novidades para envio por e-mail.</p>
            <form className="mt-3 flex flex-col gap-3 sm:flex-row">
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
        </div>
      </article>

      <section className="flex flex-col gap-4">
        <header className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold tracking-tight">Posts relacionados</h2>
          <p className="text-sm text-slate-600">Conteúdos semelhantes para continuar a leitura.</p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {related.map((p) => (
            <article
              key={p.id}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:bg-slate-50"
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
                {p.cover_image_url ? (
                  <Image
                    src={p.cover_image_url}
                    alt={p.title}
                    fill
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="h-full w-full bg-[radial-gradient(circle_at_top_right,rgba(245,200,66,0.18),transparent_40%),linear-gradient(180deg,rgba(26,39,68,0.10),rgba(26,39,68,0.02))]" />
                )}
              </div>

              <div className="flex flex-col gap-3 p-5">
                <p className="text-xs text-slate-600">{formatPostDate(p)}</p>
                <h3 className="text-base font-semibold leading-6 tracking-tight">{p.title}</h3>
                <p className="text-sm leading-6 text-slate-600">
                  {p.excerpt ? truncateText(p.excerpt, 140) : "Leia o post para conferir a mensagem completa."}
                </p>
                <div className="pt-1">
                  <Link
                    href={`/blog/${encodeURIComponent(p.slug)}`}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--mt-navy)] px-4 text-sm font-semibold text-white hover:opacity-95"
                  >
                    Leia mais
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
      </div>
    </main>
  );
}
