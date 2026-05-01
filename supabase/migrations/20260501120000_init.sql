create extension if not exists pgcrypto;

create or replace function public.mt_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique not null,
  name text not null,
  display_name text not null,
  email text not null,
  ministry_title text null,
  role text not null default 'leader',
  church_id uuid null,
  status text not null default 'active',
  created_at timestamp without time zone not null default now(),
  updated_at timestamp without time zone not null default now()
);

alter table public.profiles add column if not exists auth_user_id uuid;
alter table public.profiles add column if not exists name text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists ministry_title text;
alter table public.profiles add column if not exists role text;
alter table public.profiles add column if not exists church_id uuid;
alter table public.profiles add column if not exists status text;
alter table public.profiles add column if not exists created_at timestamp without time zone;
alter table public.profiles add column if not exists updated_at timestamp without time zone;

alter table public.profiles
  alter column id set default gen_random_uuid();

update public.profiles
set auth_user_id = coalesce(auth_user_id, id)
where auth_user_id is null;

update public.profiles
set email = concat('unknown+', auth_user_id::text, '@local')
where email is null;

update public.profiles
set display_name = coalesce(
  nullif(display_name, ''),
  nullif(name, ''),
  nullif(split_part(email, '@', 1), ''),
  'Usuário'
)
where display_name is null or display_name = '';

update public.profiles
set name = coalesce(nullif(name, ''), display_name)
where name is null or name = '';

update public.profiles
set role = coalesce(nullif(role, ''), 'leader')
where role is null or role = '';

update public.profiles
set status = coalesce(nullif(status, ''), 'active')
where status is null or status = '';

update public.profiles
set created_at = coalesce(created_at, now())
where created_at is null;

update public.profiles
set updated_at = coalesce(updated_at, now())
where updated_at is null;

create unique index if not exists profiles_auth_user_id_key
  on public.profiles (auth_user_id);

alter table public.profiles
  alter column auth_user_id set not null,
  alter column name set not null,
  alter column display_name set not null,
  alter column email set not null,
  alter column role set not null,
  alter column status set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

alter table public.profiles
  alter column role set default 'leader',
  alter column status set default 'active',
  alter column created_at set default now(),
  alter column updated_at set default now();

alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'leader'));

alter table public.profiles
  drop constraint if exists profiles_status_check;
alter table public.profiles
  add constraint profiles_status_check check (status in ('active', 'blocked', 'pending'));

alter table public.profiles
  drop constraint if exists profiles_ministry_title_check;
alter table public.profiles
  add constraint profiles_ministry_title_check
  check (
    ministry_title is null
    or ministry_title in ('pastor', 'diacono', 'bispo', 'apostolo', 'missionario', 'pregador')
  );

create or replace function public.mt_profiles_before_insert()
returns trigger
language plpgsql
as $$
begin
  if new.id is null then
    new.id := gen_random_uuid();
  end if;

  if new.auth_user_id is null then
    new.auth_user_id := new.id;
  end if;

  if new.email is null or new.email = '' then
    new.email := concat('unknown+', new.auth_user_id::text, '@local');
  end if;

  if new.display_name is null or new.display_name = '' then
    new.display_name := nullif(split_part(new.email, '@', 1), '');
    if new.display_name is null then
      new.display_name := 'Usuário';
    end if;
  end if;

  if new.name is null or new.name = '' then
    new.name := new.display_name;
  end if;

  if new.role is null or new.role = '' then
    new.role := 'leader';
  end if;

  if new.status is null or new.status = '' then
    new.status := 'active';
  end if;

  if new.created_at is null then
    new.created_at := now();
  end if;

  if new.updated_at is null then
    new.updated_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists mt_profiles_before_insert on public.profiles;
create trigger mt_profiles_before_insert
before insert on public.profiles
for each row
execute function public.mt_profiles_before_insert();

