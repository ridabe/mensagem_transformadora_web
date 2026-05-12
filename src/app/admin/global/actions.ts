"use server";

import { redirect } from "next/navigation";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/profiles";
import {
  ChurchPlanStatus,
  ChurchPlanStatusInfo,
  ChurchPlanType,
  isValidChurchPlanStatus,
  isValidChurchPlanType,
} from "@/features/admin/churches/churchPlans";

// Types
export type ChurchRow = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  status: "active" | "inactive";
  plan_type: ChurchPlanType;
  plan_status: ChurchPlanStatus;
  business_enabled_at: string | null;
  business_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileRowWithChurch = {
  id: string;
  auth_user_id: string;
  name: string;
  display_name: string;
  email: string;
  role: string;
  status: string;
  church_id: string | null;
  ministry_title: string | null;
  created_at: string;
};

export type BlogPostStatus = "draft" | "published" | "archived";

export type AdminBlogPostRow = {
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

type AdminBlogCategoryRow = { id: string; name: string; slug: string };
type AdminBlogTagRow = { id: string; name: string; slug: string };

// Helpers
function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
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

function parseBlogStatus(value: string): BlogPostStatus {
  if (value === "published") return "published";
  if (value === "archived") return "archived";
  return "draft";
}

function parseCsvList(value: string): string[] {
  const raw = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out.slice(0, 40);
}

function getPublicStoragePathFromUrl(url: string | null): { bucket: string; path: string } | null {
  const raw = typeof url === "string" ? url.trim() : "";
  if (!raw) return null;

  const marker = "/storage/v1/object/public/";
  const idx = raw.indexOf(marker);
  if (idx < 0) return null;
  const rest = raw.slice(idx + marker.length);
  const firstSlash = rest.indexOf("/");
  if (firstSlash <= 0) return null;
  const bucket = rest.slice(0, firstSlash);
  const path = rest.slice(firstSlash + 1);
  if (!bucket || !path) return null;
  return { bucket, path };
}

function parseStatus(value: string): "active" | "inactive" {
  return value === "inactive" ? "inactive" : "active";
}

function isPgDuplicateKeyError(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return String(code ?? "") === "23505";
}

// Query Actions
export async function getAllChurches(): Promise<ChurchRow[]> {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("churches")
    .select(
      "id,name,city,state,status,plan_type,plan_status,business_enabled_at,business_notes,created_at,updated_at",
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch churches: ${error.message}`);
  return (data || []) as ChurchRow[];
}

export async function getChurchById(id: string): Promise<ChurchRow | null> {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("churches")
    .select(
      "id,name,city,state,status,plan_type,plan_status,business_enabled_at,business_notes,created_at,updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch church: ${error.message}`);
  return (data || null) as ChurchRow | null;
}

export async function getChurchUsers(
  churchId: string,
): Promise<ProfileRowWithChurch[]> {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("profiles")
    .select(
      "id,auth_user_id,name,display_name,email,role,status,church_id,ministry_title,created_at",
    )
    .eq("church_id", churchId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch church users: ${error.message}`);
  return (data || []) as ProfileRowWithChurch[];
}

export async function getChurchPlanStatus(id: string): Promise<ChurchPlanStatusInfo | null> {
  const church = await getChurchById(id);
  if (!church) return null;
  return {
    plan_type: church.plan_type,
    plan_status: church.plan_status,
    business_enabled_at: church.business_enabled_at,
    business_notes: church.business_notes,
  };
}

export async function updateChurchPlan(input: {
  id: string;
  plan_type: ChurchPlanType;
  plan_status: ChurchPlanStatus;
  business_notes: string | null;
  name?: string;
  city?: string | null;
  state?: string | null;
  status?: "active" | "inactive";
}) {
  const existing = await getChurchById(input.id);
  if (!existing) {
    throw new Error(`Church with id ${input.id} not found`);
  }

  const updateData: Record<string, unknown> = {
    plan_type: input.plan_type,
    plan_status: input.plan_status,
    business_notes: input.business_notes,
  };

  if (typeof input.name !== "undefined") updateData.name = input.name;
  if (typeof input.city !== "undefined") updateData.city = input.city ?? null;
  if (typeof input.state !== "undefined") updateData.state = input.state ?? null;
  if (typeof input.status !== "undefined") updateData.status = input.status;

  if (input.plan_type === "business" && input.plan_status === "active" && !existing.business_enabled_at) {
    updateData.business_enabled_at = new Date().toISOString();
  }

  const service = createServiceRoleClient();
  const { error } = await service.from("churches").update(updateData).eq("id", input.id);
  if (error) {
    throw new Error(`Failed to update church plan: ${error.message}`);
  }
}

export async function activateBusinessPlan(id: string, businessNotes: string | null = null) {
  return updateChurchPlan({
    id,
    plan_type: "business",
    plan_status: "active",
    business_notes: businessNotes,
  });
}

export async function suspendBusinessPlan(id: string, businessNotes: string | null = null) {
  return updateChurchPlan({
    id,
    plan_type: "business",
    plan_status: "suspended",
    business_notes: businessNotes,
  });
}

export async function cancelBusinessPlan(id: string, businessNotes: string | null = null) {
  return updateChurchPlan({
    id,
    plan_type: "business",
    plan_status: "cancelled",
    business_notes: businessNotes,
  });
}

export async function getAllBlogPosts(): Promise<AdminBlogPostRow[]> {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("blog_posts")
    .select(
      "id,author_id,title,slug,excerpt,content,cover_image_url,status,is_featured,seo_title,seo_description,published_at,created_at,updated_at",
    )
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch blog posts: ${error.message}`);
  return (data ?? []) as AdminBlogPostRow[];
}

export async function getBlogPostById(id: string): Promise<AdminBlogPostRow | null> {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("blog_posts")
    .select(
      "id,author_id,title,slug,excerpt,content,cover_image_url,status,is_featured,seo_title,seo_description,published_at,created_at,updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch blog post: ${error.message}`);
  return (data ?? null) as AdminBlogPostRow | null;
}

export async function getBlogCategories(): Promise<AdminBlogCategoryRow[]> {
  const service = createServiceRoleClient();
  const { data, error } = await service.from("blog_categories").select("id,name,slug").order("name", { ascending: true });
  if (error) throw new Error(`Failed to fetch blog categories: ${error.message}`);
  return (data ?? []) as AdminBlogCategoryRow[];
}

export async function getBlogTags(): Promise<AdminBlogTagRow[]> {
  const service = createServiceRoleClient();
  const { data, error } = await service.from("blog_tags").select("id,name,slug").order("name", { ascending: true });
  if (error) throw new Error(`Failed to fetch blog tags: ${error.message}`);
  return (data ?? []) as AdminBlogTagRow[];
}

export async function getBlogPostCategorySlugs(postId: string): Promise<string[]> {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("blog_post_categories")
    .select("blog_categories(slug)")
    .eq("post_id", postId)
    .limit(100);
  if (error) return [];
  const rows = Array.isArray(data) ? (data as Array<{ blog_categories?: { slug?: string | null } | null }>) : [];
  return rows.map((r) => String(r.blog_categories?.slug ?? "")).filter(Boolean);
}

export async function getBlogPostTagSlugs(postId: string): Promise<string[]> {
  const service = createServiceRoleClient();
  const { data, error } = await service.from("blog_post_tags").select("blog_tags(slug)").eq("post_id", postId).limit(200);
  if (error) return [];
  const rows = Array.isArray(data) ? (data as Array<{ blog_tags?: { slug?: string | null } | null }>) : [];
  return rows.map((r) => String(r.blog_tags?.slug ?? "")).filter(Boolean);
}

export async function createBlogCategoryAction(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login?error=forbidden");
  }

  const name = normalizeOptionalText(getString(formData.get("name")));
  const slugInput = getString(formData.get("slug"));
  const slug = normalizeSlug(slugInput) || normalizeSlug(name ?? "");

  if (!name) redirect("/admin/global/blog/categorias?error=name");
  if (!slug) redirect("/admin/global/blog/categorias?error=slug");

  const service = createServiceRoleClient();
  const { error } = await service.from("blog_categories").insert({ name, slug });
  if (error) {
    redirect(`/admin/global/blog/categorias?error=${encodeURIComponent(isPgDuplicateKeyError(error) ? "slug_taken" : "create")}`);
  }

  redirect("/admin/global/blog/categorias?saved=1");
}

export async function updateBlogCategoryAction(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login?error=forbidden");
  }

  const id = getString(formData.get("id"));
  if (!id) redirect("/admin/global/blog/categorias?error=invalid");

  const name = normalizeOptionalText(getString(formData.get("name")));
  const slugInput = getString(formData.get("slug"));
  const slug = normalizeSlug(slugInput) || normalizeSlug(name ?? "");

  if (!name) redirect(`/admin/global/blog/categorias?error=name&id=${encodeURIComponent(id)}`);
  if (!slug) redirect(`/admin/global/blog/categorias?error=slug&id=${encodeURIComponent(id)}`);

  const service = createServiceRoleClient();
  const { error } = await service.from("blog_categories").update({ name, slug }).eq("id", id);
  if (error) {
    redirect(
      `/admin/global/blog/categorias?error=${encodeURIComponent(isPgDuplicateKeyError(error) ? "slug_taken" : "update")}&id=${encodeURIComponent(id)}`,
    );
  }

  redirect(`/admin/global/blog/categorias?saved=1&id=${encodeURIComponent(id)}`);
}

