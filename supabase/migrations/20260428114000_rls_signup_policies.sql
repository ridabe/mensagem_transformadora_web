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

drop policy if exists subscriptions_insert_own_free on public.subscriptions;
create policy subscriptions_insert_own_free
on public.subscriptions
for insert
to authenticated
with check (
  leader_id = auth.uid()
  and plan = 'free'
  and status = 'free'
);

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