drop trigger if exists mt_profiles_set_updated_at on public.profiles;
create trigger mt_profiles_set_updated_at
before update on public.profiles
for each row
execute function public.mt_set_updated_at();

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

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid null,
  owner_type text not null default 'leader',
  owner_id uuid not null default auth.uid(),
  church_id uuid null,
  provider text not null default 'abacatepay',
  provider_customer_id text null,
  provider_subscription_id text null,
  provider_checkout_id text null,
  provider_product_id text null,
  plan text not null default 'free',
  status text not null default 'free',
  current_period_start timestamp without time zone null,
  current_period_end timestamp without time zone null,
  trial_ends_at timestamp without time zone null,
  cancelled_at timestamp without time zone null,
  last_payment_at timestamp without time zone null,
  metadata jsonb null,
  created_at timestamp without time zone not null default now(),
  updated_at timestamp without time zone not null default now()
);

alter table public.subscriptions add column if not exists owner_type text;
alter table public.subscriptions add column if not exists owner_id uuid;
alter table public.subscriptions add column if not exists church_id uuid;
alter table public.subscriptions add column if not exists provider_checkout_id text;
alter table public.subscriptions add column if not exists provider_product_id text;
alter table public.subscriptions add column if not exists trial_ends_at timestamp without time zone;
alter table public.subscriptions add column if not exists cancelled_at timestamp without time zone;
alter table public.subscriptions add column if not exists last_payment_at timestamp without time zone;
alter table public.subscriptions add column if not exists metadata jsonb;

alter table public.subscriptions
  alter column owner_type set default 'leader',
  alter column owner_id set default auth.uid(),
  alter column provider set default 'abacatepay';

update public.subscriptions
set
  owner_type = coalesce(nullif(owner_type, ''), 'leader'),
  owner_id = coalesce(owner_id, leader_id),
  provider = coalesce(nullif(provider, ''), 'abacatepay'),
  updated_at = now()
where owner_id is null
   or owner_type is null
   or owner_type = ''
   or provider is null
   or provider = '';

alter table public.subscriptions
  alter column owner_type set not null,
  alter column owner_id set not null,
  alter column provider set not null;

alter table public.subscriptions
  drop constraint if exists subscriptions_owner_type_check;
alter table public.subscriptions
  add constraint subscriptions_owner_type_check check (owner_type in ('leader', 'church'));

alter table public.subscriptions
  drop constraint if exists subscriptions_plan_check;
alter table public.subscriptions
  add constraint subscriptions_plan_check check (
    plan in (
      'free',
      'basic',
      'pro',
      'church',
      'leader_pro_monthly',
      'church_monthly',
      'plano_basico',
      'plano_pro'
    )
  );

alter table public.subscriptions
  drop constraint if exists subscriptions_status_check;
alter table public.subscriptions
  add constraint subscriptions_status_check check (
    status in (
      'free',
      'pending',
      'active',
      'cancelled',
      'expired',
      'trialing',
      'past_due',
      'unpaid',
      'incomplete',
      'failed'
    )
  );

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

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'subscriptions'
      and constraint_name = 'subscriptions_church_id_fkey'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_church_id_fkey
      foreign key (church_id)
      references public.churches (id)
      on delete set null;
  end if;
end $$;

create unique index if not exists subscriptions_leader_id_key on public.subscriptions (leader_id);
create unique index if not exists subscriptions_owner_key on public.subscriptions (owner_type, owner_id);
create index if not exists subscriptions_status_idx on public.subscriptions (status);

create or replace function public.mt_subscriptions_before_write()
returns trigger
language plpgsql
as $$
begin
  new.owner_type := coalesce(nullif(new.owner_type, ''), 'leader');
  new.provider := coalesce(nullif(new.provider, ''), 'abacatepay');

  if new.owner_type = 'leader' then
    new.owner_id := coalesce(new.owner_id, new.leader_id, auth.uid());
    new.leader_id := coalesce(new.leader_id, new.owner_id);
  elsif new.owner_type = 'church' then
    new.owner_id := coalesce(new.owner_id, new.church_id);
    new.church_id := coalesce(new.church_id, new.owner_id);
  end if;

  if new.owner_id is null then
    raise exception 'owner_id é obrigatório';
  end if;

  return new;
