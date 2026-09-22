-- Auth owns personal profile metadata. Keep roster display names consistent
-- across memberships without allowing profile edits to change any role.
create or replace function private.sync_profile_name()
returns trigger language plpgsql security definer set search_path='' as $$
declare display_name text;
begin
  if new.raw_user_meta_data->>'name' is distinct from old.raw_user_meta_data->>'name' then
    display_name := trim(new.raw_user_meta_data->>'name');
    if display_name is null or length(display_name) not between 1 and 100 then
      raise exception 'Enter a display name between 1 and 100 characters';
    end if;
    update public.memberships set name=display_name where "userId"=new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.sync_profile_name() from public;
drop trigger if exists sync_profile_name on auth.users;
create trigger sync_profile_name after update of raw_user_meta_data on auth.users
for each row execute function private.sync_profile_name();
