-- Intended age is no longer collected. Preserve historical values and compatibility
-- with older clients while allowing current lesson payloads to omit this field.
alter table public.lessons alter column age drop not null;