end;
$$;

drop trigger if exists mt_subscriptions_before_write on public.subscriptions;
create trigger mt_subscriptions_before_write
before insert or update on public.subscriptions
for each row
execute function public.mt_subscriptions_before_write();

drop trigger if exists mt_subscriptions_set_updated_at on public.subscriptions;
create trigger mt_subscriptions_set_updated_at
before update on public.subscriptions
for each row
execute function public.mt_set_updated_at();

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text null,
  price_in_cents integer not null,
  currency text not null default 'BRL',
  billing_cycle text not null,
  abacatepay_product_id text null,
  monthly_pre_sermon_limit integer null,
  max_leaders integer null,
  is_active boolean not null default true,
  created_at timestamp without time zone not null default now(),
  updated_at timestamp without time zone not null default now()
);

create index if not exists plans_is_active_idx on public.plans (is_active);

drop trigger if exists mt_plans_set_updated_at on public.plans;
create trigger mt_plans_set_updated_at
before update on public.plans
for each row
execute function public.mt_set_updated_at();

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_type text not null,
  provider_event_id text null,
  provider_subscription_id text null,
  payload jsonb not null,
  processed_at timestamp without time zone null,
  created_at timestamp without time zone not null default now()
);

create unique index if not exists payment_events_provider_event_id_key
  on public.payment_events (provider_event_id)
  where provider_event_id is not null;

create index if not exists payment_events_provider_subscription_id_idx
  on public.payment_events (provider_subscription_id);

create index if not exists payment_events_created_at_idx
  on public.payment_events (created_at desc);

create or replace function public.mt_generate_share_code(prefix text, code_length integer)
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  output text := '';
  i integer;
  idx integer;
begin
  if code_length is null or code_length < 1 then
    raise exception 'code_length inválido';
  end if;

  for i in 1..code_length loop
    idx := (get_byte(gen_random_bytes(1), 0) % length(alphabet)) + 1;
    output := output || substr(alphabet, idx, 1);
  end loop;

  return prefix || output;
end;
$$;

create or replace function public.mt_generate_pre_sermon_share_code()
returns text
language sql
as $$
  select public.mt_generate_share_code('MT-', 5);
$$;

create table if not exists public.pre_sermons (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid not null,
  church_id uuid null,
  share_code text unique not null,
  title text not null,
  main_verse text not null,
  secondary_verses jsonb null,
  notes text null,
  full_sermon text null,
  published_sermon_id uuid null,
  published_slug text null,
  published_at timestamp without time zone null,
  status text not null default 'active',
  created_at timestamp without time zone not null default now(),
  updated_at timestamp without time zone not null default now()
);

alter table public.pre_sermons
  drop constraint if exists pre_sermons_status_check;
alter table public.pre_sermons
  add constraint pre_sermons_status_check check (status in ('draft', 'active', 'archived'));

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'pre_sermons'
      and constraint_name = 'pre_sermons_leader_id_fkey'
  ) then
    alter table public.pre_sermons
      add constraint pre_sermons_leader_id_fkey
      foreign key (leader_id)
      references public.profiles (auth_user_id)
      on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'pre_sermons'
      and constraint_name = 'pre_sermons_church_id_fkey'
  ) then
    alter table public.pre_sermons
      add constraint pre_sermons_church_id_fkey
      foreign key (church_id)
      references public.churches (id)
      on delete set null;
  end if;
end $$;

create unique index if not exists pre_sermons_share_code_key on public.pre_sermons (share_code);
create index if not exists pre_sermons_leader_id_idx on public.pre_sermons (leader_id);
create index if not exists pre_sermons_church_id_idx on public.pre_sermons (church_id);
create index if not exists pre_sermons_status_idx on public.pre_sermons (status);
create index if not exists pre_sermons_updated_at_idx on public.pre_sermons (updated_at desc);

