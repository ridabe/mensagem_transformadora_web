import { getCurrentProfile } from "@/lib/auth/profiles";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export type BlogPostStatus = "draft" | "published" | "archived";

export type BlogPostRow = {
  id: string;
  author_id: string | null;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  status: BlogPostStatus | string;
  is_featured: boolean;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

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

async function assertAdmin() {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Usuário não autenticado.");
  if (profile.status !== "active") throw new Error("Acesso negado.");
  if (profile.role !== "admin") throw new Error("Acesso negado.");
  return profile;
}

export async function getPublishedBlogPosts(input?: { limit?: number }) {
  const supabase = await createClient();
  const limit = typeof input?.limit === "number" && input.limit > 0 ? Math.min(input.limit, 100) : 20;

  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      "id,author_id,title,slug,excerpt,cover_image_url,status,is_featured,seo_title,seo_description,published_at,created_at,updated_at",
    )
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Falha ao buscar posts publicados: ${error.message}`);
  return (data ?? []) as BlogPostRow[];
}

export async function getBlogPostBySlug(slug: string) {
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

  if (error) throw new Error(`Falha ao buscar post: ${error.message}`);
  return (data ?? null) as BlogPostRow | null;
}

export async function createBlogPost(input: {
  title: string;
  slug: string;
  excerpt?: string | null;
  content?: string | null;
  cover_image_url?: string | null;
  is_featured?: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
}) {
  const admin = await assertAdmin();
  const service = createServiceRoleClient();

  const title = String(input.title ?? "").trim();
  const slug = normalizeSlug(input.slug);
  if (!title) throw new Error("Título é obrigatório.");
  if (!slug) throw new Error("Slug é obrigatório.");

  const { data, error } = await service
    .from("blog_posts")
    .insert({
      author_id: admin.authUserId,
      title,
      slug,
      excerpt: typeof input.excerpt === "string" ? input.excerpt.trim() : input.excerpt ?? null,
      content: typeof input.content === "string" ? input.content.trim() : input.content ?? null,
      cover_image_url:
        typeof input.cover_image_url === "string" ? input.cover_image_url.trim() : input.cover_image_url ?? null,
      is_featured: Boolean(input.is_featured),
      seo_title: typeof input.seo_title === "string" ? input.seo_title.trim() : input.seo_title ?? null,
      seo_description:
        typeof input.seo_description === "string" ? input.seo_description.trim() : input.seo_description ?? null,
      status: "draft",
    })
    .select(
      "id,author_id,title,slug,excerpt,content,cover_image_url,status,is_featured,seo_title,seo_description,published_at,created_at,updated_at",
    )
    .single();

  if (error) {
    const isDuplicate = String((error as { code?: string } | null)?.code ?? "") === "23505";
    if (isDuplicate) throw new Error("Slug já está em uso.");
    throw new Error(`Falha ao criar post: ${error.message}`);
  }

  return data as BlogPostRow;
}

export async function updateBlogPost(
  id: string,
  patch: Partial<{
    title: string;
    slug: string;
    excerpt: string | null;
    content: string | null;
    cover_image_url: string | null;
    is_featured: boolean;
    seo_title: string | null;
    seo_description: string | null;
  }>,
) {
  await assertAdmin();
  const service = createServiceRoleClient();

  const safeId = String(id ?? "").trim();
  if (!safeId) throw new Error("ID inválido.");

  const updateData: Record<string, unknown> = {};

  if (typeof patch.title !== "undefined") {
    const title = String(patch.title ?? "").trim();
    if (!title) throw new Error("Título é obrigatório.");
    updateData.title = title;
  }

  if (typeof patch.slug !== "undefined") {
    const slug = normalizeSlug(patch.slug);
    if (!slug) throw new Error("Slug é obrigatório.");
    updateData.slug = slug;
  }

  if (typeof patch.excerpt !== "undefined") {
    updateData.excerpt = typeof patch.excerpt === "string" ? patch.excerpt.trim() : patch.excerpt ?? null;
  }

  if (typeof patch.content !== "undefined") {
    updateData.content = typeof patch.content === "string" ? patch.content.trim() : patch.content ?? null;
  }

  if (typeof patch.cover_image_url !== "undefined") {
    updateData.cover_image_url =
      typeof patch.cover_image_url === "string" ? patch.cover_image_url.trim() : patch.cover_image_url ?? null;
  }

  if (typeof patch.is_featured !== "undefined") {
    updateData.is_featured = Boolean(patch.is_featured);
  }

  if (typeof patch.seo_title !== "undefined") {
    updateData.seo_title = typeof patch.seo_title === "string" ? patch.seo_title.trim() : patch.seo_title ?? null;
  }

  if (typeof patch.seo_description !== "undefined") {
    updateData.seo_description =
      typeof patch.seo_description === "string" ? patch.seo_description.trim() : patch.seo_description ?? null;
  }

  if (!Object.keys(updateData).length) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select(
        "id,author_id,title,slug,excerpt,content,cover_image_url,status,is_featured,seo_title,seo_description,published_at,created_at,updated_at",
      )
      .eq("id", safeId)
      .maybeSingle();
    if (error) throw new Error(`Falha ao carregar post: ${error.message}`);
    return (data ?? null) as BlogPostRow | null;
  }

  const { data, error } = await service
    .from("blog_posts")
    .update(updateData)
    .eq("id", safeId)
    .select(
      "id,author_id,title,slug,excerpt,content,cover_image_url,status,is_featured,seo_title,seo_description,published_at,created_at,updated_at",
    )
    .maybeSingle();

  if (error) {
    const isDuplicate = String((error as { code?: string } | null)?.code ?? "") === "23505";
    if (isDuplicate) throw new Error("Slug já está em uso.");
    throw new Error(`Falha ao atualizar post: ${error.message}`);
  }

  return (data ?? null) as BlogPostRow | null;
}

export async function publishBlogPost(id: string) {
  await assertAdmin();
  const service = createServiceRoleClient();

  const safeId = String(id ?? "").trim();
  if (!safeId) throw new Error("ID inválido.");

  const now = new Date().toISOString();
  const { data, error } = await service
    .from("blog_posts")
    .update({ status: "published", published_at: now })
    .eq("id", safeId)
    .select(
      "id,author_id,title,slug,excerpt,content,cover_image_url,status,is_featured,seo_title,seo_description,published_at,created_at,updated_at",
    )
    .maybeSingle();

  if (error) throw new Error(`Falha ao publicar post: ${error.message}`);
  return (data ?? null) as BlogPostRow | null;
}

export async function archiveBlogPost(id: string) {
  await assertAdmin();
  const service = createServiceRoleClient();

  const safeId = String(id ?? "").trim();
  if (!safeId) throw new Error("ID inválido.");

  const { data, error } = await service
    .from("blog_posts")
    .update({ status: "archived" })
    .eq("id", safeId)
    .select(
      "id,author_id,title,slug,excerpt,content,cover_image_url,status,is_featured,seo_title,seo_description,published_at,created_at,updated_at",
    )
    .maybeSingle();

  if (error) throw new Error(`Falha ao arquivar post: ${error.message}`);
  return (data ?? null) as BlogPostRow | null;
}

