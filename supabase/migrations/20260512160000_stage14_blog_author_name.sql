-- Stage 14: Adiciona campo author_name (texto livre) em blog_posts

alter table public.blog_posts
  add column if not exists author_name text null;