create or replace function public.mt_pre_sermons_before_write()
returns trigger
language plpgsql
as $$
declare
  candidate text;
  attempts integer := 0;
begin
  if tg_op = 'INSERT' then
    if new.share_code is not null and new.share_code <> '' then
      raise exception 'share_code é gerado automaticamente';
    end if;

    loop
      attempts := attempts + 1;
      candidate := public.mt_generate_pre_sermon_share_code();

      if not exists (
        select 1
        from public.pre_sermons
        where share_code = candidate
      ) then
        new.share_code := candidate;
        exit;
      end if;

      if attempts >= 25 then
        raise exception 'Não foi possível gerar um share_code único';
      end if;
    end loop;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.share_code is distinct from old.share_code then
      raise exception 'share_code não pode ser alterado';
    end if;

    if new.leader_id is distinct from old.leader_id then
      raise exception 'leader_id não pode ser alterado';
    end if;

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists mt_pre_sermons_before_write on public.pre_sermons;
create trigger mt_pre_sermons_before_write
before insert or update on public.pre_sermons
for each row
execute function public.mt_pre_sermons_before_write();

drop trigger if exists mt_pre_sermons_set_updated_at on public.pre_sermons;
create trigger mt_pre_sermons_set_updated_at
before update on public.pre_sermons
for each row
execute function public.mt_set_updated_at();

create table if not exists public.published_sermons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  local_sermon_id text null,
  user_name text not null,
  preacher_name text not null,
  church_name text not null,
  sermon_date date not null,
  sermon_time text null,
  sermon_title text not null,
  slug text not null,
  main_verse text not null,
  secondary_verses jsonb not null default '[]'::jsonb,
  introduction text null,
  key_points jsonb not null default '[]'::jsonb,
  highlighted_phrases jsonb not null default '[]'::jsonb,
  personal_observations text null,
  practical_applications text null,
  conclusion text null,
  final_summary text null,
  visibility text not null default 'public',
  status text not null default 'published',
  source text not null default 'android_app',
  views_count integer not null default 0,
  published_at timestamp without time zone null,
  created_at timestamp without time zone not null default now(),
  updated_at timestamp without time zone not null default now()
);

create unique index if not exists published_sermons_slug_key on public.published_sermons (slug);
create index if not exists published_sermons_user_id_idx on public.published_sermons (user_id);
create index if not exists published_sermons_public_idx on public.published_sermons (source, visibility, status, sermon_date desc);

alter table public.published_sermons
  drop constraint if exists published_sermons_visibility_check;
alter table public.published_sermons
  add constraint published_sermons_visibility_check check (visibility in ('public', 'private'));

alter table public.published_sermons
  drop constraint if exists published_sermons_status_check;
alter table public.published_sermons
  add constraint published_sermons_status_check check (status in ('draft', 'published', 'unpublished', 'archived'));

alter table public.published_sermons
  drop constraint if exists published_sermons_source_check;
alter table public.published_sermons
  add constraint published_sermons_source_check check (source in ('android_app', 'web_admin', 'import'));

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'published_sermons'
      and constraint_name = 'published_sermons_user_id_fkey'
  ) then
    alter table public.published_sermons
      add constraint published_sermons_user_id_fkey
      foreign key (user_id)
      references public.profiles (auth_user_id)
      on delete cascade;
  end if;
end $$;

drop trigger if exists mt_published_sermons_set_updated_at on public.published_sermons;
create trigger mt_published_sermons_set_updated_at
before update on public.published_sermons
for each row
execute function public.mt_set_updated_at();

create table if not exists public.publication_events (
  id uuid primary key default gen_random_uuid(),
  sermon_id uuid not null,
  user_id uuid not null,
  event_type text not null,
  old_status text null,
  new_status text null,
  old_visibility text null,
  new_visibility text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp without time zone not null default now()
);

