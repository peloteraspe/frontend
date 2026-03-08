alter table public.event
add column if not exists google_wallet_class_id text;

create index if not exists event_google_wallet_class_id_idx
on public.event (google_wallet_class_id);
