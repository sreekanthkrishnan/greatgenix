-- Migration 0007: Add type, url, content columns to lessons table and update apply_action RPC
alter table public.lessons add column if not exists type text default 'video';
alter table public.lessons add column if not exists url text;
alter table public.lessons add column if not exists content text;

create or replace function public.apply_action(p_org uuid,p_action jsonb) returns void language plpgsql security definer set search_path='' as $$
declare
 t text := p_action->>'type'; d jsonb; c uuid; target uuid; l public.lessons; a public.assignments; s public.submissions; b jsonb; pair record; old_role text;
begin
 perform private.require(auth.uid() is not null,'Sign in first');
 if t='org-status' then
  perform private.require(private.is_platform()); target:=(p_action->>'orgId')::uuid;
  update public.organizations set active=not active where id=target; p_org:=target;
 else
  perform private.require(private.org_role(p_org) is not null or (t='feature' and private.is_platform()));
  case t
  when 'course' then
   perform private.require(private.is_admin(p_org)); d:=p_action->'course';
   perform private.require((d->>'orgId')::uuid=p_org and exists(select 1 from public.memberships where "orgId"=p_org and "userId"=(d->>'teacherId')::uuid and active and role in ('teacher','teacher-admin')));
   insert into public.courses(id,"orgId",title,subject,grade,batch,description,color,"teacherId") values((d->>'id')::uuid,p_org,trim(d->>'title'),d->>'subject',d->>'grade',d->>'batch',d->>'description',d->>'color',(d->>'teacherId')::uuid);
  when 'delete-course' then
   target:=(p_action->>'id')::uuid;
   perform private.require(private.can_course(p_org,target,true),'Permission denied to delete course');
   delete from public.enrollments where "orgId"=p_org and "courseId"=target;
   delete from public.attendance where "orgId"=p_org and "sessionId" in (select id from public.sessions where "courseId"=target);
   delete from public.sessions where "orgId"=p_org and "courseId"=target;
   delete from public.completions where "orgId"=p_org and "lessonId" in (select id from public.lessons where "courseId"=target);
   delete from public.reports where "orgId"=p_org and "lessonId" in (select id from public.lessons where "courseId"=target);
   delete from public.lessons where "orgId"=p_org and "courseId"=target;
   delete from public.submissions where "orgId"=p_org and "assignmentId" in (select id from public.assignments where "courseId"=target);
   delete from public.assignments where "orgId"=p_org and "courseId"=target;
   delete from public.courses where id=target and "orgId"=p_org;
  when 'session' then
   d:=p_action->'session'; c:=(d->>'courseId')::uuid;
   perform private.require(private.can_course(p_org,c,true) and private.feature(p_org,'live') and (d->>'orgId')::uuid=p_org);
   insert into public.sessions(id,"orgId","courseId",title,date,time,"startsAt",duration,"gmeetLink") values((d->>'id')::uuid,p_org,c,trim(d->>'title'),(d->>'date')::date,(d->>'time')::time,(d->>'startsAt')::timestamptz,(d->>'duration')::int,d->>'gmeetLink');
  when 'delete-session' then
   target:=(p_action->>'id')::uuid;
   select "courseId" into c from public.sessions where id=target and "orgId"=p_org;
   perform private.require(c is not null and private.can_course(p_org,c,true),'Permission denied to delete session');
   delete from public.attendance where "orgId"=p_org and "sessionId"=target;
   delete from public.sessions where id=target and "orgId"=p_org;
  when 'lesson' then
   d:=p_action->'lesson'; c:=(d->>'courseId')::uuid;
   perform private.require(private.can_course(p_org,c,true) and private.feature(p_org,'recordings') and (d->>'orgId')::uuid=p_org);
   insert into public.lessons(id,"orgId","courseId",title,duration,age,subject,"fileName",status,type,url,content) values((d->>'id')::uuid,p_org,c,trim(d->>'title'),(d->>'duration')::int,d->>'age',d->>'subject',d->>'fileName',coalesce(d->>'status','published'),coalesce(d->>'type','video'),d->>'url',d->>'content');
  when 'lesson-status' then
   select * into l from public.lessons where id=(p_action->>'id')::uuid and "orgId"=p_org for update;
   perform private.require(private.can_course(p_org,l."courseId",true) and private.feature(p_org,'recordings'));
   update public.lessons set status=p_action->>'status' where id=l.id;
  when 'complete' then
   select * into l from public.lessons where id=(p_action->>'id')::uuid and "orgId"=p_org;
   perform private.require(private.org_role(p_org)='student' and private.can_course(p_org,l."courseId") and private.feature(p_org,'recordings') and l.status='published');
   delete from public.completions where "lessonId"=l.id and "studentId"=auth.uid();
   if not found then insert into public.completions("orgId","lessonId","studentId") values(p_org,l.id,auth.uid()); end if;
  when 'assignment' then
   d:=p_action->'assignment'; c:=(d->>'courseId')::uuid;
   perform private.require(private.can_course(p_org,c,true) and private.feature(p_org,'assessments') and (d->>'orgId')::uuid=p_org);
   insert into public.assignments(id,"orgId","courseId",title,prompt,due,points) values((d->>'id')::uuid,p_org,c,trim(d->>'title'),trim(d->>'prompt'),(d->>'due')::date,(d->>'points')::int);
  when 'submit' then
   select * into a from public.assignments where id=(p_action->>'id')::uuid and "orgId"=p_org;
   perform private.require(private.org_role(p_org)='student' and private.can_course(p_org,a."courseId") and private.feature(p_org,'assessments'));
   insert into public.submissions("orgId","assignmentId","studentId",answer) values(p_org,a.id,auth.uid(),trim(p_action->>'answer')) on conflict("assignmentId","studentId") do update set answer=excluded.answer,score=null,feedback=null,published=false;
  when 'grade' then
   select * into s from public.submissions where id=(p_action->>'id')::uuid and "orgId"=p_org for update;
   select * into a from public.assignments where id=s."assignmentId" and "orgId"=p_org;
   perform private.require(private.can_course(p_org,a."courseId",true) and private.feature(p_org,'assessments'));
   perform private.require((p_action->>'score')::numeric between 0 and a.points and length(trim(p_action->>'feedback')) between 1 and 1500,'Enter a valid score and feedback');
   update public.submissions set score=(p_action->>'score')::numeric,feedback=trim(p_action->>'feedback'),published=true where id=s.id;
  when 'attendance' then
   select "courseId" into c from public.sessions where id=(p_action->>'sessionId')::uuid and "orgId"=p_org;
   perform private.require(private.can_course(p_org,c,true) and private.feature(p_org,'attendance'));
   for pair in select * from jsonb_each_text(p_action->'values') loop
    perform private.require(exists(select 1 from public.enrollments e join public.memberships m on m."orgId"=e."orgId" and m."userId"=e."studentId" where e."orgId"=p_org and e."courseId"=c and e."studentId"=pair.key::uuid and m.active and m.role='student'));
    insert into public.attendance("orgId","sessionId","studentId",status) values(p_org,(p_action->>'sessionId')::uuid,pair.key::uuid,pair.value) on conflict("sessionId","studentId") do update set status=excluded.status;
   end loop;
  when 'rename' then
   perform private.require(private.is_admin(p_org)); update public.organizations set name=trim(p_action->>'name') where id=p_org;
  when 'branding' then
   perform private.require(private.is_admin(p_org)); b:=p_action->'branding';
   perform private.require(b->>'primaryColor' ~ '^#[0-9a-fA-F]{6}$' and b->>'accentColor' ~ '^#[0-9a-fA-F]{6}$' and b->>'fontFamily' in ('system','serif','humanist') and (b->>'fontSize')::int between 14 and 20 and b->>'theme' in ('light','dark') and length(b->>'tagline')<=100 and length(b->>'logoUrl')<=300000 and (b->>'logoUrl'='' or b->>'logoUrl' ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$'),'Invalid branding settings');
   update public.organizations set branding=jsonb_build_object('primaryColor',b->>'primaryColor','accentColor',b->>'accentColor','fontFamily',b->>'fontFamily','fontSize',(b->>'fontSize')::int,'theme',b->>'theme','tagline',b->>'tagline','logoUrl',b->>'logoUrl') where id=p_org;
  when 'feature' then
   perform private.require((p_action->>'orgId')::uuid=p_org and (private.is_admin(p_org) or private.is_platform()) and p_action->>'feature' in ('live','recordings','attendance','assessments') and jsonb_typeof(p_action->'enabled')='boolean');
   if p_action->>'feature'='attendance' and (p_action->>'enabled')::boolean then perform private.require(private.feature(p_org,'live'),'Enable live classes before attendance'); end if;
   update public.organizations set features=jsonb_set(features,array[p_action->>'feature'],p_action->'enabled') where id=p_org;
   if p_action->>'feature'='live' and not (p_action->>'enabled')::boolean then update public.organizations set features=jsonb_set(features,'{attendance}','false') where id=p_org; end if;
  when 'report' then
   select * into l from public.lessons where id=(p_action->>'lessonId')::uuid and "orgId"=p_org;
   perform private.require(private.org_role(p_org)='student' and private.can_course(p_org,l."courseId") and private.feature(p_org,'recordings') and l.status='published');
   insert into public.reports("orgId","lessonId","studentId",reason) values(p_org,l.id,auth.uid(),trim(p_action->>'reason'));
  when 'enroll' then
   c:=(p_action->>'courseId')::uuid; target:=(p_action->>'studentId')::uuid;
   perform private.require(private.is_admin(p_org) and private.can_course(p_org,c,true));
   if (p_action->>'enrolled')::boolean then
    perform private.require(exists(select 1 from public.memberships where "orgId"=p_org and "userId"=target and active and role='student'));
    insert into public.enrollments("orgId","courseId","studentId") values(p_org,c,target) on conflict do nothing;
   else delete from public.enrollments where "orgId"=p_org and "courseId"=c and "studentId"=target; end if;
  when 'assign-teacher' then
   c:=(p_action->>'courseId')::uuid; target:=(p_action->>'teacherId')::uuid;
   perform private.require(private.is_admin(p_org) and private.can_course(p_org,c,true) and exists(select 1 from public.memberships where "orgId"=p_org and "userId"=target and active and role in ('teacher','teacher-admin')));
   update public.courses set "teacherId"=target where id=c and "orgId"=p_org;
  when 'membership' then
   perform private.require(private.is_admin(p_org)); target:=(p_action->>'userId')::uuid;
   perform 1 from public.organizations where id=p_org for update;
   select role into old_role from public.memberships where "orgId"=p_org and "userId"=target;
   perform private.require(old_role is not null);
   if old_role='teacher-admin' and (p_action->>'role'<>'teacher-admin' or not (p_action->>'active')::boolean) then
    perform private.require(exists(select 1 from public.memberships where "orgId"=p_org and "userId"<>target and active and role='teacher-admin'),'Keep at least one active organization administrator');
   end if;
   if p_action->>'role'='student' or not (p_action->>'active')::boolean then
    perform private.require(not exists(select 1 from public.courses where "orgId"=p_org and "teacherId"=target),'Reassign this teacher’s courses first');
   end if;
   update public.memberships set role=p_action->>'role',active=(p_action->>'active')::boolean where "orgId"=p_org and "userId"=target;
   if p_action->>'role'<>'student' then delete from public.enrollments where "orgId"=p_org and "studentId"=target; end if;
  else raise exception 'Unknown operation';
  end case;
  end if;
 insert into public.audit_events("orgId","actorId",action,"targetId") values(p_org,auth.uid(),t,coalesce(p_action->>'id',p_action->>'userId',p_action->>'courseId',p_action->>'sessionId',p_action->>'lessonId'));
end $$;