create index if not exists publication_events_sermon_id_idx on public.publication_events (sermon_id);
create index if not exists publication_events_user_id_idx on public.publication_events (user_id);
create index if not exists publication_events_created_at_idx on public.publication_events (created_at desc);

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'publication_events'
      and constraint_name = 'publication_events_sermon_id_fkey'
  ) then
    alter table public.publication_events
      add constraint publication_events_sermon_id_fkey
      foreign key (sermon_id)
      references public.published_sermons (id)
      on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'publication_events'
      and constraint_name = 'publication_events_user_id_fkey'
  ) then
    alter table public.publication_events
      add constraint publication_events_user_id_fkey
      foreign key (user_id)
      references public.profiles (auth_user_id)
      on delete cascade;
  end if;
end $$;

alter table public.profiles enable row level security;
alter table public.churches enable row level security;
alter table public.subscriptions enable row level security;
alter table public.plans enable row level security;
alter table public.payment_events enable row level security;
alter table public.pre_sermons enable row level security;
alter table public.published_sermons enable row level security;
alter table public.publication_events enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (auth.uid() = auth_user_id);

drop policy if exists profiles_insert_own_leader on public.profiles;
create policy profiles_insert_own_leader
on public.profiles
for insert
to authenticated
with check (
  auth.uid() = auth_user_id
  and role = 'leader'
  and status in ('active', 'pending', 'blocked')
);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id and role = 'leader');

drop policy if exists churches_select_active on public.churches;
create policy churches_select_active
on public.churches
for select
to anon, authenticated
using (status = 'active');

drop policy if exists churches_select_own on public.churches;
create policy churches_select_own
on public.churches
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.church_id = churches.id
  )
);

drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own
on public.subscriptions
for select
to authenticated
using (
  leader_id = auth.uid()
  or (owner_type = 'leader' and owner_id = auth.uid())
);

drop policy if exists subscriptions_insert_own_free on public.subscriptions;
create policy subscriptions_insert_own_free
on public.subscriptions
for insert
to authenticated
with check (
  owner_type = 'leader'
  and owner_id = auth.uid()
  and leader_id = auth.uid()
  and plan = 'free'
  and status = 'free'
);

drop policy if exists plans_select_active on public.plans;
create policy plans_select_active
on public.plans
for select
to anon, authenticated
using (is_active = true);

drop policy if exists pre_sermons_select_own on public.pre_sermons;
create policy pre_sermons_select_own
on public.pre_sermons
for select
to authenticated
using (leader_id = auth.uid());

drop policy if exists pre_sermons_insert_own on public.pre_sermons;
create policy pre_sermons_insert_own
on public.pre_sermons
for insert
to authenticated
with check (leader_id = auth.uid());

drop policy if exists pre_sermons_update_own on public.pre_sermons;
create policy pre_sermons_update_own
on public.pre_sermons
for update
to authenticated
using (leader_id = auth.uid())
with check (leader_id = auth.uid());

drop policy if exists published_sermons_select_public on public.published_sermons;
create policy published_sermons_select_public
on public.published_sermons
for select
to anon, authenticated
using (
  visibility = 'public'
  and status = 'published'
  and source = 'web_admin'
);

drop policy if exists published_sermons_select_own on public.published_sermons;
create policy published_sermons_select_own
on public.published_sermons
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists published_sermons_insert_own on public.published_sermons;
create policy published_sermons_insert_own
on public.published_sermons
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists published_sermons_update_own on public.published_sermons;
create policy published_sermons_update_own
on public.published_sermons
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists publication_events_insert_own on public.publication_events;
create policy publication_events_insert_own
on public.publication_events
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists publication_events_select_own on public.publication_events;
create policy publication_events_select_own
on public.publication_events
for select
to authenticated
using (user_id = auth.uid());

