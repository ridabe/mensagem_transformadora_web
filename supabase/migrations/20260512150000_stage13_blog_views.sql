-- Stage 13: Contador de views do Blog (posts) + RLS

create table if not exists public.blog_post_view_counts (
  post_id uuid primary key references public.blog_posts (id) on delete cascade,
  views bigint not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists blog_post_view_counts_views_idx on public.blog_post_view_counts (views desc);
create index if not exists blog_post_view_counts_updated_at_idx on public.blog_post_view_counts (updated_at desc);

drop trigger if exists mt_blog_post_view_counts_set_updated_at on public.blog_post_view_counts;
create trigger mt_blog_post_view_counts_set_updated_at
before update on public.blog_post_view_counts
for each row
execute function public.mt_set_updated_at();

alter table public.blog_post_view_counts enable row level security;

drop policy if exists blog_post_view_counts_select_public on public.blog_post_view_counts;
create policy blog_post_view_counts_select_public
on public.blog_post_view_counts
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

drop policy if exists blog_post_view_counts_admin_all on public.blog_post_view_counts;
create policy blog_post_view_counts_admin_all
on public.blog_post_view_counts
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

grant select on table public.blog_post_view_counts to anon, authenticated;
grant insert, update, delete on table public.blog_post_view_counts to authenticated;

