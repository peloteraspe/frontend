alter table "public"."event"
  add column if not exists "is_published" boolean not null default true;

create index if not exists "event_is_published_start_time_idx"
  on "public"."event" using btree ("is_published", "start_time");
