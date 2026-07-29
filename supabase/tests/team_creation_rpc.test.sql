BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT extensions.plan(12);

INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
VALUES (
  '10000000-0000-0000-0000-000000000201',
  'authenticated',
  'authenticated',
  'team-rpc@example.test',
  crypt('password', gen_salt('bf')),
  now(),
  now(),
  now()
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000201', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

CREATE TEMP TABLE rpc_first_team AS
SELECT id, slug
FROM public.create_team_with_captain(
  'Fútbol & Amigas',
  NULL,
  'futbolamigas',
  'futbolamigas',
  'rpc-test-key-001'
);

SELECT extensions.is(
  (SELECT count(*)::INT FROM rpc_first_team),
  1,
  'create_team_with_captain returns one team'
);

SELECT extensions.is(
  (SELECT slug FROM rpc_first_team),
  'futbol-amigas',
  'normalizes accents and symbols in the slug'
);

SELECT extensions.is(
  (
    SELECT role
    FROM public.team_member
    WHERE team_id = (SELECT id FROM rpc_first_team)
      AND user_id = '10000000-0000-0000-0000-000000000201'
  ),
  'captain',
  'creator membership is captain'
);

SELECT extensions.is(
  (
    SELECT status
    FROM public.team_member
    WHERE team_id = (SELECT id FROM rpc_first_team)
      AND user_id = '10000000-0000-0000-0000-000000000201'
  ),
  'active',
  'creator membership is active'
);

CREATE TEMP TABLE rpc_retry_team AS
SELECT id, slug
FROM public.create_team_with_captain(
  'Fútbol & Amigas',
  NULL,
  'futbolamigas',
  'futbolamigas',
  'rpc-test-key-001'
);

SELECT extensions.is(
  (SELECT id FROM rpc_retry_team),
  (SELECT id FROM rpc_first_team),
  'same idempotency key returns the same team'
);

-- created_by_user_id is intentionally not exposed to authenticated clients.
-- Inspect it as the test owner, then restore the client role for the RPC checks.
RESET ROLE;

SELECT extensions.is(
  (
    SELECT count(id)::INT
    FROM public.team
    WHERE created_by_user_id = '10000000-0000-0000-0000-000000000201'
      AND name = 'Fútbol & Amigas'
  ),
  1,
  'idempotent retry does not create a duplicate team'
);

SET LOCAL ROLE authenticated;

CREATE TEMP TABLE rpc_collision_team AS
SELECT id, slug
FROM public.create_team_with_captain(
  'Fútbol & Amigas',
  NULL,
  NULL,
  NULL,
  'rpc-test-key-002'
);

SELECT extensions.is(
  (SELECT slug FROM rpc_collision_team),
  'futbol-amigas-2',
  'slug collision receives a suffix'
);

CREATE TEMP TABLE rpc_reserved_team AS
SELECT id, slug
FROM public.create_team_with_captain(
  'Profile',
  NULL,
  NULL,
  NULL,
  'rpc-test-key-003'
);

SELECT extensions.is(
  (SELECT slug FROM rpc_reserved_team),
  'profile-2',
  'reserved route receives a suffix'
);

SELECT extensions.throws_ok(
  $$
    SELECT id
    FROM public.create_team_with_captain('Las', NULL, NULL, NULL, 'bad key')
  $$,
  '23514',
  NULL,
  'rejects invalid idempotency keys'
);

SELECT extensions.throws_ok(
  $$
    SELECT id
    FROM public.create_team_with_captain('A', NULL, NULL, NULL, 'rpc-test-key-004')
  $$,
  '23514',
  NULL,
  'rejects invalid names through RPC'
);

SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', '', true);

SELECT extensions.throws_ok(
  $$
    SELECT id
    FROM public.create_team_with_captain('No Session', NULL, NULL, NULL, 'rpc-test-key-005')
  $$,
  '28000',
  NULL,
  'rejects creation without auth.uid'
);

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000201', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

SELECT extensions.throws_ok(
  $$
    INSERT INTO public.team (name, slug, created_by_user_id)
    VALUES ('Direct Insert', 'direct-insert', '10000000-0000-0000-0000-000000000201')
  $$,
  '42501',
  NULL,
  'authenticated role cannot insert teams directly'
);

SELECT * FROM extensions.finish();

ROLLBACK;
