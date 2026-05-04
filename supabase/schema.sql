-- ============================================================
-- DriftLine — complete Supabase schema
-- Run this in the Supabase SQL editor (safe to re-run)
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

create policy if not exists "shops: public read"
  on shops for select
  using (true);

create policy if not exists "shops: auth insert"
  on shops for insert
  with check (auth.role() = 'authenticated');


-- ── shop_reports ─────────────────────────────────────────────
create table if not exists shop_reports (
  id             uuid default gen_random_uuid() primary key,
  shop_name      text not null,
  river_name     text not null,
  report_text    text not null,
  water_temp     numeric,
  water_clarity  text,
  flies_working  text[],
  verified_shop  boolean not null default false,
  created_at     timestamptz not null default now()
);

alter table shop_reports enable row level security;

-- Add verified_shop column to existing tables (no-op if column already exists)
alter table shop_reports
  add column if not exists verified_shop boolean not null default false;

create policy if not exists "shop_reports: public read"
  on shop_reports for select
  using (true);

create policy if not exists "shop_reports: auth insert"
  on shop_reports for insert
  with check (auth.role() = 'authenticated');


-- ── stocking_reports ─────────────────────────────────────────
create table if not exists stocking_reports (
  id           uuid default gen_random_uuid() primary key,
  river_name   text not null,
  state        text not null,
  species      text not null,
  quantity     integer,
  stocked_date date not null,
  created_at   timestamptz not null default now()
);

alter table stocking_reports enable row level security;

alter table stocking_reports
  add constraint if not exists stocking_unique
  unique (river_name, stocked_date, species, state);

create policy if not exists "stocking_reports: public read"
  on stocking_reports for select
  using (true);

-- Service role key bypasses RLS for cron imports — no insert policy needed.


-- ── catches ──────────────────────────────────────────────────
create table if not exists catches (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  species        text not null,
  fly_used       text not null,
  length_inches  numeric,
  river_name     text not null,
  notes          text,
  lat            numeric,
  lng            numeric,
  photo_url      text,
  caught_at      timestamptz not null default now()
);

alter table catches enable row level security;

create policy if not exists "catches: owner read"
  on catches for select
  using (auth.uid() = user_id);

create policy if not exists "catches: owner insert"
  on catches for insert
  with check (auth.uid() = user_id);

create policy if not exists "catches: owner delete"
  on catches for delete
  using (auth.uid() = user_id);


-- ── Supabase Storage ─────────────────────────────────────────
-- Creates the catch-photos bucket (safe to re-run)
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
