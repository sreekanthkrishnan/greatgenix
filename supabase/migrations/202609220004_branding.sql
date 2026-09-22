-- Anonymous callers receive only explicitly public identity fields, never organization content.
create function public.organization_brand(p_slug text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('name',name,'branding',branding) from public.organizations where slug=p_slug and active
$$;
revoke all on function public.organization_brand(text) from public;
grant execute on function public.organization_brand(text) to anon,authenticated;
