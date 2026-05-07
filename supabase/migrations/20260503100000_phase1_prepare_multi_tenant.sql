create extension if not exists pgcrypto;

alter table public.published_sermons
  add column if not exists church_id uuid null;

alter table public.pre_sermons
  add column if not exists church_id uuid null;

alter table public.churches
  add column if not exists plan_type text not null default 'free';

alter table public.churches
  add column if not exists plan_status text not null default 'active';

alter table public.churches
  add column if not exists business_enabled_at timestamptz null;

alter table public.churches
  add column if not exists business_notes text null;

create index if not exists idx_published_sermons_church_id
  on public.published_sermons (church_id);

create index if not exists idx_pre_sermons_church_id
  on public.pre_sermons (church_id);

create index if not exists idx_churches_plan_type
  on public.churches (plan_type);

create index if not exists idx_churches_plan_status
  on public.churches (plan_status);
