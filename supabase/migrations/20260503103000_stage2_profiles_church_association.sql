alter table public.profiles
  add column if not exists church_id uuid null;

create index if not exists idx_profiles_church_id
  on public.profiles (church_id);

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'profiles'
      and constraint_name = 'profiles_church_id_fkey'
  ) then
    if exists (
      select 1
      from public.profiles p
      where p.church_id is not null
        and not exists (
          select 1
          from public.churches c
          where c.id = p.church_id
        )
      limit 1
    ) then
      raise notice 'Skipping profiles_church_id_fkey: existing profiles.church_id contains values not present in churches.id';
    else
      alter table public.profiles
        add constraint profiles_church_id_fkey
        foreign key (church_id)
        references public.churches (id)
        on delete set null;
    end if;
  end if;
end $$;
