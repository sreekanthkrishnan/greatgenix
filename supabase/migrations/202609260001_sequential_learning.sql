-- Existing courses retain their library behavior until a teacher explicitly activates a path.
alter table public.courses add column sequential boolean not null default false;
alter table public.enrollments add column source text not null default 'direct' check(source in ('direct','self'));

create table private.student_subscriptions (
 id uuid primary key default gen_random_uuid(), "orgId" uuid not null references public.organizations(id),
 "studentId" uuid not null, starts_at timestamptz not null, ends_at timestamptz not null,
 reference text not null check(length(trim(reference)) between 1 and 200), revoked boolean not null default false,
 "confirmedBy" uuid not null references auth.users(id), check(ends_at>starts_at),
 foreign key("orgId","studentId") references public.memberships("orgId","userId")
);
create index student_subscription_access on private.student_subscriptions("orgId","studentId",ends_at);
create table private.course_modules (
 id uuid primary key, "courseId" uuid not null references public.courses(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 100), position integer not null check(position>=0),
 unique("courseId",id), unique("courseId",position) deferrable initially deferred
);
create table private.learning_items (
 id uuid primary key, "courseId" uuid not null references public.courses(id) on delete cascade,
 "moduleId" uuid not null, title text not null check(length(trim(title)) between 1 and 100),
 kind text not null check(kind in ('video','notes','document','assessment','workshop','practice')),
 position integer not null check(position>=0), content text not null default '' check(length(content)<=20000),
 "lessonId" uuid references public.lessons(id) on delete restrict,
 "assignmentId" uuid references public.assignments(id) on delete restrict,
 "sessionId" uuid references public.sessions(id) on delete restrict,
 duration_seconds numeric check(duration_seconds>0 and duration_seconds<=86400),
 foreign key("courseId","moduleId") references private.course_modules("courseId",id) on delete cascade,
 unique("moduleId",position) deferrable initially deferred,
 unique("lessonId"), unique("assignmentId"), unique("sessionId"),
 check((kind='video' and "lessonId" is not null and duration_seconds is not null) or kind<>'video'),
 check((kind='assessment' and "assignmentId" is not null) or kind<>'assessment')
);
create table private.learning_progress (
 "itemId" uuid not null references private.learning_items(id) on delete cascade,
 "studentId" uuid not null references auth.users(id), completed_at timestamptz,
 watched numeric not null default 0, short_covered numeric not null default 0, score numeric check(score>=0), feedback text, evaluated_at timestamptz,
 primary key("itemId","studentId")
);
create table private.playback_sessions (
 "itemId" uuid not null references private.learning_items(id) on delete cascade,
 "studentId" uuid not null references auth.users(id), token uuid not null,
 sequence integer not null default 0, position numeric not null default 0,
 active_wall numeric not null default 0, active_media numeric not null default 0, credited numeric not null default 0,
 active boolean not null default false, last_at timestamptz not null default clock_timestamp(),
 primary key("itemId","studentId")
);
revoke all on private.student_subscriptions,private.course_modules,private.learning_items,private.learning_progress,private.playback_sessions from public,anon,authenticated;

create function private.student_subscription(o uuid,u uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.student_subscriptions where "orgId"=o and "studentId"=u and not revoked and starts_at<=now() and ends_at>now())
$$;
create or replace function private.can_course(o uuid,c uuid,teaching boolean default false) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(private.org_role(o) is not null and exists(select 1 from public.courses x where x.id=c and x."orgId"=o and (
 private.is_admin(o) or (private.org_role(o)='teacher' and x."teacherId"=auth.uid()) or (not teaching and private.org_role(o)='student' and (
 exists(select 1 from public.enrollments e where e."orgId"=o and e."courseId"=c and e."studentId"=auth.uid() and e.source='direct') or
 (x.visibility='public' and ((x.pricing='free' and (not x.sequential or exists(select 1 from public.enrollments e where e."courseId"=c and e."studentId"=auth.uid()))) or (x.pricing='paid' and private.student_subscription(o,auth.uid())))))))),false)
