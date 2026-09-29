-- Supabase Storage bucket for admin-uploaded product images (MasterPlan.txt section 2:
-- "Supabase Storage initially"). Hand-written, like 0001's auth trigger — `storage.*` isn't
-- part of our Drizzle schema, so `db:generate` never touches this file.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;
--> statement-breakpoint

-- Public read: product images must be visible to anyone browsing the storefront.
create policy "Public read access for product images"
on storage.objects for select
using (bucket_id = 'product-images');
--> statement-breakpoint

-- Only admins may upload/replace/delete — mirrors requireAdmin()'s check (user_roles ->
-- roles) rather than a Supabase custom claim, since roles already live in our own tables.
create policy "Admins can upload product images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.profile_id = auth.uid() and r.name = 'admin'
  )
);
--> statement-breakpoint

create policy "Admins can update product images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'product-images'
  and exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.profile_id = auth.uid() and r.name = 'admin'
  )
);
--> statement-breakpoint

create policy "Admins can delete product images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'product-images'
  and exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.profile_id = auth.uid() and r.name = 'admin'
  )
);
