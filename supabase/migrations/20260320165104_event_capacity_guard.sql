create or replace function public.enforce_event_capacity_on_assistants()
returns trigger
language plpgsql
as $$
declare
  event_max_users integer;
  approved_count integer;
  normalized_state text;
begin
  normalized_state := lower(coalesce(new.state, ''));

  if normalized_state not in ('pending', 'approved') then
    return new;
  end if;

  if new.event is null then
    return new;
  end if;

  select e.max_users
  into event_max_users
  from public.event e
  where e.id = new.event;

  if coalesce(event_max_users, 0) <= 0 then
    return new;
  end if;

  select count(*)
  into approved_count
  from public.assistants a
  where a.event = new.event
    and lower(coalesce(a.state, '')) = 'approved'
    and (tg_op <> 'UPDATE' or a.id <> new.id);

  if approved_count >= event_max_users then
    raise exception 'EVENT_SOLD_OUT';
  end if;

  return new;
end;
$$;

drop trigger if exists assistants_enforce_event_capacity on public.assistants;

create trigger assistants_enforce_event_capacity
before insert or update of state, event, "operationNumber"
on public.assistants
for each row
execute function public.enforce_event_capacity_on_assistants();
