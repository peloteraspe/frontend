BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT extensions.plan(8);

INSERT INTO auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
)
VALUES (
  '10000000-0000-0000-0000-000000000901',
  'authenticated',
  'authenticated',
  'versus-captain@example.test',
  crypt('password', gen_salt('bf')),
  now(),
  now(),
  now()
);

INSERT INTO public.team (id, name, slug, created_by_user_id)
VALUES
  (-901, 'Versus Team One', 'versus-team-one', '10000000-0000-0000-0000-000000000901'),
  (-902, 'Versus Team Two', 'versus-team-two', '10000000-0000-0000-0000-000000000901'),
  (-903, 'Versus Team Three', 'versus-team-three', '10000000-0000-0000-0000-000000000901'),
  (-904, 'Versus Team Four', 'versus-team-four', '10000000-0000-0000-0000-000000000901');

INSERT INTO public.event (
  id, title, start_time, end_time, min_users, max_users, price, is_published,
  registration_mode, allows_team_registration, team_registration_max_teams,
  team_registration_min_players, team_registration_max_players
)
VALUES
  (
    -901, 'Versus protegido', now() + interval '2 days', now() + interval '2 days 2 hours',
    4, 30, 10, true, 'team', true, 3, 2, 10
  ),
  (
    -902, 'Evento individual existente', now() + interval '3 days', now() + interval '3 days 2 hours',
    2, 20, 10, true, 'individual', false, null, null, null
  );

SELECT extensions.is(
  (SELECT registration_mode FROM public.event WHERE id = -901),
  'team',
  'Versus persists as a team-only event'
);

INSERT INTO public.team_event_registration (
  id, event_id, team_id, registered_by_user_id, operation_number,
  unit_price, participant_count, total_amount, state
)
VALUES
  (-901, -901, -901, '10000000-0000-0000-0000-000000000901', '90100001', 10, 2, 20, 'pending'),
  (-902, -901, -902, '10000000-0000-0000-0000-000000000901', '90200002', 10, 2, 20, 'approved'),
  (-903, -901, -903, '10000000-0000-0000-0000-000000000901', '90300003', 10, 2, 20, 'pending');

SELECT extensions.is(
  (
    SELECT count(*)::integer
    FROM public.team_event_registration
    WHERE event_id = -901 AND state IN ('pending', 'approved')
  ),
  3,
  'the configured active team slots can be reserved'
);

SELECT extensions.throws_ok(
  $$
    INSERT INTO public.team_event_registration (
      id, event_id, team_id, registered_by_user_id, operation_number,
      unit_price, participant_count, total_amount, state
    )
    VALUES (
      -904, -901, -904, '10000000-0000-0000-0000-000000000901',
      '90400004', 10, 2, 20, 'pending'
    )
  $$,
  'P0001',
  NULL,
  'a team beyond the configured limit cannot reserve the Versus'
);

SELECT extensions.throws_ok(
  $$
    INSERT INTO public.assistants (event, "user", "operationNumber", state)
    VALUES (-901, '10000000-0000-0000-0000-000000000901', 90100001, 'pending')
  $$,
  'P0001',
  NULL,
  'an individual registration cannot enter a team-only event'
);

UPDATE public.team_event_registration
SET state = 'cancelled'
WHERE id = -901;

INSERT INTO public.team_event_registration (
  id, event_id, team_id, registered_by_user_id, operation_number,
  unit_price, participant_count, total_amount, state
)
VALUES (
  -904, -901, -904, '10000000-0000-0000-0000-000000000901',
  '90400004', 10, 2, 20, 'pending'
);

SELECT extensions.is(
  (
    SELECT count(*)::integer
    FROM public.team_event_registration
    WHERE event_id = -901 AND state IN ('pending', 'approved')
  ),
  3,
  'cancelling a team releases its slot for another team'
);

SELECT extensions.throws_ok(
  $$
    UPDATE public.event
    SET team_registration_max_teams = 2
    WHERE id = -901
  $$,
  'P0001',
  NULL,
  'the configured capacity cannot be lowered below active team registrations'
);

INSERT INTO public.assistants (
  event, "user", "operationNumber", state, team_event_registration_id, team_id
)
VALUES (
  -901, '10000000-0000-0000-0000-000000000901', 90400004,
  'pending', -904, -904
);

SELECT extensions.is(
  (
    SELECT count(*)::integer
    FROM public.assistants
    WHERE event = -901 AND team_event_registration_id = -904
  ),
  1,
  'a registration linked to a participating team is accepted'
);

INSERT INTO public.assistants (event, "user", "operationNumber", state)
VALUES (-902, '10000000-0000-0000-0000-000000000901', 90200002, 'pending');

SELECT extensions.throws_ok(
  $$
    UPDATE public.event
    SET registration_mode = 'team', allows_team_registration = true
    WHERE id = -902
  $$,
  'P0001',
  NULL,
  'an event with active individual registrations cannot be converted to Versus'
);

SELECT * FROM extensions.finish();
ROLLBACK;
