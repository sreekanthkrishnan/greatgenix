-- Migration 0005: Add gmeetLink column to existing sessions table if missing
alter table public.sessions add column if not exists "gmeetLink" text;
