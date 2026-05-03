-- ============================================================
-- DriftLine — Supabase schema setup
-- Run these in order in the Supabase SQL editor
-- ============================================================

-- ── shops ────────────────────────────────────────────────────
create table if not exists shops (
  id            uuid default gen_random_uuid() primary key,
  shop_name     text not null,
  website       text,
  address       text,
  state         text not null,
  contact_email text not null,
  description   text,
  verified      boolean not null default false,
  created_at    timestamptz not null default now()
);

alter table shops enable row level security;

-- Anyone can read shops (needed for verified badge lookups)
create policy "shops: public read"
  on shops for select
  using (true);

-- Authenticated users can insert their own application
create policy "shops: auth insert"
  on shops for insert
  with check (auth.role() = 'authenticated');

-- Only service role (your admin) can update/delete
-- (manage verified status from Supabase dashboard or service key)


-- ── stocking_reports ─────────────────────────────────────────
-- Add unique constraint so the weekly import can upsert safely
alter table stocking_reports
  add constraint if not exists stocking_unique
  unique (river_name, stocked_date, species, state);

-- Allow public read
create policy if not exists "stocking_reports: public read"
  on stocking_reports for select
  using (true);

-- Allow service role to upsert (used by /api/import-stocking)
-- Service key bypasses RLS automatically — no extra policy needed.


-- ── catches ──────────────────────────────────────────────────
alter table catches enable row level security;

-- Users can only see their own catches
create policy if not exists "catches: owner read"
  on catches for select
  using (auth.uid() = user_id);

-- Users can only insert their own catches
create policy if not exists "catches: owner insert"
  on catches for insert
  with check (auth.uid() = user_id);

-- Users can delete their own catches
create policy if not exists "catches: owner delete"
  on catches for delete
  using (auth.uid() = user_id);


-- ── shop_reports ─────────────────────────────────────────────
-- Already has RLS — add a verified_shop column to track which
-- reports were posted by verified shops.
alter table shop_reports
  add column if not exists verified_shop boolean not null default false;

-- Public can read all reports
create policy if not exists "shop_reports: public read"
  on shop_reports for select
  using (true);

-- Anyone can insert (UX-level verified check happens in the client)
-- For stricter enforcement, replace with an authenticated-only policy:
-- create policy "shop_reports: auth insert"
--   on shop_reports for insert
--   with check (auth.role() = 'authenticated');


-- ── Supabase Storage ─────────────────────────────────────────
-- Create a "catch-photos" bucket in the Supabase dashboard:
--   Storage → New bucket → Name: catch-photos → Public: ON
--
-- Then run this to allow authenticated users to upload:
insert into storage.buckets (id, name, public)
values ('catch-photos', 'catch-photos', true)
on conflict (id) do nothing;

create policy if not exists "catch-photos: auth upload"
  on storage.objects for insert
  with check (
    bucket_id = 'catch-photos'
    and auth.role() = 'authenticated'
  );

create policy if not exists "catch-photos: public read"
  on storage.objects for select
  using (bucket_id = 'catch-photos');