export async function deleteBlogCategoryAction(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login?error=forbidden");
  }

  const id = getString(formData.get("id"));
  if (!id) redirect("/admin/global/blog/categorias?error=invalid");

  const confirm = getString(formData.get("confirm_delete")) === "1";
  if (!confirm) redirect(`/admin/global/blog/categorias?error=confirm_delete&id=${encodeURIComponent(id)}`);

  const service = createServiceRoleClient();
  const { error } = await service.from("blog_categories").delete().eq("id", id);
  if (error) redirect("/admin/global/blog/categorias?error=delete");

  redirect("/admin/global/blog/categorias?saved=1");
}

export async function createBlogTagAction(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login?error=forbidden");
  }

  const name = normalizeOptionalText(getString(formData.get("name")));
  const slugInput = getString(formData.get("slug"));
  const slug = normalizeSlug(slugInput) || normalizeSlug(name ?? "");

  if (!name) redirect("/admin/global/blog/tags?error=name");
  if (!slug) redirect("/admin/global/blog/tags?error=slug");

  const service = createServiceRoleClient();
  const { error } = await service.from("blog_tags").insert({ name, slug });
  if (error) {
    redirect(`/admin/global/blog/tags?error=${encodeURIComponent(isPgDuplicateKeyError(error) ? "slug_taken" : "create")}`);
  }

  redirect("/admin/global/blog/tags?saved=1");
}

