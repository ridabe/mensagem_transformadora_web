-- Stage 10: Estrutura base do Blog (posts, categorias, tags) + RLS

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid null references auth.users (id) on delete set null,
  title text not null,
  slug text not null,
  excerpt text null,
  content text null,
  cover_image_url text null,
  status text not null default 'draft',
  is_featured boolean not null default false,
  seo_title text null,
  seo_description text null,
  published_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.blog_posts
  drop constraint if exists blog_posts_status_check;
alter table public.blog_posts
  add constraint blog_posts_status_check check (status in ('draft', 'published', 'archived'));

create unique index if not exists blog_posts_slug_key on public.blog_posts (slug);
create index if not exists blog_posts_status_idx on public.blog_posts (status);
create index if not exists blog_posts_published_at_idx on public.blog_posts (published_at);
create index if not exists blog_posts_is_featured_idx on public.blog_posts (is_featured);

drop trigger if exists mt_blog_posts_set_updated_at on public.blog_posts;
create trigger mt_blog_posts_set_updated_at
before update on public.blog_posts
for each row
execute function public.mt_set_updated_at();

create table if not exists public.blog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text null,
  created_at timestamptz not null default now()
);

create index if not exists blog_categories_slug_idx on public.blog_categories (slug);

create table if not exists public.blog_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  created_at timestamptz not null default now()
);

create index if not exists blog_tags_slug_idx on public.blog_tags (slug);

create table if not exists public.blog_post_categories (
  post_id uuid not null references public.blog_posts (id) on delete cascade,
  category_id uuid not null references public.blog_categories (id) on delete cascade,
  primary key (post_id, category_id)
);

create index if not exists blog_post_categories_category_id_idx on public.blog_post_categories (category_id);

create table if not exists public.blog_post_tags (
  post_id uuid not null references public.blog_posts (id) on delete cascade,
  tag_id uuid not null references public.blog_tags (id) on delete cascade,
  primary key (post_id, tag_id)
);

create index if not exists blog_post_tags_tag_id_idx on public.blog_post_tags (tag_id);

alter table public.blog_posts enable row level security;
alter table public.blog_categories enable row level security;
alter table public.blog_tags enable row level security;
alter table public.blog_post_categories enable row level security;
alter table public.blog_post_tags enable row level security;

drop policy if exists blog_posts_select_published on public.blog_posts;
create policy blog_posts_select_published
on public.blog_posts
for select
to anon, authenticated
using (status = 'published');

drop policy if exists blog_posts_admin_all on public.blog_posts;
create policy blog_posts_admin_all
on public.blog_posts
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
      and p.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
      and p.status = 'active'
  )
);

drop policy if exists blog_categories_select_public on public.blog_categories;
create policy blog_categories_select_public
on public.blog_categories
for select
to anon, authenticated
using (true);

drop policy if exists blog_categories_admin_all on public.blog_categories;
create policy blog_categories_admin_all
on public.blog_categories
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
      and p.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
      and p.status = 'active'
  )
);

drop policy if exists blog_tags_select_public on public.blog_tags;
create policy blog_tags_select_public
on public.blog_tags
for select
to anon, authenticated
using (true);

drop policy if exists blog_tags_admin_all on public.blog_tags;
create policy blog_tags_admin_all
on public.blog_tags
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
      and p.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
      and p.status = 'active'
  )
);

drop policy if exists blog_post_categories_select_public on public.blog_post_categories;
create policy blog_post_categories_select_public
on public.blog_post_categories
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.blog_posts bp
    where bp.id = post_id
      and bp.status = 'published'
  )
);

drop policy if exists blog_post_categories_admin_all on public.blog_post_categories;
create policy blog_post_categories_admin_all
on public.blog_post_categories
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
      and p.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
      and p.status = 'active'
  )
);

drop policy if exists blog_post_tags_select_public on public.blog_post_tags;
create policy blog_post_tags_select_public
on public.blog_post_tags
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.blog_posts bp
    where bp.id = post_id
      and bp.status = 'published'
  )
);

drop policy if exists blog_post_tags_admin_all on public.blog_post_tags;
create policy blog_post_tags_admin_all
on public.blog_post_tags
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
      and p.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
      and p.status = 'active'
  )
);

grant select on table public.blog_posts to anon, authenticated;
grant select on table public.blog_categories to anon, authenticated;
grant select on table public.blog_tags to anon, authenticated;
grant select on table public.blog_post_categories to anon, authenticated;
grant select on table public.blog_post_tags to anon, authenticated;

grant insert, update, delete on table public.blog_posts to authenticated;
grant insert, update, delete on table public.blog_categories to authenticated;
grant insert, update, delete on table public.blog_tags to authenticated;
grant insert, update, delete on table public.blog_post_categories to authenticated;
grant insert, update, delete on table public.blog_post_tags to authenticated;
