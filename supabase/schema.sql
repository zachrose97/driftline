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

drop policy if exists "shops: public read" on shops;
create policy "shops: public read"
  on shops for select
  using (true);

drop policy if exists "shops: auth insert" on shops;
create policy "shops: auth insert"
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

drop policy if exists "shop_reports: public read" on shop_reports;
create policy "shop_reports: public read"
  on shop_reports for select
  using (true);

drop policy if exists "shop_reports: auth insert" on shop_reports;
create policy "shop_reports: auth insert"
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

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'stocking_unique'
  ) then
    alter table stocking_reports
      add constraint stocking_unique
      unique (river_name, stocked_date, species, state);
  end if;
end $$;

drop policy if exists "stocking_reports: public read" on stocking_reports;
create policy "stocking_reports: public read"
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

drop policy if exists "catches: owner read" on catches;
create policy "catches: owner read"
  on catches for select
  using (auth.uid() = user_id);

drop policy if exists "catches: owner insert" on catches;
create policy "catches: owner insert"
  on catches for insert
  with check (auth.uid() = user_id);

drop policy if exists "catches: owner delete" on catches;
create policy "catches: owner delete"
  on catches for delete
  using (auth.uid() = user_id);


-- ── access_points ────────────────────────────────────────────
create table if not exists access_points (
  id          bigserial primary key,
  state       text not null,
  name        text not null,
  lat         double precision not null,
  lng         double precision not null,
  water_name  text,
  county      text,
  access_type text,
  species     text,
  parking     text,
  fee         text,
  ada         text,
  notes       text,
  detail_url  text
);

alter table access_points enable row level security;

create unique index if not exists access_points_unique_loc
  on access_points (state, lat, lng);

drop policy if exists "access_points: public read" on access_points;
create policy "access_points: public read"
  on access_points for select
  using (true);

-- Service role key bypasses RLS for imports — no insert policy needed.


-- ── Supabase Storage ─────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('catch-photos', 'catch-photos', true)
on conflict (id) do nothing;

drop policy if exists "catch-photos: auth upload" on storage.objects;
create policy "catch-photos: auth upload"
  on storage.objects for insert
  with check (
    bucket_id = 'catch-photos'
    and auth.role() = 'authenticated'
  );

drop policy if exists "catch-photos: public read" on storage.objects;
create policy "catch-photos: public read"
  on storage.objects for select
  using (bucket_id = 'catch-photos');
