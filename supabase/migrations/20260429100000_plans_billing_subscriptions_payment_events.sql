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

alter table public.plans enable row level security;

drop policy if exists plans_select_active on public.plans;
create policy plans_select_active
on public.plans
for select
to anon, authenticated
using (is_active = true);

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
  alter column leader_id drop not null,
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
      'church_monthly'
    )
  );

alter table public.subscriptions
  drop constraint if exists subscriptions_status_check;
alter table public.subscriptions
  add constraint subscriptions_status_check check (
    status in (
      'free',
      'active',
      'cancelled',
      'expired',
      'trialing',
      'past_due',
      'unpaid',
      'incomplete'
    )
  );

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

create unique index if not exists subscriptions_owner_key
  on public.subscriptions (owner_type, owner_id);

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

comment on function public.mt_subscriptions_before_write()
is 'Normaliza e mantém consistentes os campos de owner_* e provider em subscriptions para manter compatibilidade com inserts legados.';

drop trigger if exists mt_subscriptions_before_write on public.subscriptions;
create trigger mt_subscriptions_before_write
before insert or update on public.subscriptions
for each row
execute function public.mt_subscriptions_before_write();

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

alter table public.payment_events enable row level security;

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

comment on function public.mt_get_pre_sermon_cycle_window(uuid, timestamp without time zone)
is 'Calcula a janela do ciclo mensal (início/fim) para contagem de pré-sermões: usa período da assinatura quando existir; senão usa created_at do profile (ciclo não-calendário).';

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

comment on function public.mt_get_pre_sermon_quota(uuid, timestamp without time zone)
is 'Retorna quota mensal de pré-sermões (limite/uso/restante) no ciclo corrente baseado no plano e na janela calculada.';