$$;
create function private.item_unlocked(i uuid,u uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.learning_items x join private.course_modules m on m.id=x."moduleId" where x.id=i and (
 exists(select 1 from private.learning_progress p where p."itemId"=i and p."studentId"=u and p.completed_at is not null) or
 not exists(select 1 from private.learning_items prev join private.course_modules pm on pm.id=prev."moduleId" where prev."courseId"=x."courseId" and (pm.position,prev.position)<(m.position,x.position) and not exists(select 1 from private.learning_progress p where p."itemId"=prev.id and p."studentId"=u and p.completed_at is not null))))
$$;
create function private.resource_unlocked(o uuid,c uuid,r uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.can_course(o,c,true) or (private.can_course(o,c) and (exists(select 1 from public.courses where id=c and not sequential) or (exists(select 1 from public.enrollments where "courseId"=c and "studentId"=auth.uid()) and exists(select 1 from private.learning_items where "courseId"=c and r in ("lessonId","assignmentId","sessionId") and private.item_unlocked(id,auth.uid())))))
$$;
alter function private.can_lesson(uuid,uuid) rename to can_lesson_before_sequence;
create function private.can_lesson(o uuid,l uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.can_lesson_before_sequence(o,l) and exists(select 1 from public.lessons x join public.courses c on c.id=x."courseId" where x.id=l and (not c.sequential or private.resource_unlocked(o,c.id,l)))
$$;
-- Recreate policies: PostgreSQL stores function identity, not its current name.
drop policy lesson_read on public.lessons;
create policy lesson_read on public.lessons for select to authenticated using(private.can_lesson("orgId",id));
drop policy assignment_read on public.assignments;
create policy assignment_read on public.assignments for select to authenticated using(private.feature("orgId",'assessments') and private.resource_unlocked("orgId","courseId",id));
drop policy session_read on public.sessions;
create policy session_read on public.sessions for select to authenticated using(private.feature("orgId",'live') and private.resource_unlocked("orgId","courseId",id));

create function public.enroll_learning_course(p_org uuid,p_course uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.courses where id=p_course and "orgId"=p_org for update;
 perform private.require(private.org_role(p_org)='student' and exists(select 1 from public.courses where id=p_course and "orgId"=p_org and visibility='public' and (pricing='free' or private.can_course(p_org,p_course))),'Course enrollment unavailable');
 insert into public.enrollments("orgId","courseId","studentId",source) values(p_org,p_course,auth.uid(),'self') on conflict do nothing;
end $$;
create function public.learning_entitlements(p_org uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'access',private.can_course(p_org,id))),'[]') from public.courses where "orgId"=p_org and private.can_discover_course(p_org,id)
$$;
create function public.student_subscription_records(p_org uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require(private.org_role(p_org) is not null);
 return coalesce((select jsonb_agg(to_jsonb(s) order by ends_at desc) from private.student_subscriptions s where "orgId"=p_org and (private.is_admin(p_org) or "studentId"=auth.uid())),'[]');
end $$;
create function public.save_student_subscription(p_org uuid,p_student uuid,p_end timestamptz,p_reference text,p_revoke uuid default null) returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.require(private.is_admin(p_org),'Organization administrator required to confirm subscription payment');
 if p_revoke is not null then
  update private.student_subscriptions set revoked=true where id=p_revoke and "orgId"=p_org;
 else
  perform private.require(p_end>now() and p_end<=now()+interval '10 years','Choose a future expiry within ten years');
  perform private.require(exists(select 1 from public.memberships where "orgId"=p_org and "userId"=p_student and active and role='student'));
  insert into private.student_subscriptions("orgId","studentId",starts_at,ends_at,reference,"confirmedBy") values(p_org,p_student,now(),p_end,trim(p_reference),auth.uid());
 end if;
 insert into public.audit_events("orgId","actorId",action,"targetId") values(p_org,auth.uid(),'student-subscription.saved',coalesce(p_revoke,p_student)::text);
end $$;

create function public.save_learning_structure(p_org uuid,p_course uuid,p_modules jsonb,p_activate boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare m jsonb; i jsonb; mi uuid; iid uuid; mp integer:=0; ip integer; was_active boolean; existing private.learning_items;
begin
 perform private.require(private.can_course(p_org,p_course,true));
 select sequential into was_active from public.courses where id=p_course and "orgId"=p_org for update;
 perform private.require(jsonb_typeof(p_modules)='array' and jsonb_array_length(p_modules) between 1 and 100,'Add at least one module (maximum 100)');
 perform private.require((select count(*)=count(distinct (mm->>'id')) from jsonb_array_elements(p_modules) mm),'Module IDs must be unique');
 perform private.require((select count(*)=count(distinct (ii->>'id')) from jsonb_array_elements(p_modules) mm cross join lateral jsonb_array_elements(mm->'items') ii),'Item IDs must be unique');
 -- Preserve identities and progress. Remove unused items only before any progress exists.
 perform private.require(not exists(select 1 from private.learning_items x join private.learning_progress p on p."itemId"=x.id where x."courseId"=p_course and not exists(select 1 from jsonb_array_elements(p_modules) mm cross join lateral jsonb_array_elements(mm->'items') ii where (ii->>'id')::uuid=x.id)),'Items with student progress cannot be removed');
 delete from private.learning_items x where x."courseId"=p_course and not exists(select 1 from jsonb_array_elements(p_modules) mm cross join lateral jsonb_array_elements(mm->'items') ii where (ii->>'id')::uuid=x.id);
 for m in select value from jsonb_array_elements(p_modules) loop
  mi:=(m->>'id')::uuid;
  perform private.require(not exists(select 1 from private.course_modules where id=mi and "courseId"<>p_course));
  perform private.require(jsonb_typeof(m->'items')='array' and jsonb_array_length(m->'items') between 1 and 200,'Each module needs 1–200 learning items');
  insert into private.course_modules(id,"courseId",title,position) values(mi,p_course,trim(m->>'title'),mp) on conflict(id) do update set title=excluded.title,position=excluded.position;
  ip:=0;
  for i in select value from jsonb_array_elements(m->'items') loop
   iid:=(i->>'id')::uuid;
   select * into existing from private.learning_items where id=iid;
   perform private.require(existing.id is null or existing."courseId"=p_course);
   if exists(select 1 from private.learning_progress where "itemId"=iid) then
    perform private.require(existing.kind=i->>'kind' and existing."lessonId" is not distinct from (i->>'lessonId')::uuid and existing."assignmentId" is not distinct from (i->>'assignmentId')::uuid and existing."sessionId" is not distinct from (i->>'sessionId')::uuid,'Keep resource identity for items with progress');
   end if;
   if i->>'lessonId' is not null then
    perform private.require(i->>'kind' in ('video','notes','document'));
    perform private.require(exists(select 1 from public.lessons where id=(i->>'lessonId')::uuid and "courseId"=p_course and "orgId"=p_org and status='published' and coalesce(type,'video')=i->>'kind'),'Choose a published lesson of the matching type');
   end if;
   if i->>'kind'='video' then
    perform private.require(exists(select 1 from public.lessons where id=(i->>'lessonId')::uuid and ((url is null or url='') and "mediaStatus"='ready' or url ~ '^https://.*\.(mp4|webm|ogg)(\?.*)?$')),'Sequential video requires an uploaded ready video or direct HTTPS MP4/WebM/Ogg URL');
   end if;
   if i->>'assignmentId' is not null then perform private.require(i->>'kind'='assessment' and exists(select 1 from public.assignments where id=(i->>'assignmentId')::uuid and "courseId"=p_course and "orgId"=p_org)); end if;
   if i->>'sessionId' is not null then perform private.require(i->>'kind'='workshop' and exists(select 1 from public.sessions where id=(i->>'sessionId')::uuid and "courseId"=p_course and "orgId"=p_org)); end if;
   perform private.require(i->>'kind' not in ('notes','document') or i->>'lessonId' is not null,'Choose a published notes or document lesson');
   insert into private.learning_items(id,"courseId","moduleId",title,kind,position,content,"lessonId","assignmentId","sessionId",duration_seconds)
    values(iid,p_course,mi,trim(i->>'title'),i->>'kind',ip,coalesce(i->>'content',''),(i->>'lessonId')::uuid,(i->>'assignmentId')::uuid,(i->>'sessionId')::uuid,(i->>'duration_seconds')::numeric)
    on conflict(id) do update set "moduleId"=excluded."moduleId",title=excluded.title,kind=excluded.kind,position=excluded.position,content=excluded.content,"lessonId"=excluded."lessonId","assignmentId"=excluded."assignmentId","sessionId"=excluded."sessionId",duration_seconds=excluded.duration_seconds;
   ip:=ip+1;
  end loop;
  mp:=mp+1;
 end loop;
 delete from private.course_modules where "courseId"=p_course and id not in(select (value->>'id')::uuid from jsonb_array_elements(p_modules));
 if p_activate or was_active then
  update public.courses set sequential=true where id=p_course;
  if not was_active then
   -- Historical completions and submissions are retained as earned progress, without inventing video evidence.
   insert into private.learning_progress("itemId","studentId",completed_at)
   select i.id,c."studentId",now() from private.learning_items i join public.completions c on c."lessonId"=i."lessonId" where i."courseId"=p_course
   union select i.id,s."studentId",now() from private.learning_items i join public.submissions s on s."assignmentId"=i."assignmentId" where i."courseId"=p_course
   on conflict do nothing;
  end if;
 end if;
 insert into public.audit_events("orgId","actorId",action,"targetId") values(p_org,auth.uid(),'learning-structure.saved',p_course::text);
end $$;

create function public.learning_outline(p_org uuid,p_course uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare owner boolean; enrolled boolean;
begin
 owner:=private.can_course(p_org,p_course,true);
 perform private.require(private.can_discover_course(p_org,p_course));
 enrolled:=exists(select 1 from public.enrollments where "courseId"=p_course and "studentId"=auth.uid());
 return jsonb_build_object('access',private.can_course(p_org,p_course),'enrolled',enrolled,'modules',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'title',m.title,'items',coalesce((select jsonb_agg(
 jsonb_build_object('id',i.id,'title',i.title,'kind',i.kind,'completed',p.completed_at is not null,'watched',coalesce(p.watched,0),'required',least(60,i.duration_seconds),'eligible',coalesce(p.watched>=least(60,i.duration_seconds) and (i.duration_seconds>=60 or p.short_covered>=i.duration_seconds-least(0.25,i.duration_seconds*0.01)),false),'score',p.score,'evaluated_at',p.evaluated_at,'feedback',p.feedback,
 'state',case when p.completed_at is not null and private.can_course(p_org,p_course) then 'completed' when owner or (enrolled and private.can_course(p_org,p_course) and private.item_unlocked(i.id,auth.uid())) then 'available' else 'locked' end)
 || case when owner then jsonb_build_object('lessonId',i."lessonId",'assignmentId',i."assignmentId",'sessionId',i."sessionId",'content',i.content,'duration_seconds',i.duration_seconds) else '{}'::jsonb end order by i.position)
 from private.learning_items i left join private.learning_progress p on p."itemId"=i.id and p."studentId"=auth.uid() where i."moduleId"=m.id),'[]')) order by m.position) from private.course_modules m where m."courseId"=p_course),'[]'));
