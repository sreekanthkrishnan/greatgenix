-- All tenant writes go through checked transactional RPCs. Direct table writes are denied.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table if not exists public.organizations (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 80),
 slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 48),
 active boolean not null default true,
 features jsonb not null default '{"live":true,"recordings":true,"attendance":false,"assessments":false}',
 branding jsonb not null default '{"logoUrl":"","primaryColor":"#365840","accentColor":"#dce6bf","fontFamily":"humanist","fontSize":16,"theme":"light","tagline":"Room to grow."}',
 "createdAt" timestamptz not null default now()
);

create table if not exists public.platform_admins ("userId" uuid primary key references auth.users(id));

create table if not exists public.memberships (
 "orgId" uuid not null references public.organizations(id), "userId" uuid not null references auth.users(id),
 name text not null check(length(trim(name)) between 1 and 100), email text not null,
 role text not null check(role in ('student','teacher','teacher-admin')), active boolean not null default true,
 primary key("orgId","userId")
);

create table if not exists public.courses (
 id uuid primary key default gen_random_uuid(), "orgId" uuid not null references public.organizations(id),
 title text not null check(length(trim(title)) between 1 and 100), subject text not null, grade text not null,
 batch text not null, description text not null default '', color text not null default 'sage' check(color in ('sage','peach','lavender')),
 "teacherId" uuid not null, unique("orgId",id), foreign key("orgId","teacherId") references public.memberships("orgId","userId")
);

create table if not exists public.enrollments (
 "orgId" uuid not null, "courseId" uuid not null, "studentId" uuid not null,
 primary key("courseId","studentId"), foreign key("orgId","courseId") references public.courses("orgId",id), foreign key("orgId","studentId") references public.memberships("orgId","userId")
);

create table if not exists public.sessions (
 id uuid primary key default gen_random_uuid(), "orgId" uuid not null, "courseId" uuid not null,
 title text not null check(length(trim(title)) between 1 and 100), date date not null, time time not null,
 "startsAt" timestamptz not null, duration int not null check(duration between 15 and 180),
 "gmeetLink" text,
 unique("orgId",id), foreign key("orgId","courseId") references public.courses("orgId",id)
);

alter table public.sessions add column if not exists "gmeetLink" text;

create table if not exists public.lessons (
 id uuid primary key default gen_random_uuid(), "orgId" uuid not null, "courseId" uuid not null,
 title text not null check(length(trim(title)) between 1 and 100), duration int not null check(duration between 1 and 240),
 status text not null default 'draft' check(status in ('draft','review','published')), age text not null, subject text not null,
 "fileName" text, "mediaStatus" text not null default 'empty' check("mediaStatus" in ('empty','uploading','ready','errored')),
 unique("orgId",id), foreign key("orgId","courseId") references public.courses("orgId",id)
);

create table if not exists private.video_assets ("lessonId" uuid primary key references public.lessons(id), "uploadId" text unique, "assetId" text unique, "playbackId" text, "uploadUrl" text);

create table if not exists public.assignments (
 id uuid primary key default gen_random_uuid(), "orgId" uuid not null, "courseId" uuid not null,
 title text not null check(length(trim(title)) between 1 and 100), prompt text not null check(length(trim(prompt)) between 1 and 4000), due date not null,
 points int not null check(points between 1 and 1000), unique("orgId",id), foreign key("orgId","courseId") references public.courses("orgId",id)
);

create table if not exists public.submissions (
 id uuid primary key default gen_random_uuid(), "orgId" uuid not null, "assignmentId" uuid not null, "studentId" uuid not null,
 answer text not null check(length(trim(answer)) between 1 and 4000), score numeric, feedback text, published boolean not null default false,
 unique("assignmentId","studentId"), foreign key("orgId","assignmentId") references public.assignments("orgId",id), foreign key("orgId","studentId") references public.memberships("orgId","userId")
);

create table if not exists public.attendance (
 "orgId" uuid not null, "sessionId" uuid not null, "studentId" uuid not null, status text not null check(status in ('present','late','absent')),
 primary key("sessionId","studentId"), foreign key("orgId","sessionId") references public.sessions("orgId",id), foreign key("orgId","studentId") references public.memberships("orgId","userId")
);

create table if not exists public.completions (
 "orgId" uuid not null, "lessonId" uuid not null, "studentId" uuid not null,
 primary key("lessonId","studentId"), foreign key("orgId","lessonId") references public.lessons("orgId",id), foreign key("orgId","studentId") references public.memberships("orgId","userId")
);

create table if not exists public.reports (
 id uuid primary key default gen_random_uuid(), "orgId" uuid not null, "lessonId" uuid not null, "studentId" uuid not null,
 reason text not null check(length(trim(reason)) between 1 and 1000), "createdAt" timestamptz not null default now(),
 foreign key("orgId","lessonId") references public.lessons("orgId",id), foreign key("orgId","studentId") references public.memberships("orgId","userId")
);

