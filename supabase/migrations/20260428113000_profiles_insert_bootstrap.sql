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

  if new.name is null or new.name = '' then
    new.name := nullif(split_part(new.email, '@', 1), '');
    if new.name is null then
      new.name := 'Usuário';
    end if;
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
