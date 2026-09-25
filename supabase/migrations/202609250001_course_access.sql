-- Course discovery is separate from full classroom access. Existing courses stay private.
alter table public.courses add column visibility text not null default 'private' check (visibility in ('private','public'));
alter table public.courses add column pricing text not null default 'free' check (pricing in ('free','paid'));
alter table public.courses add column "paymentInstructions" text not null default '' check (length("paymentInstructions") <= 2000);
alter table public.courses add constraint course_public_paid check (visibility='public' or pricing='free');
alter table public.lessons add column "isFreePreview" boolean not null default false;

create or replace function private.can_course(o uuid,c uuid,teaching boolean default false) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(private.org_role(o) is not null and exists(select 1 from public.courses x where x.id=c and x."orgId"=o and (
 private.is_admin(o) or (private.org_role(o)='teacher' and x."teacherId"=auth.uid()) or (not teaching and private.org_role(o)='student' and (
 (x.visibility='public' and x.pricing='free') or exists(select 1 from public.enrollments e where e."orgId"=o and e."courseId"=c and e."studentId"=auth.uid()))))),false)
$$;
create function private.can_discover_course(o uuid,c uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.can_course(o,c) or (private.org_role(o)='student' and exists(select 1 from public.courses where id=c and "orgId"=o and visibility='public'))
$$;
create function private.can_lesson(o uuid,l uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(private.feature(o,'recordings') and exists(select 1 from public.lessons x where x.id=l and x."orgId"=o and (
 private.can_course(o,x."courseId",true) or (x.status='published' and (private.can_course(o,x."courseId") or (x."isFreePreview" and private.can_discover_course(o,x."courseId")))))),false)
$$;
drop policy course_read on public.courses;
create policy course_read on public.courses for select to authenticated using (private.can_discover_course("orgId",id));
drop policy lesson_read on public.lessons;
create policy lesson_read on public.lessons for select to authenticated using (private.can_lesson("orgId",id));

-- Tokens are student-bound, single-use, and stored only as hashes.
create table private.course_access_coupons (
 id uuid primary key default gen_random_uuid(),
 "orgId" uuid not null, "courseId" uuid not null, "studentId" uuid not null,
 "tokenHash" text not null unique, "createdBy" uuid not null references auth.users(id),
 "createdAt" timestamptz not null default now(), "expiresAt" timestamptz not null default now()+interval '7 days',
 "redeemedAt" timestamptz, revoked boolean not null default false,
 foreign key("orgId","courseId") references public.courses("orgId",id) on delete cascade,
 foreign key("orgId","studentId") references public.memberships("orgId","userId")
);
revoke all on private.course_access_coupons from public,anon,authenticated;

create function public.course_access_students(p_org uuid,p_course uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require(private.can_course(p_org,p_course,true));
 return coalesce((select jsonb_agg(jsonb_build_object('id',"userId",'name',name,'email',email) order by name,"userId") from public.memberships where "orgId"=p_org and active and role='student'),'[]'::jsonb);
end $$;
create function public.list_course_access_coupons(p_org uuid,p_course uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require(private.can_course(p_org,p_course,true));
 return coalesce((select jsonb_agg(jsonb_build_object('id',id,'studentId',"studentId",'expiresAt',"expiresAt",'redeemedAt',"redeemedAt",'revoked',revoked) order by "createdAt" desc) from private.course_access_coupons where "orgId"=p_org and "courseId"=p_course),'[]'::jsonb);
end $$;
create function public.create_course_access_coupon(p_org uuid,p_course uuid,p_student uuid) returns text language plpgsql security definer set search_path='' as $$
declare token text; begin
 perform private.require(private.can_course(p_org,p_course,true));
 perform 1 from public.courses where id=p_course and "orgId"=p_org for update;
 perform private.require(exists(select 1 from public.courses where id=p_course and "orgId"=p_org and visibility='public' and pricing='paid'),'Coupons are for paid public courses');
 perform private.require(exists(select 1 from public.memberships where "orgId"=p_org and "userId"=p_student and active and role='student'),'Choose an active student in this organization');
 perform private.require(not exists(select 1 from public.enrollments where "courseId"=p_course and "studentId"=p_student),'Student already has full access');
 update private.course_access_coupons set revoked=true where "courseId"=p_course and "studentId"=p_student and "redeemedAt" is null;
 token:=replace(gen_random_uuid()::text,'-','');
 insert into private.course_access_coupons("orgId","courseId","studentId","tokenHash","createdBy") values(p_org,p_course,p_student,encode(sha256(convert_to(token,'UTF8')),'hex'),auth.uid());
 insert into public.audit_events("orgId","actorId",action,"targetId") values(p_org,auth.uid(),'course-coupon.created',p_course::text);
 return token;
end $$;
create function public.revoke_course_access_coupon(p_org uuid,p_course uuid,p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.require(private.can_course(p_org,p_course,true));
 perform 1 from public.courses where id=p_course and "orgId"=p_org for update;
 update private.course_access_coupons set revoked=true where id=p_id and "orgId"=p_org and "courseId"=p_course and "redeemedAt" is null;
 insert into public.audit_events("orgId","actorId",action,"targetId") values(p_org,auth.uid(),'course-coupon.revoked',p_id::text);
end $$;
create function public.redeem_course_access_coupon(p_org uuid,p_course uuid,p_token text) returns void language plpgsql security definer set search_path='' as $$
declare coupon private.course_access_coupons; begin
 perform private.require(private.org_role(p_org)='student','Active student membership required');
 -- Same lock order as grant/revoke, so removal cannot race with redemption.
 perform 1 from public.courses where id=p_course and "orgId"=p_org for update;
 perform private.require(exists(select 1 from public.courses where id=p_course and "orgId"=p_org and visibility='public' and pricing='paid'),'Paid public course required');
 select * into coupon from private.course_access_coupons where "orgId"=p_org and "courseId"=p_course and "studentId"=auth.uid() and "tokenHash"=encode(sha256(convert_to(lower(trim(p_token)),'UTF8')),'hex') for update;
 perform private.require(coupon.id is not null and not coupon.revoked and coupon."redeemedAt" is null and coupon."expiresAt">now(),'Coupon is invalid, expired, used, revoked, or belongs to another student');
 insert into public.enrollments("orgId","courseId","studentId") values(p_org,p_course,auth.uid()) on conflict do nothing;
 update private.course_access_coupons set "redeemedAt"=now() where id=coupon.id;
 insert into public.audit_events("orgId","actorId",action,"targetId") values(p_org,auth.uid(),'course-coupon.redeemed',p_course::text);
end $$;

-- Keep subscription enforcement and the existing workspace operations intact.
create or replace function public.apply_action(p_org uuid,p_action jsonb) returns void language plpgsql security definer set search_path='' as $$
declare t text:=p_action->>'type'; d jsonb; c uuid; target uuid; l public.lessons; begin
 perform private.require(auth.uid() is not null,'Sign in first');
 if t='feature' then raise exception 'Features are managed by subscription plans and coupons'; end if;
 if t in ('course','course-access') then
  d:=case when t='course' then p_action->'course' else p_action end;
  c:=(d->>'id')::uuid;
  if t='course' then
   perform private.require(private.org_role(p_org) in ('teacher','teacher-admin'));
   perform private.require((d->>'orgId')::uuid=p_org and (private.is_admin(p_org) or (d->>'teacherId')::uuid=auth.uid()));
   perform private.require(exists(select 1 from public.memberships where "orgId"=p_org and "userId"=(d->>'teacherId')::uuid and active and role in ('teacher','teacher-admin')));
   insert into public.courses(id,"orgId",title,subject,grade,batch,description,color,"teacherId") values(c,p_org,trim(d->>'title'),d->>'subject',d->>'grade',d->>'batch',d->>'description',d->>'color',(d->>'teacherId')::uuid);
  else perform private.require(private.can_course(p_org,c,true)); end if;
  perform 1 from public.courses where id=c and "orgId"=p_org for update;
  update public.courses set visibility=coalesce(d->>'visibility','private'),pricing=coalesce(d->>'pricing','free'),"paymentInstructions"=coalesce(d->>'paymentInstructions','') where id=c and "orgId"=p_org;
  -- A coupon issued under old terms must not silently survive a change of access type.
  if d->>'visibility'<>'public' or d->>'pricing'<>'paid' then
   update private.course_access_coupons set revoked=true where "courseId"=c and "redeemedAt" is null;
  end if;
 elsif t='enroll' then
  c:=(p_action->>'courseId')::uuid; target:=(p_action->>'studentId')::uuid;
  perform private.require(private.can_course(p_org,c,true));
  perform 1 from public.courses where id=c and "orgId"=p_org for update;
  perform private.require(jsonb_typeof(p_action->'enrolled')='boolean');
  if (p_action->>'enrolled')::boolean then
   perform private.require(exists(select 1 from public.memberships where "orgId"=p_org and "userId"=target and active and role='student'));
   insert into public.enrollments("orgId","courseId","studentId") values(p_org,c,target) on conflict do nothing;
  else delete from public.enrollments where "orgId"=p_org and "courseId"=c and "studentId"=target; end if;
  update private.course_access_coupons set revoked=true where "courseId"=c and "studentId"=target and "redeemedAt" is null;
 elsif t='lesson-preview' then
  select * into l from public.lessons where id=(p_action->>'id')::uuid and "orgId"=p_org;
  perform private.require(private.can_course(p_org,l."courseId",true) and private.feature(p_org,'recordings'));
  perform private.require(jsonb_typeof(p_action->'isFreePreview')='boolean');
  update public.lessons set "isFreePreview"=(p_action->>'isFreePreview')::boolean where id=l.id;
 elsif t in ('complete','report') then
  select * into l from public.lessons where id=(case when t='complete' then p_action->>'id' else p_action->>'lessonId' end)::uuid and "orgId"=p_org;
  perform private.require(private.org_role(p_org)='student' and private.can_lesson(p_org,l.id));
  if t='complete' then
   delete from public.completions where "lessonId"=l.id and "studentId"=auth.uid();
   if not found then insert into public.completions("orgId","lessonId","studentId") values(p_org,l.id,auth.uid()); end if;
  else insert into public.reports("orgId","lessonId","studentId",reason) values(p_org,l.id,auth.uid(),trim(p_action->>'reason')); end if;
 else
  perform private.apply_workspace_action(p_org,p_action);
  if t='lesson' then
   update public.lessons set "isFreePreview"=coalesce((p_action->'lesson'->>'isFreePreview')::boolean,false) where id=(p_action->'lesson'->>'id')::uuid and "orgId"=p_org;
  end if;
  return;
 end if;
 insert into public.audit_events("orgId","actorId",action,"targetId") values(p_org,auth.uid(),t,coalesce(p_action->>'id',p_action->>'courseId',p_action->>'lessonId',c::text));
end $$;

revoke all on function private.can_discover_course(uuid,uuid),private.can_lesson(uuid,uuid) from public,anon;
grant execute on function private.can_discover_course(uuid,uuid),private.can_lesson(uuid,uuid) to authenticated;
do $$ declare f text; begin
 foreach f in array array['course_access_students(uuid,uuid)','list_course_access_coupons(uuid,uuid)','create_course_access_coupon(uuid,uuid,uuid)','revoke_course_access_coupon(uuid,uuid,uuid)','redeem_course_access_coupon(uuid,uuid,text)'] loop
 execute 'revoke all on function public.'||f||' from public,anon';
 execute 'grant execute on function public.'||f||' to authenticated';
 end loop;
end $$;

create or replace function public.media_access(p_id uuid,p_operation text) returns jsonb language plpgsql security definer set search_path='' as $$
declare l public.lessons;s public.sessions;v private.video_assets;begin
 perform private.require(auth.uid() is not null);
 if p_operation in ('upload','playback') then
  select * into l from public.lessons where id=p_id;
  perform private.require(l.id is not null and private.feature(l."orgId",'recordings') and private.can_lesson(l."orgId",l.id));
  if p_operation='upload' then perform private.require(private.can_course(l."orgId",l."courseId",true) and l.status='draft' and l."mediaStatus"<>'ready','Only a draft without a ready video can be uploaded');
  else perform private.require(l."mediaStatus"='ready' and (l.status='published' or private.can_course(l."orgId",l."courseId",true)),'This video is not ready for playback'); end if;
  select * into v from private.video_assets where "lessonId"=l.id;
  if p_operation='upload' then return jsonb_build_object('orgId',l."orgId",'lessonId',l.id,'uploadId',v."uploadId",'uploadUrl',v."uploadUrl"); end if;
  return jsonb_build_object('orgId',l."orgId",'lessonId',l.id,'playbackId',v."playbackId");
 elsif p_operation in ('join','host') then
  select * into s from public.sessions where id=p_id;
  perform private.require(s.id is not null and private.feature(s."orgId",'live') and private.can_course(s."orgId",s."courseId"));
  if p_operation='host' then perform private.require(private.can_course(s."orgId",s."courseId",true));end if;
  perform private.require(now() between s."startsAt"-interval '15 minutes' and s."startsAt"+make_interval(mins=>s.duration+30),'The classroom opens 15 minutes before class and closes 30 minutes after');
  return jsonb_build_object('orgId',s."orgId",'sessionId',s.id,'owner',private.can_course(s."orgId",s."courseId",true),'exp',extract(epoch from s."startsAt"+make_interval(mins=>s.duration+30))::bigint,'name',(select name from public.memberships where "orgId"=s."orgId" and "userId"=auth.uid()));
 end if;
 raise exception 'Invalid media operation';
end $$;

create or replace function public.create_invitation(p_org uuid,p_email text,p_name text,p_role text,p_course uuid default null) returns text language plpgsql security definer set search_path='' as $$
declare token text; begin
 if not (private.is_admin(p_org) or (p_role='student' and p_course is not null and private.can_course(p_org,p_course,true))) then raise exception 'Course teacher or organization administrator required'; end if;
 if p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(trim(p_name)) not between 1 and 100 then raise exception 'Enter a valid name and email'; end if;
 if p_course is not null and (p_role <> 'student' or not private.can_course(p_org,p_course,true)) then raise exception 'Invalid course invitation'; end if;
 token := replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 insert into public.invitations("orgId",email,name,role,"courseId","tokenHash") values(p_org,lower(trim(p_email)),trim(p_name),p_role,p_course,encode(sha256(convert_to(token,'UTF8')),'hex'));
 insert into public.audit_events("orgId","actorId",action) values(p_org,auth.uid(),'invitation.created'); return token;
end $$;

