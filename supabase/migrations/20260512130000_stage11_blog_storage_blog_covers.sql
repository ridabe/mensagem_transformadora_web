-- Stage 11: Storage bucket para capas do Blog (blog-covers)

insert into storage.buckets (id, name, public, created_at, updated_at)
values ('blog-covers', 'blog-covers', true, now(), now())
on conflict (id) do update
set public = excluded.public,
    updated_at = now();

drop policy if exists blog_covers_public_read on storage.objects;
create policy blog_covers_public_read
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'blog-covers');

drop policy if exists blog_covers_admin_insert on storage.objects;
create policy blog_covers_admin_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'blog-covers'
  and exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
      and p.status = 'active'
  )
);

drop policy if exists blog_covers_admin_update on storage.objects;
create policy blog_covers_admin_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'blog-covers'
  and exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
      and p.status = 'active'
  )
)
with check (
  bucket_id = 'blog-covers'
  and exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
      and p.status = 'active'
  )
);

drop policy if exists blog_covers_admin_delete on storage.objects;
create policy blog_covers_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'blog-covers'
  and exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
      and p.status = 'active'
  )
);