create table if not exists public.invitations (
 id uuid primary key default gen_random_uuid(), "orgId" uuid not null references public.organizations(id), email text not null, name text not null,
 role text not null check(role in ('student','teacher','teacher-admin')), "courseId" uuid, "tokenHash" text not null unique,
 "expiresAt" timestamptz not null default now()+interval '7 days', "acceptedAt" timestamptz, revoked boolean not null default false,
 foreign key("orgId","courseId") references public.courses("orgId",id)
);

create table if not exists public.audit_events (
 id bigint generated always as identity primary key, "orgId" uuid references public.organizations(id), "actorId" uuid references auth.users(id),
 action text not null, "targetId" text, "createdAt" timestamptz not null default now()
);

create table if not exists private.webhook_events (id text primary key, "createdAt" timestamptz not null default now());

create or replace function private.is_platform() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.platform_admins where "userId"=auth.uid()) $$;
create or replace function private.org_role(o uuid) returns text language sql stable security definer set search_path='' as $$ select m.role from public.memberships m join public.organizations g on g.id=m."orgId" where m."orgId"=o and m."userId"=auth.uid() and m.active and g.active $$;
create or replace function private.is_admin(o uuid) returns boolean language sql stable security definer set search_path='' as $$ select coalesce(private.org_role(o)='teacher-admin',false) $$;
create or replace function private.feature(o uuid,f text) returns boolean language sql stable security definer set search_path='' as $$ select coalesce((select active and (features->>f)::boolean from public.organizations where id=o),false) $$;
create or replace function private.can_course(o uuid,c uuid, teaching boolean default false) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(private.org_role(o) is not null and exists(select 1 from public.courses x where x.id=c and x."orgId"=o and (
 private.is_admin(o) or (private.org_role(o)='teacher' and x."teacherId"=auth.uid()) or (not teaching and private.org_role(o)='student' and exists(select 1 from public.enrollments e where e."orgId"=o and e."courseId"=c and e."studentId"=auth.uid())))),false)