export async function updateBlogTagAction(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login?error=forbidden");
  }

  const id = getString(formData.get("id"));
  if (!id) redirect("/admin/global/blog/tags?error=invalid");

  const name = normalizeOptionalText(getString(formData.get("name")));
  const slugInput = getString(formData.get("slug"));
  const slug = normalizeSlug(slugInput) || normalizeSlug(name ?? "");

  if (!name) redirect(`/admin/global/blog/tags?error=name&id=${encodeURIComponent(id)}`);
  if (!slug) redirect(`/admin/global/blog/tags?error=slug&id=${encodeURIComponent(id)}`);

  const service = createServiceRoleClient();
  const { error } = await service.from("blog_tags").update({ name, slug }).eq("id", id);
  if (error) {
    redirect(
      `/admin/global/blog/tags?error=${encodeURIComponent(isPgDuplicateKeyError(error) ? "slug_taken" : "update")}&id=${encodeURIComponent(id)}`,
    );
  }

  redirect(`/admin/global/blog/tags?saved=1&id=${encodeURIComponent(id)}`);
}

export async function deleteBlogTagAction(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login?error=forbidden");
  }

  const id = getString(formData.get("id"));
  if (!id) redirect("/admin/global/blog/tags?error=invalid");

  const confirm = getString(formData.get("confirm_delete")) === "1";
  if (!confirm) redirect(`/admin/global/blog/tags?error=confirm_delete&id=${encodeURIComponent(id)}`);

  const service = createServiceRoleClient();
  const { error } = await service.from("blog_tags").delete().eq("id", id);
  if (error) redirect("/admin/global/blog/tags?error=delete");

  redirect("/admin/global/blog/tags?saved=1");
}

