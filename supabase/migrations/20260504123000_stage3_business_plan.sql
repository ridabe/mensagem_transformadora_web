alter table public.churches
  drop constraint if exists churches_plan_type_check;
alter table public.churches
  add constraint churches_plan_type_check check (plan_type in ('free', 'basic', 'pro', 'business'));

alter table public.churches
  drop constraint if exists churches_plan_status_check;
alter table public.churches
  add constraint churches_plan_status_check check (plan_status in ('inactive', 'active', 'suspended', 'cancelled'));
