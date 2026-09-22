create function public.media_access(p_id uuid,p_operation text) returns jsonb language plpgsql security definer set search_path='' as $$
declare l public.lessons;s public.sessions;v private.video_assets;begin
 perform private.require(auth.uid() is not null);
 if p_operation in ('upload','playback') then
  select * into l from public.lessons where id=p_id;
  perform private.require(l.id is not null and private.feature(l."orgId",'recordings') and private.can_course(l."orgId",l."courseId"));
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
-- Service-only callbacks. These cannot be invoked by browser JWTs.
create function public.media_upload_saved(p_lesson uuid,p_upload text,p_url text) returns void language plpgsql security definer set search_path='' as $$ begin
 insert into private.video_assets("lessonId","uploadId","uploadUrl") values(p_lesson,p_upload,p_url) on conflict("lessonId") do update set "uploadId"=excluded."uploadId","uploadUrl"=excluded."uploadUrl";
 update public.lessons set "mediaStatus"='uploading' where id=p_lesson and "mediaStatus"<>'ready';
end $$;
create function public.media_webhook_apply(p_event text,p_type text,p_data jsonb) returns void language plpgsql security definer set search_path='' as $$
declare l uuid; playback text;begin
 insert into private.webhook_events(id) values(p_event) on conflict do nothing;if not found then return;end if;
 if p_type='video.upload.asset_created' then
  update private.video_assets set "assetId"=p_data->>'asset_id' where "uploadId"=p_data->>'id';
  if not found then raise exception 'Upload mapping not ready'; end if;
 elsif p_type in ('video.asset.ready','video.asset.errored') then
  select "lessonId" into l from private.video_assets where "assetId"=p_data->>'id' or "uploadId"=p_data->>'upload_id' for update;
  -- Roll back receipt so a retry can resolve out-of-order upload authorization / asset events.
  if l is null then raise exception 'Upload mapping not ready';end if;
  if p_type='video.asset.ready' then
   select x->>'id' into playback from jsonb_array_elements(p_data->'playback_ids') x where x->>'policy'='signed' limit 1;
   perform private.require(playback is not null,'Signed playback ID required');
   update private.video_assets set "assetId"=p_data->>'id',"playbackId"=playback where "lessonId"=l;
   update public.lessons set "mediaStatus"='ready' where id=l;
  else update public.lessons set "mediaStatus"='errored',status='draft' where id=l;end if;
 end if;
end $$;
revoke all on function public.media_access(uuid,text),public.media_upload_saved(uuid,text,text),public.media_webhook_apply(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.media_access(uuid,text) to authenticated;
grant execute on function public.media_upload_saved(uuid,text,text),public.media_webhook_apply(text,text,jsonb) to service_role;
