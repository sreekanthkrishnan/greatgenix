-- Organization approval and subscription entitlements are enforced in the database.
alter table public.organizations add column approval_status text not null default 'approved' check(approval_status in ('pending','approved','rejected'));
alter table public.organizations alter column approval_status set default 'pending';
alter table public.organizations add column review_note text not null default '';
alter table public.organizations add column reviewed_at timestamptz;
alter table public.organizations add column reviewed_by uuid references auth.users(id);
alter table public.organizations add column created_by uuid references auth.users(id);

create function private.valid_billing_features(f jsonb) returns boolean language sql immutable set search_path='' as $$
 select jsonb_typeof(f)='object' and not exists(select 1 from jsonb_each(f) e where e.key not in ('live','recordings','attendance','assessments') or jsonb_typeof(e.value)<>'boolean')
$$;
create table public.subscription_plans (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 80),
 price_minor integer not null check(price_minor between 0 and 100000000), currency text not null check(currency ~ '^[A-Z]{3}$'),
 duration_days integer not null check(duration_days between 1 and 3660), features jsonb not null check(private.valid_billing_features(features)),
 active boolean not null default true, created_at timestamptz not null default now(),
 check(not coalesce((features->>'attendance')::boolean,false) or coalesce((features->>'live')::boolean,false))
);
create table public.subscription_coupons (
 id uuid primary key default gen_random_uuid(), code text not null unique check(code ~ '^[A-Z0-9][A-Z0-9_-]{2,39}$'),
 plan_id uuid references public.subscription_plans(id), org_id uuid references public.organizations(id),
 percent_off integer not null default 0 check(percent_off between 0 and 100),
 bonus_features jsonb not null default '{}' check(private.valid_billing_features(bonus_features)),
 starts_at timestamptz not null default now(), expires_at timestamptz not null,
 max_redemptions integer not null check(max_redemptions between 1 and 1000000), active boolean not null default true,
 created_at timestamptz not null default now(), check(expires_at>starts_at)
);
create table public.organization_subscriptions (
 id uuid primary key default gen_random_uuid(), org_id uuid not null references public.organizations(id),
 plan_id uuid not null references public.subscription_plans(id), coupon_id uuid references public.subscription_coupons(id),
 plan_name text not null, price_minor integer not null check(price_minor>=0), total_minor integer not null check(total_minor>=0 and total_minor<=price_minor),
 currency text not null, duration_days integer not null, features jsonb not null check(private.valid_billing_features(features)),
 status text not null default 'pending_payment' check(status in ('pending_payment','active','cancelled')),
 created_at timestamptz not null default now(), starts_at timestamptz, ends_at timestamptz,
 payment_reference text not null default '', confirmed_by uuid references auth.users(id), confirmed_at timestamptz,
 check(status<>'active' or (starts_at is not null and ends_at>starts_at))
);
create unique index one_pending_subscription on public.organization_subscriptions(org_id) where status='pending_payment';
create unique index coupon_once_per_org on public.organization_subscriptions(org_id,coupon_id) where status<>'cancelled';
create index subscriptions_org on public.organization_subscriptions(org_id,status,ends_at);

create function private.membership_role(o uuid) returns text language sql stable security definer set search_path='' as $$
 select role from public.memberships where "orgId"=o and "userId"=auth.uid() and active
