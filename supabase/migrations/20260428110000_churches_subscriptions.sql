create table if not exists public.churches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text null,
  state text null,
  status text not null default 'active',
  created_at timestamp without time zone not null default now(),
  updated_at timestamp without time zone not null default now()
);

alter table public.churches
  drop constraint if exists churches_status_check;
alter table public.churches
  add constraint churches_status_check check (status in ('active', 'inactive'));

create index if not exists churches_status_idx on public.churches (status);
create index if not exists churches_name_idx on public.churches (name);

drop trigger if exists mt_churches_set_updated_at on public.churches;
create trigger mt_churches_set_updated_at
before update on public.churches
for each row
execute function public.mt_set_updated_at();

alter table public.churches enable row level security;

drop policy if exists churches_select_active on public.churches;
create policy churches_select_active
on public.churches
for select
to anon, authenticated
using (status = 'active');

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid not null,
  provider text null,
  provider_customer_id text null,
  provider_subscription_id text null,
  plan text not null default 'free',
  status text not null default 'free',
  current_period_start timestamp without time zone null,
  current_period_end timestamp without time zone null,
  created_at timestamp without time zone not null default now(),
  updated_at timestamp without time zone not null default now()
);

alter table public.subscriptions
  drop constraint if exists subscriptions_plan_check;
alter table public.subscriptions
  add constraint subscriptions_plan_check check (plan in ('free', 'basic', 'pro', 'church'));

alter table public.subscriptions
  drop constraint if exists subscriptions_status_check;
alter table public.subscriptions
  add constraint subscriptions_status_check check (status in ('free', 'active', 'cancelled', 'expired', 'trialing'));

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'subscriptions'
      and constraint_name = 'subscriptions_leader_id_fkey'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_leader_id_fkey
      foreign key (leader_id)
      references public.profiles (auth_user_id)
      on delete cascade;
  end if;
end $$;

create unique index if not exists subscriptions_leader_id_key on public.subscriptions (leader_id);
create index if not exists subscriptions_status_idx on public.subscriptions (status);

drop trigger if exists mt_subscriptions_set_updated_at on public.subscriptions;
create trigger mt_subscriptions_set_updated_at
before update on public.subscriptions
for each row
execute function public.mt_set_updated_at();

alter table public.subscriptions enable row level security;

drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own
on public.subscriptions
for select
to authenticated
using (leader_id = auth.uid());

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'profiles'
      and constraint_name = 'profiles_church_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_church_id_fkey
      foreign key (church_id)
      references public.churches (id)
      on delete set null;
  end if;
end $$;

create index if not exists profiles_church_id_idx on public.profiles (church_id);
