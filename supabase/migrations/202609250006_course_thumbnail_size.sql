-- Allow course thumbnails up to 2 MB, accounting for base64 encoding overhead.
alter table public.courses drop constraint course_thumbnail_valid;
alter table public.courses add constraint course_thumbnail_valid check (
 "thumbnailUrl" is null or (
  length("thumbnailUrl") <= 2666691 and
  case when "thumbnailUrl" ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$'
   then octet_length(decode(split_part("thumbnailUrl", ',', 2), 'base64')) <= 2000000
   else false
  end
 )
);