end $$;
create function private.require_learning_item(o uuid,i uuid) returns private.learning_items language plpgsql security definer set search_path='' as $$
declare x private.learning_items;
begin
 select * into x from private.learning_items where id=i;
 perform 1 from public.courses where id=x."courseId" and "orgId"=o and sequential for update;
 perform private.require(found and private.can_course(o,x."courseId"),'Course access required');
 perform private.require(private.can_course(o,x."courseId",true) or (exists(select 1 from public.enrollments where "courseId"=x."courseId" and "studentId"=auth.uid()) and private.item_unlocked(i,auth.uid())),'Learning item is locked or enrollment is required');
 return x;
end $$;
create function public.learning_item(p_org uuid,p_item uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare x private.learning_items;
begin
 x:=private.require_learning_item(p_org,p_item);
 return to_jsonb(x)||jsonb_build_object('lesson',(select to_jsonb(l) from public.lessons l where id=x."lessonId" and private.can_lesson(p_org,l.id)),
 'assignment',(select to_jsonb(a) from public.assignments a where id=x."assignmentId" and private.feature(p_org,'assessments')),
 'session',(select to_jsonb(s) from public.sessions s where id=x."sessionId" and private.feature(p_org,'live')),
 'submission',(select to_jsonb(s) from public.submissions s where "assignmentId"=x."assignmentId" and "studentId"=auth.uid()));
end $$;
create function public.complete_learning_item(p_org uuid,p_item uuid) returns void language plpgsql security definer set search_path='' as $$
declare x private.learning_items;
begin
 x:=private.require_learning_item(p_org,p_item);
 perform private.require(private.org_role(p_org)='student' and x.kind in ('video','notes','document'));
 if x."lessonId" is not null then perform private.require(private.can_lesson(p_org,x."lessonId")); end if;
 if exists(select 1 from private.learning_progress where "itemId"=p_item and "studentId"=auth.uid() and completed_at is not null) then return; end if;
 if x.kind='video' then perform private.require(exists(select 1 from private.learning_progress where "itemId"=p_item and "studentId"=auth.uid() and watched>=least(60,x.duration_seconds) and (x.duration_seconds>=60 or short_covered>=x.duration_seconds-least(0.25,x.duration_seconds*0.01))),'Watch the required active playback before marking complete'); end if;
 insert into private.learning_progress("itemId","studentId",completed_at) values(p_item,auth.uid(),now()) on conflict("itemId","studentId") do update set completed_at=coalesce(private.learning_progress.completed_at,excluded.completed_at);
 if x."lessonId" is not null then insert into public.completions("orgId","lessonId","studentId") values(p_org,x."lessonId",auth.uid()) on conflict do nothing; end if;
end $$;
create function public.record_learning_participation(p_org uuid,p_item uuid,p_student uuid,p_score numeric default null,p_feedback text default null) returns void language plpgsql security definer set search_path='' as $$
declare x private.learning_items;
begin
 select * into x from private.learning_items where id=p_item;
 perform 1 from public.courses where id=x."courseId" and "orgId"=p_org and sequential for update;
 perform private.require(found and private.can_course(p_org,x."courseId",true) and x.kind in ('practice','workshop'));
 perform private.require(exists(select 1 from public.enrollments e join public.memberships m on m."orgId"=e."orgId" and m."userId"=e."studentId" where e."courseId"=x."courseId" and e."studentId"=p_student and m.active and m.role='student') and private.item_unlocked(p_item,p_student),'Student must be enrolled and have reached this item');
 perform private.require(exists(select 1 from private.learning_progress where "itemId"=p_item and "studentId"=p_student and completed_at is not null) or exists(select 1 from public.enrollments e join public.courses c on c.id=e."courseId" where c.id=x."courseId" and e."studentId"=p_student and (e.source='direct' or (c.visibility='public' and (c.pricing='free' or private.student_subscription(p_org,p_student))))),'Student course access has expired or was revoked');
 perform private.require(p_feedback is null or length(p_feedback)<=1500);
 insert into private.learning_progress("itemId","studentId",completed_at,score,feedback,evaluated_at) values(p_item,p_student,now(),p_score,p_feedback,case when p_score is not null then now() end)
 on conflict("itemId","studentId") do update set completed_at=coalesce(private.learning_progress.completed_at,excluded.completed_at),score=coalesce(excluded.score,private.learning_progress.score),feedback=case when excluded.score is not null then excluded.feedback else private.learning_progress.feedback end,evaluated_at=coalesce(excluded.evaluated_at,private.learning_progress.evaluated_at);
 insert into public.audit_events("orgId","actorId",action,"targetId") values(p_org,auth.uid(),'learning-participation.recorded',p_item::text);
end $$;

create function public.start_learning_playback(p_org uuid,p_item uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare x private.learning_items; t uuid:=gen_random_uuid();
begin
 x:=private.require_learning_item(p_org,p_item);
 perform private.require(private.org_role(p_org)='student' and x.kind='video' and private.can_lesson(p_org,x."lessonId"));
 insert into private.playback_sessions("itemId","studentId",token) values(p_item,auth.uid(),t) on conflict("itemId","studentId") do update set token=t,sequence=0,position=0,active_wall=0,active_media=0,credited=0,active=false,last_at=clock_timestamp();
 return t;
end $$;
create function public.learning_playback_tick(p_org uuid,p_item uuid,p_token uuid,p_sequence integer,p_position numeric,p_active boolean,p_flush boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare x private.learning_items; s private.playback_sessions; elapsed numeric; delta numeric; credit numeric:=0; total numeric; covered numeric;
begin
 x:=private.require_learning_item(p_org,p_item);
 perform private.require(private.org_role(p_org)='student' and x.kind='video' and private.can_lesson(p_org,x."lessonId"));
 perform private.require(p_position::text not in ('NaN','Infinity','-Infinity'));
 select * into s from private.playback_sessions where "itemId"=p_item and "studentId"=auth.uid() for update;
 perform private.require(s.token=p_token and p_sequence=s.sequence+1 and p_position>=0 and p_position<=x.duration_seconds+1 and p_active is not null,'Playback session changed; reopen this lesson');
 elapsed:=extract(epoch from clock_timestamp()-s.last_at); delta:=p_position-s.position;
 -- A discontinuity, stale heartbeat, inactive interval, or seek never earns credit.
 if s.active and (p_active or p_flush) and elapsed between 0 and 5 and delta>0 and delta<=elapsed*2+0.25 then
  s.active_wall:=s.active_wall+elapsed; s.active_media:=s.active_media+delta;
  credit:=greatest(0,least(s.active_wall,s.active_media)-s.credited); s.credited:=s.credited+credit;
 else s.active_wall:=0; s.active_media:=0; s.credited:=0; end if;
 if not p_active then s.active_wall:=0; s.active_media:=0; s.credited:=0; end if;
 insert into private.learning_progress("itemId","studentId",watched) values(p_item,auth.uid(),credit) on conflict("itemId","studentId") do update set watched=least(least(60,x.duration_seconds),private.learning_progress.watched+credit) returning watched into total;
 select short_covered into covered from private.learning_progress where "itemId"=p_item and "studentId"=auth.uid();
 if x.duration_seconds<60 and credit>0 then
  update private.learning_progress set short_covered=case when s.position<=short_covered+least(0.25,x.duration_seconds*0.01) then greatest(short_covered,least(p_position,x.duration_seconds)) else short_covered end where "itemId"=p_item and "studentId"=auth.uid() returning short_covered into covered;
  if covered>=x.duration_seconds-least(0.25,x.duration_seconds*0.01) and total>=x.duration_seconds-least(0.25,x.duration_seconds*0.01) then
   total:=x.duration_seconds;
   update private.learning_progress set watched=total where "itemId"=p_item and "studentId"=auth.uid();
  end if;
 end if;
 update private.playback_sessions set sequence=p_sequence,position=p_position,active_wall=s.active_wall,active_media=s.active_media,credited=s.credited,active=p_active,last_at=clock_timestamp() where "itemId"=p_item and "studentId"=auth.uid();
 return jsonb_build_object('watched',total,'eligible',total>=least(60,x.duration_seconds) and (x.duration_seconds>=60 or coalesce(covered,0)>=x.duration_seconds-least(0.25,x.duration_seconds*0.01)));
end $$;

-- Guard legacy mutation/media endpoints as well as the new learning APIs.
alter function public.apply_action(uuid,jsonb) rename to apply_action_before_sequence;
create function public.apply_action(p_org uuid,p_action jsonb) returns void language plpgsql security definer set search_path='' as $$
declare t text:=p_action->>'type'; r uuid; c uuid; i private.learning_items;
begin
 if t in ('complete','submit') then
  r:=(p_action->>'id')::uuid;
  if t='complete' then select "courseId" into c from public.lessons where id=r and "orgId"=p_org;
  else select "courseId" into c from public.assignments where id=r and "orgId"=p_org; end if;
  perform 1 from public.courses where id=c for update;
  if exists(select 1 from public.courses where id=c and sequential) then
   perform private.require(private.resource_unlocked(p_org,c,r));
   select * into i from private.learning_items where "courseId"=c and r in ("lessonId","assignmentId");
   perform private.require(exists(select 1 from public.enrollments where "courseId"=c and "studentId"=auth.uid()),'Enroll before starting');
   if t='complete' then perform public.complete_learning_item(p_org,i.id); return; end if;
  end if;
 end if;
 if t='lesson-status' and p_action->>'status'<>'published' then
  perform private.require(not exists(select 1 from private.learning_items li join public.courses cc on cc.id=li."courseId" where li."lessonId"=(p_action->>'id')::uuid and cc.sequential),'Remove this lesson from the active learning path before unpublishing it');
 end if;
 if t='attendance' then perform 1 from public.courses where id=(select "courseId" from public.sessions where id=(p_action->>'sessionId')::uuid) for update; end if;
 -- Remove path references before the existing cascading course cleanup.
 if t='delete-course' then
  perform private.require(private.can_course(p_org,(p_action->>'id')::uuid,true));
  delete from private.course_modules where "courseId"=(p_action->>'id')::uuid;
 end if;
 perform public.apply_action_before_sequence(p_org,p_action);
 if t='enroll' and (p_action->>'enrolled')::boolean then
  update public.enrollments set source='direct' where "orgId"=p_org and "courseId"=(p_action->>'courseId')::uuid and "studentId"=(p_action->>'studentId')::uuid;
 end if;
 if t='submit' and i.id is not null then
  insert into private.learning_progress("itemId","studentId",completed_at) values(i.id,auth.uid(),now()) on conflict("itemId","studentId") do update set completed_at=coalesce(private.learning_progress.completed_at,excluded.completed_at);
 end if;
 if t='attendance' then
  -- Attendance stays independent of grading and only advances a currently reachable workshop.
  insert into private.learning_progress("itemId","studentId",completed_at)
  select x.id,a."studentId",now() from private.learning_items x join public.attendance a on a."sessionId"=x."sessionId" join public.courses cc on cc.id=x."courseId"
  where x."sessionId"=(p_action->>'sessionId')::uuid and cc."orgId"=p_org and cc.sequential and a.status in ('present','late') and private.item_unlocked(x.id,a."studentId") and exists(select 1 from public.enrollments e where e."courseId"=cc.id and e."studentId"=a."studentId" and (e.source='direct' or (cc.visibility='public' and (cc.pricing='free' or private.student_subscription(p_org,a."studentId")))))
  on conflict("itemId","studentId") do update set completed_at=coalesce(private.learning_progress.completed_at,excluded.completed_at);
 end if;
end $$;
alter function public.media_access(uuid,text) rename to media_access_before_sequence;
create function public.media_access(p_id uuid,p_operation text) returns jsonb language plpgsql security definer set search_path='' as $$
declare c uuid; o uuid;
begin
 if p_operation='playback' then
  select "courseId","orgId" into c,o from public.lessons where id=p_id;
  perform private.require(private.can_lesson(o,p_id));
 elsif p_operation in ('join','host') then
  select "courseId","orgId" into c,o from public.sessions where id=p_id;
  perform private.require(private.resource_unlocked(o,c,p_id));
 end if;
 return public.media_access_before_sequence(p_id,p_operation);
end $$;
revoke all on function public.apply_action_before_sequence(uuid,jsonb),public.media_access_before_sequence(uuid,text) from public,anon,authenticated;
-- All new helpers are private; only the documented RPCs and policy helpers are executable by clients.
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature,n.nspname,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where
 (n.nspname='private' and p.proname in ('student_subscription','item_unlocked','resource_unlocked','require_learning_item','can_lesson','can_lesson_before_sequence')) or
 (n.nspname='public' and p.proname in ('enroll_learning_course','learning_entitlements','student_subscription_records','save_student_subscription','save_learning_structure','learning_outline','learning_item','complete_learning_item','record_learning_participation','start_learning_playback','learning_playback_tick','apply_action','media_access')) loop
 execute 'revoke all on function '||f.signature||' from public,anon,authenticated';
 if f.nspname='public' or f.proname in ('resource_unlocked','can_lesson') then execute 'grant execute on function '||f.signature||' to authenticated'; end if;
 end loop;
end $$;

-- Subscription enrollment is not an individual purchase. Coupon redemption upgrades it explicitly.
create or replace function public.create_course_access_coupon(p_org uuid,p_course uuid,p_student uuid) returns text language plpgsql security definer set search_path='' as $$
declare token text; begin
 perform private.require(private.can_course(p_org,p_course,true));
 perform 1 from public.courses where id=p_course and "orgId"=p_org for update;
 perform private.require(exists(select 1 from public.courses where id=p_course and "orgId"=p_org and visibility='public' and pricing='paid'),'Coupons are for paid public courses');
 perform private.require(exists(select 1 from public.memberships where "orgId"=p_org and "userId"=p_student and active and role='student'),'Choose an active student in this organization');
 perform private.require(not exists(select 1 from public.enrollments where "courseId"=p_course and "studentId"=p_student and source='direct'),'Student already has full access');
 update private.course_access_coupons set revoked=true where "courseId"=p_course and "studentId"=p_student and "redeemedAt" is null;
 token:=replace(gen_random_uuid()::text,'-','');
 insert into private.course_access_coupons("orgId","courseId","studentId","tokenHash","createdBy") values(p_org,p_course,p_student,encode(sha256(convert_to(token,'UTF8')),'hex'),auth.uid());
 insert into public.audit_events("orgId","actorId",action,"targetId") values(p_org,auth.uid(),'course-coupon.created',p_course::text);
 return token;
end $$;
create or replace function public.redeem_course_access_coupon(p_org uuid,p_course uuid,p_token text) returns void language plpgsql security definer set search_path='' as $$
declare coupon private.course_access_coupons; begin
 perform private.require(private.org_role(p_org)='student','Active student membership required');
 -- Same lock order as grant/revoke, so removal cannot race with redemption.
 perform 1 from public.courses where id=p_course and "orgId"=p_org for update;
 perform private.require(exists(select 1 from public.courses where id=p_course and "orgId"=p_org and visibility='public' and pricing='paid'),'Paid public course required');
 select * into coupon from private.course_access_coupons where "orgId"=p_org and "courseId"=p_course and "studentId"=auth.uid() and "tokenHash"=encode(sha256(convert_to(lower(trim(p_token)),'UTF8')),'hex') for update;
 perform private.require(coupon.id is not null and not coupon.revoked and coupon."redeemedAt" is null and coupon."expiresAt">now(),'Coupon is invalid, expired, used, revoked, or belongs to another student');
 insert into public.enrollments("orgId","courseId","studentId") values(p_org,p_course,auth.uid()) on conflict("courseId","studentId") do update set source='direct';
 update private.course_access_coupons set "redeemedAt"=now() where id=coupon.id;
 insert into public.audit_events("orgId","actorId",action,"targetId") values(p_org,auth.uid(),'course-coupon.redeemed',p_course::text);
end $$;


create function public.learning_roster(p_org uuid,p_course uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require(private.can_course(p_org,p_course,true));
 return coalesce((select jsonb_agg(jsonb_build_object('id',m."userId",'name',m.name,'source',e.source,'items',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'completed',p.completed_at is not null,'unlocked',private.item_unlocked(i.id,m."userId"),'score',p.score,'feedback',p.feedback,'evaluated_at',p.evaluated_at)) from private.learning_items i left join private.learning_progress p on p."itemId"=i.id and p."studentId"=m."userId" where i."courseId"=p_course),'[]')) order by m.name) from public.enrollments e join public.memberships m on m."userId"=e."studentId" and m."orgId"=e."orgId" where e."orgId"=p_org and e."courseId"=p_course and m.active and m.role='student'),'[]');
end $$;
revoke all on function public.learning_roster(uuid,uuid) from public,anon;
grant execute on function public.learning_roster(uuid,uuid) to authenticated;

create index learning_items_course on private.learning_items("courseId");
alter table private.learning_progress add constraint finite_learning_score check(score is null or score<'Infinity'::numeric);
