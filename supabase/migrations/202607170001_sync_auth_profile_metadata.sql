-- Mantiene public.profiles alineado con metadatos administrados por Auth.
-- Supabase puede aplicar app_metadata después del INSERT inicial de auth.users.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  assigned_role public.user_role;
  assigned_display_name text;
begin
  assigned_role := case
    when new.raw_app_meta_data ->> 'role' = 'professional' then 'professional'::public.user_role
    else 'patient'::public.user_role
  end;

  assigned_display_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    (select profile.display_name from public.profiles profile where profile.id = new.id),
    'Usuario ONUr'
  );

  insert into public.profiles (id, role, display_name)
  values (new.id, assigned_role, assigned_display_name)
  on conflict (id) do update
  set role = excluded.role,
      display_name = excluded.display_name;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of raw_app_meta_data, raw_user_meta_data on auth.users
for each row execute function public.handle_new_auth_user();

update public.profiles profile
set role = case
      when auth_user.raw_app_meta_data ->> 'role' = 'professional' then 'professional'::public.user_role
      else 'patient'::public.user_role
    end,
    display_name = coalesce(
      nullif(btrim(auth_user.raw_user_meta_data ->> 'display_name'), ''),
      profile.display_name
    )
from auth.users auth_user
where auth_user.id = profile.id;
