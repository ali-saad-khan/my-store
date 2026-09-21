-- Auto-create a public.profiles row (and assign the default "customer" role)
-- whenever a new user signs up via Supabase Auth. SECURITY DEFINER is required
-- because this trigger fires on auth.users, which this app's role doesn't own.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;

  insert into public.user_roles (profile_id, role_id)
  select new.id, r.id from public.roles r where r.name = 'customer'
  on conflict do nothing;

  return new;
end;
$$;
--> statement-breakpoint
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
--> statement-breakpoint
-- Keep profiles.email in sync if the user changes their email in Supabase Auth.
create function public.handle_user_email_updated()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles set email = new.email, updated_at = now() where id = new.id;
  return new;
end;
$$;
--> statement-breakpoint
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.handle_user_email_updated();
