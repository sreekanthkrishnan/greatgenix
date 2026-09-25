-- Small optional cover images follow the existing organization-logo upload pattern.
alter table public.courses add column "thumbnailUrl" text;
alter table public.courses add constraint course_thumbnail_valid check (
 "thumbnailUrl" is null or (
  length("thumbnailUrl") <= 270000 and
  "thumbnailUrl" ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$'
 )
);

create or replace function public.apply_action(p_org uuid,p_action jsonb) returns void language plpgsql security definer set search_path='' as $$
declare t text:=p_action->>'type'; d jsonb; c uuid; target uuid; l public.lessons; begin
 perform private.require(auth.uid() is not null,'Sign in first');
 if t='feature' then raise exception 'Features are managed by subscription plans and coupons'; end if;
 if t in ('course','course-access') then
  d:=case when t='course' then p_action->'course' else p_action end;
  c:=(d->>'id')::uuid;
  if t='course' then
   -- Ownership comes from the authenticated creator, never a client-supplied teacher.
   d:=jsonb_set(d,'{teacherId}',to_jsonb(auth.uid()));
   perform private.require(private.org_role(p_org) in ('teacher','teacher-admin'));
   perform private.require((d->>'orgId')::uuid=p_org and (private.is_admin(p_org) or (d->>'teacherId')::uuid=auth.uid()));
   perform private.require(exists(select 1 from public.memberships where "orgId"=p_org and "userId"=(d->>'teacherId')::uuid and active and role in ('teacher','teacher-admin')));
   insert into public.courses(id,"orgId",title,subject,grade,batch,description,color,"teacherId") values(c,p_org,trim(d->>'title'),d->>'subject',d->>'grade',d->>'batch',d->>'description',d->>'color',(d->>'teacherId')::uuid);
  else perform private.require(private.can_course(p_org,c,true)); end if;
  perform 1 from public.courses where id=c and "orgId"=p_org for update;
  if d->>'pricing'='paid' then
   perform private.require(jsonb_typeof(d->'coursePrice')='number' and (d->>'coursePrice')::numeric > 0,'Course Price must be greater than 0.');
   perform private.require(coalesce(jsonb_typeof(d->'discountedPrice'),'null')='null' or (jsonb_typeof(d->'discountedPrice')='number' and (d->>'discountedPrice')::numeric > 0 and (d->>'discountedPrice')::numeric < (d->>'coursePrice')::numeric),'Discounted Price must be greater than 0 and less than Course Price.');
  end if;
  update public.courses set visibility=coalesce(d->>'visibility','private'),pricing=coalesce(d->>'pricing','free'),
   "coursePrice"=case when d->>'pricing'='paid' then (d->>'coursePrice')::numeric else null end,
   "discountedPrice"=case when d->>'pricing'='paid' then (d->>'discountedPrice')::numeric else null end
  where id=c and "orgId"=p_org;
  if d ? 'thumbnailUrl' then
   update public.courses set "thumbnailUrl"=nullif(d->>'thumbnailUrl','') where id=c and "orgId"=p_org;
  end if;
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
