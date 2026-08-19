BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT extensions.plan(12);

SELECT extensions.has_table('public', 'team', 'team table exists');
SELECT extensions.has_table('public', 'team_member', 'team_member table exists');
SELECT extensions.has_table(
  'public',
  'team_creation_request',
  'team_creation_request table exists'
);

SELECT extensions.col_not_null('public', 'team', 'name', 'team name is required');
SELECT extensions.col_not_null('public', 'team', 'slug', 'team slug is required');
SELECT extensions.col_not_null(
  'public',
  'team',
  'invitation_token',
  'team invitation token is generated'
);

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
  '10000000-0000-0000-0000-000000000101',
  'authenticated',
  'authenticated',
  'team-constraints@example.test',
  crypt('password', gen_salt('bf')),
  now(),
  now(),
  now()
);

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
  '10000000-0000-0000-0000-000000000102',
  'authenticated',
  'authenticated',
  'team-constraints-alt@example.test',
  crypt('password', gen_salt('bf')),
  now(),
  now(),
  now()
);

SELECT extensions.throws_ok(
  $$
    INSERT INTO public.team (name, slug, created_by_user_id)
    VALUES ('A', 'a', '10000000-0000-0000-0000-000000000101')
  $$,
  '23514',
  NULL,
  'rejects names shorter than 2 chars'
);

SELECT extensions.throws_ok(
  $$
    INSERT INTO public.team (name, slug, created_by_user_id)
    VALUES ('Invalid Slug Team', 'Invalid Slug', '10000000-0000-0000-0000-000000000101')
  $$,
  '23514',
  NULL,
  'rejects slugs with spaces and uppercase characters'
);

SELECT extensions.throws_ok(
  $$
    INSERT INTO public.team (name, slug, created_by_user_id)
    VALUES ('Reserved Route', 'profile', '10000000-0000-0000-0000-000000000101')
  $$,
  '23514',
  NULL,
  'rejects reserved first-level routes'
);

INSERT INTO public.team (name, slug, created_by_user_id)
VALUES ('Las Panteras', 'las-panteras', '10000000-0000-0000-0000-000000000101');

SELECT extensions.throws_ok(
  $$
    INSERT INTO public.team (name, slug, created_by_user_id)
    VALUES ('Las Panteras Copy', 'las-panteras', '10000000-0000-0000-0000-000000000101')
  $$,
  '23505',
  NULL,
  'rejects duplicate slugs'
);

INSERT INTO public.team_member (
  team_id,
  user_id,
  role,
  status,
  joined_at
)
SELECT
  id,
  '10000000-0000-0000-0000-000000000101',
  'captain',
  'active',
  now()
FROM public.team
WHERE slug = 'las-panteras';

SELECT extensions.throws_ok(
  $$
    INSERT INTO public.team_member (team_id, user_id, role, status, joined_at)
    SELECT id, '10000000-0000-0000-0000-000000000101', 'player', 'active', now()
    FROM public.team
    WHERE slug = 'las-panteras'
  $$,
  '23505',
  NULL,
  'rejects duplicate membership per team'
);

SELECT extensions.throws_ok(
  $$
    INSERT INTO public.team_member (team_id, user_id, role, status, joined_at)
    SELECT id, '10000000-0000-0000-0000-000000000102', 'captain', 'active', now()
    FROM public.team
    WHERE slug = 'las-panteras'
  $$,
  '23505',
  NULL,
  'rejects a second active captain'
);

SELECT * FROM extensions.finish();

ROLLBACK;
