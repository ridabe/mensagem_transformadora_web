create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique not null,
  name text not null,
  email text not null,
  role text not null default 'leader',
  church_id uuid null,
  status text not null default 'active',
  created_at timestamp without time zone not null default now(),
  updated_at timestamp without time zone not null default now()
);

alter table public.profiles add column if not exists auth_user_id uuid;
alter table public.profiles add column if not exists name text;
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

create unique index if not exists profiles_auth_user_id_key
  on public.profiles (auth_user_id);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'display_name'
  ) then
    update public.profiles
    set name = coalesce(name, display_name)
    where name is null;
  end if;
end $$;

update public.profiles
set name = coalesce(name, nullif(email, ''), 'Usuário')
where name is null;

update public.profiles
set email = concat('unknown+', id::text, '@local')
where email is null;

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

alter table public.profiles
  alter column auth_user_id set not null,
  alter column name set not null,
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

create or replace function public.mt_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists mt_profiles_set_updated_at on public.profiles;
create trigger mt_profiles_set_updated_at
before update on public.profiles
for each row
execute function public.mt_set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (auth.uid() = auth_user_id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);
