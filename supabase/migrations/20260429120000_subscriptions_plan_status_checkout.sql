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
