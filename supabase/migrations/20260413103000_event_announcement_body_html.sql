alter table "public"."event_announcement"
  add column if not exists "body_html" text;
