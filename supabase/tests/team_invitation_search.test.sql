BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT extensions.plan(10);

INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES
  ('10000000-0000-0000-0000-000000000501', 'authenticated', 'authenticated', 'search-captain@example.test', crypt('password', gen_salt('bf')), now(), '{}'::JSONB, now(), now()),
  ('10000000-0000-0000-0000-000000000502', 'authenticated', 'authenticated', 'search-available@example.test', crypt('password', gen_salt('bf')), now(), '{"full_name":"Jugadora Disponible"}'::JSONB, now(), now()),
  ('10000000-0000-0000-0000-000000000503', 'authenticated', 'authenticated', 'search-member@example.test', crypt('password', gen_salt('bf')), now(), '{}'::JSONB, now(), now()),
  ('10000000-0000-0000-0000-000000000504', 'authenticated', 'authenticated', 'search-pending@example.test', crypt('password', gen_salt('bf')), now(), '{}'::JSONB, now(), now()),
  ('10000000-0000-0000-0000-000000000505', 'authenticated', 'authenticated', 'search-regular@example.test', crypt('password', gen_salt('bf')), now(), '{}'::JSONB, now(), now()),
  ('10000000-0000-0000-0000-000000000506', 'authenticated', 'authenticated', 'search-other-captain@example.test', crypt('password', gen_salt('bf')), now(), '{}'::JSONB, now(), now());

INSERT INTO public.profile ("user", username, onboarding_step, is_profile_complete)
VALUES
  ('10000000-0000-0000-0000-000000000502', 'search_available', 3, true),
  ('10000000-0000-0000-0000-000000000503', 'search_member', 3, true),
  ('10000000-0000-0000-0000-000000000504', 'search_pending', 3, true),
  ('10000000-0000-0000-0000-000000000505', 'search_regular', 3, true);

WITH created_users AS (
  INSERT INTO auth.users (
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  SELECT
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'bulk-search-' || series || '@example.test',
    crypt('password', gen_salt('bf')),
    now(),
    '{}'::JSONB,
    now(),
    now()
  FROM generate_series(1, 12) AS series
  RETURNING id, email
)
INSERT INTO public.profile ("user", username, onboarding_step, is_profile_complete)
SELECT
  id,
  'bulkplayer' || regexp_replace(email, '[^0-9]', '', 'g'),
  3,
  true
FROM created_users;

INSERT INTO public.team (name, slug, created_by_user_id)
VALUES
  ('Search Candidates FC', 'search-candidates-fc', '10000000-0000-0000-0000-000000000501'),
  ('Search Other FC', 'search-other-fc', '10000000-0000-0000-0000-000000000506');

INSERT INTO public.team_member (team_id, user_id, role, status, joined_at)
SELECT id, '10000000-0000-0000-0000-000000000501', 'captain', 'active', now()
FROM public.team
WHERE slug = 'search-candidates-fc';

INSERT INTO public.team_member (team_id, user_id, role, status, joined_at)
SELECT id, '10000000-0000-0000-0000-000000000506', 'captain', 'active', now()
FROM public.team
WHERE slug = 'search-other-fc';

INSERT INTO public.team_member (team_id, user_id, role, status, joined_at)
SELECT id, '10000000-0000-0000-0000-000000000503', 'player', 'active', now()
FROM public.team
WHERE slug = 'search-candidates-fc';

INSERT INTO public.team_invitation (
  team_id,
  invited_by_user_id,
  invitee_user_id,
  invitee_email,
  delivery_method,
  source
)
SELECT
  id,
  '10000000-0000-0000-0000-000000000501',
  '10000000-0000-0000-0000-000000000504',
  'search-pending@example.test',
  'email',
  'captain_search'
FROM public.team
WHERE slug = 'search-candidates-fc';

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000501', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

SELECT extensions.is(
  (
    SELECT username
    FROM public.search_team_invitation_candidates(
      (SELECT id FROM public.team WHERE slug = 'search-candidates-fc'),
      '@search_available'
    )
  ),
  'search_available',
  'username search accepts an at-sign'
);

SELECT extensions.is(
  (
    SELECT username
    FROM public.search_team_invitation_candidates(
      (SELECT id FROM public.team WHERE slug = 'search-candidates-fc'),
      'available'
    )
  ),
  'search_available',
  'username search accepts a partial value without at-sign'
);

SELECT extensions.is(
  (
    SELECT username
    FROM public.search_team_invitation_candidates(
      (SELECT id FROM public.team WHERE slug = 'search-candidates-fc'),
      'SEARCH-AVAILABLE@EXAMPLE.TEST'
    )
  ),
  'search_available',
  'email search is exact and case-insensitive'
);

SELECT extensions.is(
  (
    SELECT team_status
    FROM public.search_team_invitation_candidates(
      (SELECT id FROM public.team WHERE slug = 'search-candidates-fc'),
      'search_available'
    )
  ),
  'available',
  'candidate without membership or invitation is available'
);

SELECT extensions.is(
  (
    SELECT team_status
    FROM public.search_team_invitation_candidates(
      (SELECT id FROM public.team WHERE slug = 'search-candidates-fc'),
      'search_member'
    )
  ),
  'member',
  'active team member is marked as non-invitable'
);

SELECT extensions.is(
  (
    SELECT team_status
    FROM public.search_team_invitation_candidates(
      (SELECT id FROM public.team WHERE slug = 'search-candidates-fc'),
      'search_pending'
    )
  ),
  'pending',
  'candidate with pending invitation is marked pending'
);

SELECT extensions.ok(
  (
    SELECT NOT (to_jsonb(candidate) ? 'email')
    FROM public.search_team_invitation_candidates(
      (SELECT id FROM public.team WHERE slug = 'search-candidates-fc'),
      'search-available@example.test'
    ) AS candidate
  ),
  'search result does not expose an email field'
);

SELECT extensions.is(
  (
    SELECT count(*)::INTEGER
    FROM public.search_team_invitation_candidates(
      (SELECT id FROM public.team WHERE slug = 'search-candidates-fc'),
      'bulkplayer',
      100
    )
  ),
  10,
  'backend enforces a maximum of ten results'
);

SELECT extensions.is(
  (
    SELECT count(*)::INTEGER
    FROM public.search_team_invitation_candidates(
      (SELECT id FROM public.team WHERE slug = 'search-candidates-fc'),
      'a'
    )
  ),
  0,
  'short username searches return no results'
);

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000505', true);

SELECT extensions.throws_ok(
  $$
    SELECT *
    FROM public.search_team_invitation_candidates(
      (SELECT id FROM public.team WHERE slug = 'search-candidates-fc'),
      'search_available'
    )
  $$,
  '42501',
  NULL,
  'regular authenticated user cannot search team candidates'
);

SELECT * FROM extensions.finish();

ROLLBACK;