// Write Actions
export async function createChurchAction(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login?error=forbidden");
  }

  const name = normalizeOptionalText(getString(formData.get("name")));
  const city = normalizeOptionalText(getString(formData.get("city")));
  const state = normalizeOptionalText(getString(formData.get("state")));
  const status = parseStatus(getString(formData.get("status")));

  if (!name) {
    redirect("/admin/global/igrejas?error=name");
  }

  const service = createServiceRoleClient();
  const { error } = await service.from("churches").insert({
    name,
    city: city || null,
    state: state || null,
    status,
    plan_type: "free",
    plan_status: "active",
  });

  if (error) {
    redirect("/admin/global/igrejas?error=create");
  }

  redirect("/admin/global/igrejas?saved=1");
}

export async function createBlogPostAction(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login?error=forbidden");
  }

  const title = normalizeOptionalText(getString(formData.get("title")));
  const slug = normalizeSlug(getString(formData.get("slug"))) || normalizeSlug(title ?? "");

  if (!title) redirect("/admin/global/blog/novo?error=title");
  if (!slug) redirect("/admin/global/blog/novo?error=slug");

  const excerpt = normalizeOptionalText(getString(formData.get("excerpt")));
  const content = normalizeOptionalText(getString(formData.get("content")));
  const isFeatured = getString(formData.get("is_featured")) === "1";
  const seoTitle = normalizeOptionalText(getString(formData.get("seo_title")));
  const seoDescription = normalizeOptionalText(getString(formData.get("seo_description")));

  const status = parseBlogStatus(getString(formData.get("status")));
  const categoriesCsv = getString(formData.get("categories"));
  const tagsCsv = getString(formData.get("tags"));
  const coverFile = formData.get("cover_image");

  const profile = await requireAdmin();
  const service = createServiceRoleClient();

  const { data: created, error } = await service
    .from("blog_posts")
    .insert({
      author_id: profile.authUserId,
      title,
      slug,
      excerpt,
      content,
      is_featured: isFeatured,
      seo_title: seoTitle,
      seo_description: seoDescription,
      status,
      published_at: status === "published" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error || !created?.id) {
    const isDuplicate = String((error as { code?: string } | null)?.code ?? "") === "23505";
    redirect(`/admin/global/blog/novo?error=${encodeURIComponent(isDuplicate ? "slug_taken" : "create")}`);
  }

  const postId = String(created.id);

  if (coverFile instanceof File && coverFile.size > 0) {
    try {
      const ext = coverFile.name.includes(".") ? coverFile.name.split(".").pop() : "";
      const safeExt = typeof ext === "string" && ext.length <= 6 ? ext.toLowerCase() : "jpg";
      const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${safeExt}`;
      const path = `posts/${postId}/${fileName}`;

      const bytes = new Uint8Array(await coverFile.arrayBuffer());
      const { error: uploadError } = await service.storage.from("blog-covers").upload(path, bytes, {
        contentType: coverFile.type || "application/octet-stream",
        upsert: true,
      });

      if (!uploadError) {
        const { data } = service.storage.from("blog-covers").getPublicUrl(path);
        const coverUrl = data.publicUrl ? String(data.publicUrl) : null;
        if (coverUrl) {
          await service.from("blog_posts").update({ cover_image_url: coverUrl }).eq("id", postId);
        }
      }
    } catch {
    }
  }

  try {
    await syncBlogPostCategoriesAndTags(service, postId, categoriesCsv, tagsCsv);
  } catch {
  }

  redirect(`/admin/global/blog/${encodeURIComponent(postId)}/editar?saved=1`);
}

async function syncBlogPostCategoriesAndTags(
  service: ReturnType<typeof createServiceRoleClient>,
  postId: string,
  categoriesCsv: string,
  tagsCsv: string,
) {
  const categoryItems = parseCsvList(categoriesCsv).map((name) => ({ name, slug: normalizeSlug(name) })).filter((c) => c.slug);
  const tagItems = parseCsvList(tagsCsv).map((name) => ({ name, slug: normalizeSlug(name) })).filter((t) => t.slug);

  if (!categoryItems.length) {
    await service.from("blog_post_categories").delete().eq("post_id", postId);
  } else {
    const { data: existingCategories } = await service.from("blog_categories").select("id,slug").in(
      "slug",
      categoryItems.map((c) => c.slug),
    );
    const existing = new Map<string, string>();
    for (const row of (existingCategories ?? []) as Array<{ id: string; slug: string }>) {
      existing.set(String(row.slug), String(row.id));
    }

    const toInsert = categoryItems.filter((c) => !existing.has(c.slug));
    if (toInsert.length) {
      const { data: created } = await service
        .from("blog_categories")
        .upsert(toInsert.map((c) => ({ name: c.name, slug: c.slug })), { onConflict: "slug" })
        .select("id,slug");
      for (const row of (created ?? []) as Array<{ id: string; slug: string }>) {
        existing.set(String(row.slug), String(row.id));
      }
    }

    await service.from("blog_post_categories").delete().eq("post_id", postId);
    const relRows = categoryItems
      .map((c) => ({ post_id: postId, category_id: existing.get(c.slug) }))
      .filter((r) => r.category_id) as Array<{ post_id: string; category_id: string }>;
    if (relRows.length) {
      await service.from("blog_post_categories").insert(relRows);
    }
  }

  if (!tagItems.length) {
    await service.from("blog_post_tags").delete().eq("post_id", postId);
  } else {
    const { data: existingTags } = await service.from("blog_tags").select("id,slug").in(
      "slug",
      tagItems.map((t) => t.slug),
    );
    const existing = new Map<string, string>();
    for (const row of (existingTags ?? []) as Array<{ id: string; slug: string }>) {
      existing.set(String(row.slug), String(row.id));
    }

    const toInsert = tagItems.filter((t) => !existing.has(t.slug));
    if (toInsert.length) {
      const { data: created } = await service
        .from("blog_tags")
        .upsert(toInsert.map((t) => ({ name: t.name, slug: t.slug })), { onConflict: "slug" })
        .select("id,slug");
      for (const row of (created ?? []) as Array<{ id: string; slug: string }>) {
        existing.set(String(row.slug), String(row.id));
      }
    }

    await service.from("blog_post_tags").delete().eq("post_id", postId);
    const relRows = tagItems
      .map((t) => ({ post_id: postId, tag_id: existing.get(t.slug) }))
      .filter((r) => r.tag_id) as Array<{ post_id: string; tag_id: string }>;
    if (relRows.length) {
      await service.from("blog_post_tags").insert(relRows);
    }
  }
}

export async function updateBlogPostAction(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login?error=forbidden");
  }

  const id = getString(formData.get("id"));
  if (!id) redirect("/admin/global/blog?error=invalid");

  const title = normalizeOptionalText(getString(formData.get("title")));
  const slug = normalizeSlug(getString(formData.get("slug")));

  if (!title) redirect(`/admin/global/blog/${encodeURIComponent(id)}/editar?error=title`);
  if (!slug) redirect(`/admin/global/blog/${encodeURIComponent(id)}/editar?error=slug`);

  const excerpt = normalizeOptionalText(getString(formData.get("excerpt")));
  const content = normalizeOptionalText(getString(formData.get("content")));
  const isFeatured = getString(formData.get("is_featured")) === "1";
  const seoTitle = normalizeOptionalText(getString(formData.get("seo_title")));
  const seoDescription = normalizeOptionalText(getString(formData.get("seo_description")));
  const status = parseBlogStatus(getString(formData.get("status")));

  const categoriesCsv = getString(formData.get("categories"));
  const tagsCsv = getString(formData.get("tags"));

  const coverFile = formData.get("cover_image");
  const service = createServiceRoleClient();

  const existing = await getBlogPostById(id);
  const nextPublishedAt =
    status === "published" ? (existing?.published_at ? String(existing.published_at) : new Date().toISOString()) : null;

  let coverUrl: string | null = null;
  if (coverFile instanceof File && coverFile.size > 0) {
    const ext = coverFile.name.includes(".") ? coverFile.name.split(".").pop() : "";
    const safeExt = typeof ext === "string" && ext.length <= 6 ? ext.toLowerCase() : "jpg";
    const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${safeExt}`;
    const path = `posts/${id}/${fileName}`;

    const bytes = new Uint8Array(await coverFile.arrayBuffer());
    const { error: uploadError } = await service.storage.from("blog-covers").upload(path, bytes, {
      contentType: coverFile.type || "application/octet-stream",
      upsert: true,
    });

    if (!uploadError) {
      const { data } = service.storage.from("blog-covers").getPublicUrl(path);
      coverUrl = data.publicUrl ? String(data.publicUrl) : null;
    }
  }

  const updateData: Record<string, unknown> = {
    title,
    slug,
    excerpt,
    content,
    is_featured: isFeatured,
    seo_title: seoTitle,
    seo_description: seoDescription,
    status,
    published_at: nextPublishedAt,
  };
  if (coverUrl) updateData.cover_image_url = coverUrl;

  const { error } = await service.from("blog_posts").update(updateData).eq("id", id);
  if (error) {
    const isDuplicate = String((error as { code?: string } | null)?.code ?? "") === "23505";
    redirect(`/admin/global/blog/${encodeURIComponent(id)}/editar?error=${encodeURIComponent(isDuplicate ? "slug_taken" : "update")}`);
  }

  try {
    await syncBlogPostCategoriesAndTags(service, id, categoriesCsv, tagsCsv);
  } catch {
  }

  redirect(`/admin/global/blog/${encodeURIComponent(id)}/editar?saved=1`);
}

export async function publishBlogPostAction(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login?error=forbidden");
  }
  const id = getString(formData.get("id"));
  if (!id) redirect("/admin/global/blog");
  const service = createServiceRoleClient();
  await service.from("blog_posts").update({ status: "published", published_at: new Date().toISOString() }).eq("id", id);
  redirect(`/admin/global/blog/${encodeURIComponent(id)}/editar?saved=1`);
}

