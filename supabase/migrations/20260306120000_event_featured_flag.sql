alter table public.event
add column if not exists is_featured boolean not null default false;

create index if not exists event_is_featured_start_time_idx
on public.event (is_featured, start_time);