insert into public.plans (
  code,
  name,
  description,
  price_in_cents,
  currency,
  billing_cycle,
  monthly_pre_sermon_limit,
  max_leaders,
  is_active
)
values
  ('free', 'Gratuito', 'Plano gratuito com limite mensal.', 0, 'BRL', 'monthly', 10, 1, true),
  ('leader_pro_monthly', 'Líder Pro (Mensal)', 'Plano para líder com recursos avançados.', 1990, 'BRL', 'monthly', null, 1, true),
  ('church_monthly', 'Igreja (Mensal)', 'Plano para igrejas com múltiplos líderes.', 4990, 'BRL', 'monthly', null, null, true)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  price_in_cents = excluded.price_in_cents,
  currency = excluded.currency,
  billing_cycle = excluded.billing_cycle,
  monthly_pre_sermon_limit = excluded.monthly_pre_sermon_limit,
  max_leaders = excluded.max_leaders,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.subscriptions (leader_id, owner_type, owner_id, plan, status, provider)
select p.auth_user_id, 'leader', p.auth_user_id, 'free', 'free', 'abacatepay'
from public.profiles p
where p.role = 'leader'
  and not exists (
    select 1
    from public.subscriptions s
    where (s.owner_type = 'leader' and s.owner_id = p.auth_user_id)
       or s.leader_id = p.auth_user_id
  );

create or replace function public.mt_get_pre_sermon_cycle_window(
  p_leader_id uuid,
  p_at timestamp without time zone default now()
)
returns table (
  cycle_start timestamp without time zone,
  cycle_end timestamp without time zone
)
language plpgsql
as $$
declare
  s_start timestamp without time zone;
  s_end timestamp without time zone;
  base timestamp without time zone;
  months_diff integer;
begin
  select s.current_period_start, s.current_period_end
  into s_start, s_end
  from public.subscriptions s
  where (s.owner_type = 'leader' and s.owner_id = p_leader_id)
     or s.leader_id = p_leader_id
  order by s.created_at desc
  limit 1;

  if s_start is not null and s_end is not null and s_end > s_start then
    cycle_start := s_start;
    cycle_end := s_end;
    return;
  end if;

  select p.created_at
  into base
  from public.profiles p
  where p.auth_user_id = p_leader_id;

  base := coalesce(base, p_at);

  months_diff :=
    greatest(
      0,
      (
        date_part('year', age(p_at, base)) * 12
        + date_part('month', age(p_at, base))
      )::integer
    );

  cycle_start := base + make_interval(months => months_diff);
  cycle_end := cycle_start + interval '1 month';
  return;
end;
$$;

create or replace function public.mt_get_pre_sermon_quota(
  p_leader_id uuid,
  p_at timestamp without time zone default now()
)
returns table (
  plan_code text,
  monthly_limit integer,
  used integer,
  remaining integer,
  cycle_start timestamp without time zone,
  cycle_end timestamp without time zone
)
language plpgsql
as $$
declare
  v_plan_code text;
  v_limit integer;
begin
  select coalesce(s.plan, 'free')
  into v_plan_code
  from public.subscriptions s
  where (s.owner_type = 'leader' and s.owner_id = p_leader_id)
     or s.leader_id = p_leader_id
  order by s.created_at desc
  limit 1;

  select p.monthly_pre_sermon_limit
  into v_limit
  from public.plans p
  where p.code = v_plan_code
  limit 1;

  if v_plan_code is null then
    v_plan_code := 'free';
  end if;

  if v_limit is null and v_plan_code = 'free' then
    v_limit := 10;
  end if;

  select w.cycle_start, w.cycle_end
  into cycle_start, cycle_end
  from public.mt_get_pre_sermon_cycle_window(p_leader_id, p_at) w;

  select count(*)
  into used
  from public.pre_sermons ps
  where ps.leader_id = p_leader_id
    and ps.created_at >= cycle_start
    and ps.created_at < cycle_end;

  plan_code := v_plan_code;
  monthly_limit := v_limit;

  if v_limit is null then
    remaining := null;
  else
    remaining := greatest(v_limit - used, 0);
  end if;

  return;
end;
$$;
