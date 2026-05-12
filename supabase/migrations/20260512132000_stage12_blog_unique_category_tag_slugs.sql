-- Stage 12: Garantir slugs únicos em categorias e tags do Blog

drop index if exists public.blog_categories_slug_idx;
create unique index if not exists blog_categories_slug_key on public.blog_categories (slug);

drop index if exists public.blog_tags_slug_idx;
create unique index if not exists blog_tags_slug_key on public.blog_tags (slug);