$$;
create or replace function private.can_member(o uuid,u uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.org_role(o) is not null and (u=auth.uid() or private.is_admin(o) or (private.org_role(o)='teacher' and exists(select 1 from public.enrollments e join public.courses c on c.id=e."courseId" and c."orgId"=e."orgId" where e."orgId"=o and e."studentId"=u and c."teacherId"=auth.uid())))
$$;

-- RLS prevents leaked data even through direct REST requests; no client role grants writes.
do $$ declare t text; begin foreach t in array array['organizations','platform_admins','memberships','courses','enrollments','sessions','lessons','assignments','submissions','attendance','completions','reports','invitations','audit_events'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
end loop; end $$;

drop policy if exists org_read on public.organizations;
create policy org_read on public.organizations for select to authenticated using (private.org_role(id) is not null or private.is_platform());

drop policy if exists platform_self on public.platform_admins;
create policy platform_self on public.platform_admins for select to authenticated using ("userId"=auth.uid());

drop policy if exists member_read on public.memberships;
create policy member_read on public.memberships for select to authenticated using (private.can_member("orgId","userId"));

drop policy if exists course_read on public.courses;
create policy course_read on public.courses for select to authenticated using (private.can_course("orgId",id));

drop policy if exists enrollment_read on public.enrollments;
create policy enrollment_read on public.enrollments for select to authenticated using (private.can_course("orgId","courseId") and ("studentId"=auth.uid() or private.can_course("orgId","courseId",true)));

drop policy if exists session_read on public.sessions;
create policy session_read on public.sessions for select to authenticated using (private.feature("orgId",'live') and private.can_course("orgId","courseId"));

drop policy if exists lesson_read on public.lessons;
create policy lesson_read on public.lessons for select to authenticated using (private.feature("orgId",'recordings') and private.can_course("orgId","courseId") and (status='published' or private.can_course("orgId","courseId",true)));

drop policy if exists assignment_read on public.assignments;
create policy assignment_read on public.assignments for select to authenticated using (private.feature("orgId",'assessments') and private.can_course("orgId","courseId"));

drop policy if exists submission_read on public.submissions;
create policy submission_read on public.submissions for select to authenticated using (exists(select 1 from public.assignments a where a.id="assignmentId" and a."orgId"=submissions."orgId" and ("studentId"=auth.uid() or private.can_course(a."orgId",a."courseId",true))));

drop policy if exists attendance_read on public.attendance;
create policy attendance_read on public.attendance for select to authenticated using (private.feature("orgId",'attendance') and exists(select 1 from public.sessions s where s.id="sessionId" and s."orgId"=attendance."orgId" and ("studentId"=auth.uid() or private.can_course(s."orgId",s."courseId",true))));

drop policy if exists completion_read on public.completions;
create policy completion_read on public.completions for select to authenticated using (exists(select 1 from public.lessons l where l.id="lessonId" and l."orgId"=completions."orgId" and ("studentId"=auth.uid() or private.can_course(l."orgId",l."courseId",true))));

drop policy if exists report_read on public.reports;
create policy report_read on public.reports for select to authenticated using (private.is_admin("orgId") or (private.org_role("orgId") is not null and "studentId"=auth.uid()));

drop policy if exists invitation_read on public.invitations;
create policy invitation_read on public.invitations for select to authenticated using (private.is_admin("orgId"));

revoke select on public.invitations from authenticated;
grant select(id,"orgId",email,name,role,"courseId","expiresAt","acceptedAt",revoked) on public.invitations to authenticated;

drop policy if exists audit_read on public.audit_events;
create policy audit_read on public.audit_events for select to authenticated using (private.is_admin("orgId") or private.is_platform());

create index if not exists memberships_user on public.memberships("userId","orgId");
create index if not exists courses_org on public.courses("orgId");
create index if not exists enrollments_student on public.enrollments("orgId","studentId");
create index if not exists lessons_course on public.lessons("orgId","courseId");
create index if not exists sessions_course on public.sessions("orgId","courseId");
create index if not exists submissions_org on public.submissions("orgId","studentId");

create or replace function public.my_access() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('platform',private.is_platform(),'orgs',coalesce((select jsonb_agg(to_jsonb(o)) from public.organizations o where private.is_platform() or exists(select 1 from public.memberships m where m."orgId"=o.id and m."userId"=auth.uid() and m.active)),'[]'::jsonb),'memberships',coalesce((select jsonb_agg(jsonb_build_object('orgId',m."orgId",'role',m.role)) from public.memberships m where m."userId"=auth.uid() and m.active),'[]'::jsonb))
$$;

create or replace function public.create_organization(p_name text,p_slug text) returns uuid language plpgsql security definer set search_path='' as $$
declare o uuid; u auth.users; begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 select * into u from auth.users where id=auth.uid();
 if u.email_confirmed_at is null then raise exception 'Confirm your email first'; end if;
 insert into public.organizations(name,slug) values(trim(p_name),lower(trim(p_slug))) returning id into o;
 insert into public.memberships("orgId","userId",name,email,role) values(o,u.id,left(coalesce(nullif(u.raw_user_meta_data->>'name',''),split_part(u.email,'@',1)),100),u.email,'teacher-admin');
 insert into public.audit_events("orgId","actorId",action) values(o,u.id,'organization.created'); return o;
end $$;

create or replace function public.create_invitation(p_org uuid,p_email text,p_name text,p_role text,p_course uuid default null) returns text language plpgsql security definer set search_path='' as $$
declare token text; begin
 if not private.is_admin(p_org) then raise exception 'Organization administrator required'; end if;
 if p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(trim(p_name)) not between 1 and 100 then raise exception 'Enter a valid name and email'; end if;
 if p_course is not null and (p_role <> 'student' or not private.can_course(p_org,p_course,true)) then raise exception 'Invalid course invitation'; end if;
 token := replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 insert into public.invitations("orgId",email,name,role,"courseId","tokenHash") values(p_org,lower(trim(p_email)),trim(p_name),p_role,p_course,encode(sha256(convert_to(token,'UTF8')),'hex'));
 insert into public.audit_events("orgId","actorId",action) values(p_org,auth.uid(),'invitation.created'); return token;
end $$;

create or replace function public.accept_invitation(p_token text) returns void language plpgsql security definer set search_path='' as $$
declare i public.invitations; u auth.users; begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 select * into i from public.invitations where "tokenHash"=encode(sha256(convert_to(p_token,'UTF8')),'hex') for update;
 select * into u from auth.users where id=auth.uid();
 if i.id is null or i.revoked or i."acceptedAt" is not null or i."expiresAt"<=now() or lower(u.email)<>i.email or u.email_confirmed_at is null or not exists(select 1 from public.organizations where id=i."orgId" and active) then raise exception 'Invitation is expired, used, revoked, or for another email'; end if;
 if exists(select 1 from public.memberships where "orgId"=i."orgId" and "userId"=u.id) then raise exception 'Membership already exists. Ask an administrator to update it.'; end if;
 insert into public.memberships("orgId","userId",name,email,role) values(i."orgId",u.id,i.name,u.email,i.role);
 if i."courseId" is not null then insert into public.enrollments("orgId","courseId","studentId") values(i."orgId",i."courseId",u.id); end if;
 update public.invitations set "acceptedAt"=now() where id=i.id;
 insert into public.audit_events("orgId","actorId",action,"targetId") values(i."orgId",u.id,'invitation.accepted',i.id::text);
end $$;

create or replace function public.revoke_invitation(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare o uuid; begin select "orgId" into o from public.invitations where id=p_id;
 if not private.is_admin(o) then raise exception 'Organization administrator required'; end if;
 update public.invitations set revoked=true where id=p_id;
 insert into public.audit_events("orgId","actorId",action,"targetId") values(o,auth.uid(),'invitation.revoked',p_id::text);
end $$;