$$;
create function private.org_has_access(o uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.organizations g join public.organization_subscriptions s on s.org_id=g.id where g.id=o and g.active and g.approval_status='approved' and s.status='active' and s.starts_at<=now() and s.ends_at>now())
$$;
create function private.effective_features(o uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('live',coalesce(bool_or((s.features->>'live')::boolean),false),'recordings',coalesce(bool_or((s.features->>'recordings')::boolean),false),'attendance',coalesce(bool_or((s.features->>'attendance')::boolean),false),'assessments',coalesce(bool_or((s.features->>'assessments')::boolean),false))
 from public.organization_subscriptions s where s.org_id=o and private.org_has_access(o) and s.status='active' and s.starts_at<=now() and s.ends_at>now()
$$;
create or replace function private.org_role(o uuid) returns text language sql stable security definer set search_path='' as $$
 select private.membership_role(o) where private.org_has_access(o)
$$;
create or replace function private.feature(o uuid,f text) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((private.effective_features(o)->>f)::boolean,false)
$$;

alter table public.subscription_plans enable row level security;
alter table public.subscription_coupons enable row level security;
alter table public.organization_subscriptions enable row level security;
revoke all on public.subscription_plans,public.subscription_coupons,public.organization_subscriptions from anon,authenticated;
grant select on public.subscription_plans,public.subscription_coupons,public.organization_subscriptions to authenticated;
create policy plan_read on public.subscription_plans for select to authenticated using(active or private.is_platform());
create policy coupon_read on public.subscription_coupons for select to authenticated using(private.is_platform());
create policy subscription_read on public.organization_subscriptions for select to authenticated using(private.is_platform() or private.membership_role(org_id)='teacher-admin');

create or replace function public.create_organization(p_name text,p_slug text) returns uuid language plpgsql security definer set search_path='' as $$
declare o uuid; u auth.users;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 select * into u from auth.users where id=auth.uid();
 if u.email_confirmed_at is null then raise exception 'Confirm your email first'; end if;
 insert into public.organizations(name,slug,approval_status,created_by,features) values(trim(p_name),lower(trim(p_slug)),'pending',u.id,'{"live":false,"recordings":false,"attendance":false,"assessments":false}') returning id into o;
 insert into public.memberships("orgId","userId",name,email,role) values(o,u.id,left(coalesce(nullif(trim(u.raw_user_meta_data->>'name'),''),split_part(u.email,'@',1)),100),u.email,'teacher-admin');
 insert into public.audit_events("orgId","actorId",action) values(o,u.id,'organization.requested'); return o;
end $$;
create or replace function public.my_access() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('platform',private.is_platform(),'orgs',coalesce((select jsonb_agg(to_jsonb(o) || jsonb_build_object('features',private.effective_features(o.id),'accessible',private.org_has_access(o.id),'subscription_end',(select max(ends_at) from public.organization_subscriptions where org_id=o.id and status='active'),'billing_status',case when not o.active then 'suspended' when o.approval_status<>'approved' then o.approval_status when private.org_has_access(o.id) then 'active' when exists(select 1 from public.organization_subscriptions s where s.org_id=o.id and s.status='pending_payment') then 'pending_payment' else 'subscription_required' end)) from public.organizations o where private.is_platform() or exists(select 1 from public.memberships m where m."orgId"=o.id and m."userId"=auth.uid() and m.active)),'[]'::jsonb),'memberships',coalesce((select jsonb_agg(jsonb_build_object('orgId',m."orgId",'role',m.role)) from public.memberships m where m."userId"=auth.uid() and m.active),'[]'::jsonb))
$$;

create function public.review_organization(p_org uuid,p_approve boolean,p_note text default '') returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.require(private.is_platform(),'Platform administrator required');
 perform private.require(length(trim(p_note))<=2000,'Review note is too long');
 update public.organizations set approval_status=case when p_approve then 'approved' else 'rejected' end,review_note=trim(p_note),reviewed_by=auth.uid(),reviewed_at=now() where id=p_org;
 perform private.require(found,'Organization not found');
 insert into public.audit_events("orgId","actorId",action) values(p_org,auth.uid(),case when p_approve then 'organization.approved' else 'organization.rejected' end);
end $$;

create function public.save_subscription_plan(p_plan jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare target uuid := coalesce(nullif(p_plan->>'id','')::uuid,gen_random_uuid());
begin
 perform private.require(private.is_platform(),'Platform administrator required');
 insert into public.subscription_plans(id,name,price_minor,currency,duration_days,features,active)
 values(target,trim(p_plan->>'name'),(p_plan->>'price_minor')::integer,upper(p_plan->>'currency'),(p_plan->>'duration_days')::integer,p_plan->'features',coalesce((p_plan->>'active')::boolean,true))
 on conflict(id) do update set name=excluded.name,price_minor=excluded.price_minor,currency=excluded.currency,duration_days=excluded.duration_days,features=excluded.features,active=excluded.active;
 insert into public.audit_events("actorId",action,"targetId") values(auth.uid(),'subscription.plan_saved',target::text);
 return target;
end $$;
create function public.save_subscription_coupon(p_coupon jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare target uuid := coalesce(nullif(p_coupon->>'id','')::uuid,gen_random_uuid());
begin
 perform private.require(private.is_platform(),'Platform administrator required');
 insert into public.subscription_coupons(id,code,plan_id,org_id,percent_off,bonus_features,starts_at,expires_at,max_redemptions,active)
 values(target,upper(trim(p_coupon->>'code')),nullif(p_coupon->>'plan_id','')::uuid,nullif(p_coupon->>'org_id','')::uuid,(p_coupon->>'percent_off')::integer,p_coupon->'bonus_features',(p_coupon->>'starts_at')::timestamptz,(p_coupon->>'expires_at')::timestamptz,(p_coupon->>'max_redemptions')::integer,coalesce((p_coupon->>'active')::boolean,true))
 on conflict(id) do update set code=excluded.code,plan_id=excluded.plan_id,org_id=excluded.org_id,percent_off=excluded.percent_off,bonus_features=excluded.bonus_features,starts_at=excluded.starts_at,expires_at=excluded.expires_at,max_redemptions=excluded.max_redemptions,active=excluded.active;
 insert into public.audit_events("actorId",action,"targetId") values(auth.uid(),'subscription.coupon_saved',target::text);
 return target;
end $$;

-- Used for both preview and checkout; checkout locks the coupon against concurrent redemptions.
create function private.subscription_quote(p_org uuid,p_plan uuid,p_code text) returns jsonb language plpgsql security definer set search_path='' as $$
declare plan public.subscription_plans; coupon public.subscription_coupons; total integer; f jsonb; item record;
begin
 perform private.require(auth.uid() is not null and (private.membership_role(p_org)='teacher-admin' or private.is_platform()),'Organization administrator required');
 perform private.require(exists(select 1 from public.organizations where id=p_org and active and approval_status='approved'),'Organization must be approved and active');
 select * into plan from public.subscription_plans where id=p_plan and active for share;
 perform private.require(plan.id is not null,'Plan is unavailable');
 f:=plan.features; total:=plan.price_minor;
 if trim(coalesce(p_code,''))<>'' then
  select * into coupon from public.subscription_coupons where code=upper(trim(p_code)) for update;
  perform private.require(coupon.id is not null and coupon.active and coupon.starts_at<=now() and coupon.expires_at>now() and (coupon.plan_id is null or coupon.plan_id=p_plan) and (coupon.org_id is null or coupon.org_id=p_org),'Coupon is invalid, expired, or not eligible for this organization and plan');
  perform private.require(not exists(select 1 from public.organization_subscriptions where org_id=p_org and coupon_id=coupon.id and status<>'cancelled'),'Coupon already used by this organization');
  perform private.require((select count(*) from public.organization_subscriptions where coupon_id=coupon.id and status<>'cancelled')<coupon.max_redemptions,'Coupon redemption limit reached');
  total:=round(plan.price_minor::numeric*(100-coupon.percent_off)/100)::integer;
  for item in select key,value from jsonb_each(coupon.bonus_features) loop
   if item.value='true'::jsonb then f:=f || jsonb_build_object(item.key,true); end if;
  end loop;
 end if;
 if coalesce((f->>'attendance')::boolean,false) then f:=f || '{"live":true}'::jsonb; end if;
 return jsonb_build_object('plan_id',plan.id,'plan_name',plan.name,'coupon_id',coupon.id,'price_minor',plan.price_minor,'total_minor',total,'currency',plan.currency,'duration_days',plan.duration_days,'features',f);
end $$;
revoke all on function private.subscription_quote(uuid,uuid,text) from public,authenticated;
create function public.quote_subscription(p_org uuid,p_plan uuid,p_code text default '') returns jsonb language plpgsql security definer set search_path='' as $$
begin return private.subscription_quote(p_org,p_plan,p_code); end $$;
create function public.request_subscription(p_org uuid,p_plan uuid,p_code text default '') returns uuid language plpgsql security definer set search_path='' as $$
declare q jsonb; target uuid;
begin
 perform private.require(auth.uid() is not null and (private.membership_role(p_org)='teacher-admin' or private.is_platform()),'Organization administrator required');
 perform 1 from public.organizations where id=p_org for update;
 perform private.require(not exists(select 1 from public.organization_subscriptions where org_id=p_org and (status='pending_payment' or (status='active' and ends_at>now()))),'An active subscription or pending payment already exists');
 q:=private.subscription_quote(p_org,p_plan,p_code);
 insert into public.organization_subscriptions(org_id,plan_id,coupon_id,plan_name,price_minor,total_minor,currency,duration_days,features,status,starts_at,ends_at)
 values(p_org,p_plan,(q->>'coupon_id')::uuid,q->>'plan_name',(q->>'price_minor')::integer,(q->>'total_minor')::integer,q->>'currency',(q->>'duration_days')::integer,q->'features',case when (q->>'total_minor')::integer=0 then 'active' else 'pending_payment' end,case when (q->>'total_minor')::integer=0 then now() end,case when (q->>'total_minor')::integer=0 then now()+make_interval(days=>(q->>'duration_days')::integer) end) returning id into target;
 insert into public.audit_events("orgId","actorId",action,"targetId") values(p_org,auth.uid(),'subscription.requested',target::text);
 return target;
end $$;
create function public.confirm_subscription_payment(p_subscription uuid,p_reference text) returns void language plpgsql security definer set search_path='' as $$
declare s public.organization_subscriptions;
begin
 perform private.require(private.is_platform(),'Platform administrator required');
 select * into s from public.organization_subscriptions where id=p_subscription for update;
 perform private.require(s.id is not null and s.status='pending_payment','Subscription is not awaiting payment');
 perform private.require(length(trim(p_reference)) between 1 and 200,'Enter the verified payment reference');
 perform private.require(exists(select 1 from public.organizations where id=s.org_id and active and approval_status='approved'),'Organization must be approved and active');
 update public.organization_subscriptions set status='active',starts_at=now(),ends_at=now()+make_interval(days=>s.duration_days),payment_reference=trim(p_reference),confirmed_by=auth.uid(),confirmed_at=now() where id=s.id;
 insert into public.audit_events("orgId","actorId",action,"targetId") values(s.org_id,auth.uid(),'subscription.payment_confirmed',s.id::text);
end $$;
create function public.cancel_subscription(p_subscription uuid) returns void language plpgsql security definer set search_path='' as $$
declare s public.organization_subscriptions;
begin
 select * into s from public.organization_subscriptions where id=p_subscription for update;
 perform private.require(s.id is not null and (private.is_platform() or (private.membership_role(s.org_id)='teacher-admin' and s.status='pending_payment')),'Only platform admins can cancel active subscriptions');
 update public.organization_subscriptions set status='cancelled' where id=s.id;
 insert into public.audit_events("orgId","actorId",action,"targetId") values(s.org_id,auth.uid(),'subscription.cancelled',s.id::text);
end $$;

-- Disable the old feature-toggle API: entitlements come exclusively from subscriptions.
alter function public.apply_action(uuid,jsonb) rename to apply_workspace_action;
alter function public.apply_workspace_action(uuid,jsonb) set schema private;
revoke all on function private.apply_workspace_action(uuid,jsonb) from public,anon,authenticated;
create function public.apply_action(p_org uuid,p_action jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_action->>'type'='feature' then raise exception 'Features are managed by subscription plans and coupons'; end if;
 perform private.apply_workspace_action(p_org,p_action);
end $$;

-- Functions are not exposed to anonymous callers; privileged operations also verify platform assignment.
do $$ declare f text; begin
 foreach f in array array['review_organization(uuid,boolean,text)','save_subscription_plan(jsonb)','save_subscription_coupon(jsonb)','quote_subscription(uuid,uuid,text)','request_subscription(uuid,uuid,text)','confirm_subscription_payment(uuid,text)','cancel_subscription(uuid)','apply_action(uuid,jsonb)'] loop
 execute 'revoke all on function public.' || f || ' from public,anon';
 execute 'grant execute on function public.' || f || ' to authenticated';
 end loop;
end $$;
