alter table public.pre_sermons add column if not exists full_sermon text null;
alter table public.pre_sermons add column if not exists published_sermon_id uuid null;
alter table public.pre_sermons add column if not exists published_slug text null;
alter table public.pre_sermons add column if not exists published_at timestamp without time zone null;
