create table if not exists public.pre_sermons (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid not null,
  church_id uuid null,
  share_code text unique not null,
  title text not null,
  main_verse text not null,
  secondary_verses jsonb null,
  notes text null,
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

alter table public.pre_sermons enable row level security;

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