export async function archiveBlogPostAction(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login?error=forbidden");
  }
  const id = getString(formData.get("id"));
  if (!id) redirect("/admin/global/blog");
  const service = createServiceRoleClient();
  await service.from("blog_posts").update({ status: "archived" }).eq("id", id);
  redirect(`/admin/global/blog/${encodeURIComponent(id)}/editar?saved=1`);
}

export async function deleteBlogPostAction(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login?error=forbidden");
  }
  const id = getString(formData.get("id"));
  if (!id) redirect("/admin/global/blog");
  const confirm = getString(formData.get("confirm_delete")) === "1";
  if (!confirm) {
    redirect(`/admin/global/blog/${encodeURIComponent(id)}/editar?error=confirm_delete`);
  }

  const service = createServiceRoleClient();
  const existing = await getBlogPostById(id);
  if (existing?.cover_image_url) {
    const parsed = getPublicStoragePathFromUrl(existing.cover_image_url);
    if (parsed?.bucket === "blog-covers") {
      try {
        await service.storage.from("blog-covers").remove([parsed.path]);
      } catch {
      }
    }
  }

  await service.from("blog_posts").delete().eq("id", id);
  redirect("/admin/global/blog?saved=1");
}

export async function updateChurchAction(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login?error=forbidden");
  }

  const id = getString(formData.get("id"));
  if (!id) {
    redirect("/admin/global/igrejas");
  }

  const name = normalizeOptionalText(getString(formData.get("name")));
  const city = normalizeOptionalText(getString(formData.get("city")));
  const state = normalizeOptionalText(getString(formData.get("state")));
  const status = parseStatus(getString(formData.get("status")));
  const planTypeInput = getString(formData.get("plan_type"));
  const planStatusInput = getString(formData.get("plan_status"));
  const businessNotes = normalizeOptionalText(getString(formData.get("business_notes")));

  if (!name) {
    redirect(`/admin/global/igrejas?error=name&id=${encodeURIComponent(id)}`);
  }

  if (!isValidChurchPlanType(planTypeInput)) {
    redirect(`/admin/global/igrejas?error=plan_type&id=${encodeURIComponent(id)}`);
  }

  if (!isValidChurchPlanStatus(planStatusInput)) {
    redirect(`/admin/global/igrejas?error=plan_status&id=${encodeURIComponent(id)}`);
  }

  try {
    await updateChurchPlan({
      id,
      name,
      city,
      state,
      status,
      plan_type: planTypeInput,
      plan_status: planStatusInput,
      business_notes: businessNotes,
    });
  } catch {
    redirect(`/admin/global/igrejas?error=update&id=${encodeURIComponent(id)}`);
  }

  redirect("/admin/global/igrejas?saved=1");
}

export async function toggleChurchStatusAction(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login?error=forbidden");
  }

  const id = getString(formData.get("id"));
  const newStatus = parseStatus(getString(formData.get("new_status")));

  if (!id) {
    redirect("/admin/global/igrejas");
  }

  const service = createServiceRoleClient();
  const { error } = await service.from("churches").update({ status: newStatus }).eq("id", id);

  if (error) {
    redirect(`/admin/global/igrejas?error=status&id=${encodeURIComponent(id)}`);
  }

  redirect("/admin/global/igrejas?saved=1");
}
