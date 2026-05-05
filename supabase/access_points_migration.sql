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
