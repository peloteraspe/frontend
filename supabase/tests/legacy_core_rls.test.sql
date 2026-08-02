BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT set_config('codex.tap_results', extensions.plan(28), true);

INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES
  ('10000000-0000-0000-0000-000000000801', 'authenticated', 'authenticated', 'rls-incomplete@example.test', crypt('password', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('10000000-0000-0000-0000-000000000802', 'authenticated', 'authenticated', 'rls-complete@example.test', crypt('password', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('10000000-0000-0000-0000-000000000803', 'authenticated', 'authenticated', 'rls-other@example.test', crypt('password', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('10000000-0000-0000-0000-000000000804', 'authenticated', 'authenticated', 'rls-owner@example.test', crypt('password', gen_salt('bf')), now(), '{"role":"admin","is_admin":true}'::jsonb, '{}'::jsonb, now(), now());

INSERT INTO public.level (id, name)
VALUES (-801, 'Nivel RLS test');

INSERT INTO public.player_position (id, name)
VALUES (-801, 'Posición RLS test');

INSERT INTO public.profile (id, "user", username, level_id, onboarding_step, is_profile_complete)
VALUES
  (-801, '10000000-0000-0000-0000-000000000801', 'rls_incomplete', -801, 1, false),
  (-802, '10000000-0000-0000-0000-000000000802', 'rls_complete', -801, 2, true),
  (-803, '10000000-0000-0000-0000-000000000803', 'rls_other', -801, 1, false),
  (-804, '10000000-0000-0000-0000-000000000804', 'rls_owner', -801, 2, true);

INSERT INTO public.event (id, title, created_by_id, is_published)
VALUES
  (-801, 'Evento RLS publicado', '10000000-0000-0000-0000-000000000804', true),
  (-802, 'Evento RLS borrador', '10000000-0000-0000-0000-000000000804', false);

INSERT INTO public."paymentMethod" (id, name, "QR", number, type, is_active, created_by, updated_by)
VALUES (-801, 'Método RLS', 'https://example.test/qr.png', 999888777, 'yape', true,
  '10000000-0000-0000-0000-000000000804', '10000000-0000-0000-0000-000000000804');

INSERT INTO public."eventPaymentMethod" (id, event, "paymentMethod")
VALUES (-801, -801, -801);

INSERT INTO public.assistants (id, event, "user", "operationNumber", state)
VALUES
  (-801, -801, '10000000-0000-0000-0000-000000000802', 801001, 'approved'),
  (-802, -801, '10000000-0000-0000-0000-000000000801', 801002, 'pending'),
  (-803, -801, '10000000-0000-0000-0000-000000000803', 801003, 'approved');

INSERT INTO public.ticket (
  id,
  assistant_id,
  event_id,
  user_id,
  status,
  qr_token
)
VALUES (
  -803,
  -803,
  -801,
  '10000000-0000-0000-0000-000000000803',
  'active',
  'rls-other-ticket-token'
);

RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"anon","email":"","app_metadata":{},"user_metadata":{}}',
  true
);
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', 'anon', true);

SELECT set_config(
  'codex.tap_results',
  current_setting('codex.tap_results') || E'\n' || extensions.is(
  (SELECT count(*)::integer FROM public.event WHERE id = -801),
  1,
  'anon can read a published event'
),
  true
);

SELECT set_config(
  'codex.tap_results',
  current_setting('codex.tap_results') || E'\n' || extensions.is(
  (SELECT count(*)::integer FROM public.event WHERE id = -802),
  0,
  'anon cannot read a draft event'
),
  true
);

SELECT set_config(
  'codex.tap_results',
  current_setting('codex.tap_results') || E'\n' || extensions.is(
  (SELECT count(*)::integer FROM public.profile WHERE username = 'rls_complete'),
  1,
  'anon can read a completed public profile'
),
  true
);

SELECT set_config(
  'codex.tap_results',
  current_setting('codex.tap_results') || E'\n' || extensions.is(
  (SELECT count(*)::integer FROM public.profile WHERE username = 'rls_incomplete'),
  0,
  'anon cannot read an incomplete profile'
),
  true
);

SELECT set_config(
  'codex.tap_results',
  current_setting('codex.tap_results') || E'\n' || extensions.throws_ok(
  $$ SELECT id FROM public."paymentMethod" WHERE id = -801 $$,
  '42501',
  NULL,
  'anon cannot read payment details'
),
  true
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000801","role":"authenticated","email":"rls-incomplete@example.test","app_metadata":{},"user_metadata":{}}',
  true
);
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000801', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

SELECT set_config(
  'codex.tap_results',
  current_setting('codex.tap_results') || E'\n' || extensions.is(
  (SELECT count(*)::integer FROM public.player_position WHERE id = -801),
  1,
  'an incomplete authenticated user can read onboarding catalogs'
),
  true
);

SELECT set_config(
  'codex.tap_results',
  current_setting('codex.tap_results') || E'\n' || extensions.is(
  (SELECT count(*)::integer FROM public.profile WHERE id = -801),
  1,
  'an incomplete authenticated user can read her own profile'
),
  true
);

SELECT set_config(
  'codex.tap_results',
  current_setting('codex.tap_results') || E'\n' || extensions.is(
  (SELECT count(*)::integer FROM public.profile WHERE id = -803),
  0,
  'an incomplete authenticated user cannot read another incomplete profile'
),
  true
);

SELECT set_config(
  'codex.tap_results',
  current_setting('codex.tap_results') || E'\n' || extensions.throws_ok(
  $$
    INSERT INTO public.profile ("user", username, onboarding_step, is_profile_complete)
    VALUES ('10000000-0000-0000-0000-000000000803', 'rls_forbidden_profile', 1, false)
  $$,
  '42501',
  NULL,
  'an authenticated user cannot create a profile for another auth user'
),
  true
);

SELECT set_config(
  'codex.tap_results',
  current_setting('codex.tap_results') || E'\n' || extensions.lives_ok(
  $$ UPDATE public.profile SET username = 'rls_incomplete_updated' WHERE id = -801 $$,
  'an incomplete authenticated user can update her own onboarding profile'
),
  true
);

SELECT set_config(
  'codex.tap_results',
  current_setting('codex.tap_results') || E'\n' || extensions.is(
  (SELECT count(*)::integer FROM public."paymentMethod" WHERE id = -801),
  0,
  'an incomplete authenticated user cannot read event payment details'
),
  true
);

SELECT set_config(
  'codex.tap_results',
  current_setting('codex.tap_results') || E'\n' || extensions.is(
  (SELECT count(*)::integer FROM public.assistants WHERE id = -801),
  0,
  'an authenticated user cannot read another user registration'
),
  true
);

SELECT set_config(
  'codex.tap_results',
  current_setting('codex.tap_results') || E'\n' || extensions.throws_ok(
  $$ SELECT id FROM public.coupon LIMIT 1 $$,
  '42501',
  NULL,
  'authenticated users cannot access coupons directly'
),
  true
);

SELECT set_config(
  'codex.tap_results',
  current_setting('codex.tap_results') || E'\n' || extensions.lives_ok(
  $$ INSERT INTO public.profile_position (profile_id, position_id) VALUES (-801, -801) $$,
  'an authenticated user can add a position to her own profile'
),
  true
);

SELECT set_config(
  'codex.tap_results',
  current_setting('codex.tap_results') || E'\n' || extensions.throws_ok(
  $$ INSERT INTO public.profile_position (profile_id, position_id) VALUES (-803, -801) $$,
  '42501',
  NULL,
  'an authenticated user cannot alter another profile positions'
),
  true
);

SELECT set_config(
  'codex.tap_results',
  current_setting('codex.tap_results') || E'\n' || extensions.throws_ok(
  $$
    INSERT INTO public.ticket (
      assistant_id, event_id, user_id, status, qr_token
    ) VALUES (
      -802, -801, '10000000-0000-0000-0000-000000000801', 'active', 'rls-invalid-active-token'
    )
  $$,
  '42501',
  NULL,
  'a pending registration cannot create an active ticket'
),
  true
);

SELECT set_config(
  'codex.tap_results',
  current_setting('codex.tap_results') || E'\n' || extensions.lives_ok(
  $$
    INSERT INTO public.ticket (
      assistant_id, event_id, user_id, status, qr_token
    ) VALUES (
      -802, -801, '10000000-0000-0000-0000-000000000801', 'pending', 'rls-valid-pending-token'
    )
  $$,
  'a user can sync a pending ticket backed by her own registration'
),
  true
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000802","role":"authenticated","email":"rls-complete@example.test","app_metadata":{},"user_metadata":{}}',
  true
);
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000802', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

SELECT set_config(
  'codex.tap_results',
  current_setting('codex.tap_results') || E'\n' || extensions.is(
  (SELECT count(*)::integer FROM public."paymentMethod" WHERE id = -801),
  1,
  'a completed user can read an active payment method for a published event'
),
  true
);

SELECT set_config(
  'codex.tap_results',
  current_setting('codex.tap_results') || E'\n' || extensions.is(
  (SELECT count(*)::integer FROM public.assistants WHERE id = -801),
  1,
  'a completed user can read her own registration'
),
  true
);

SELECT set_config(
  'codex.tap_results',
  current_setting('codex.tap_results') || E'\n' || extensions.is(
  (SELECT count(*)::integer FROM public.ticket WHERE id = -803),
  0,
  'a user cannot read another user QR ticket'
),
  true
);

SELECT set_config(
  'codex.tap_results',
  current_setting('codex.tap_results') || E'\n' || extensions.lives_ok(
  $$
    INSERT INTO public.ticket (
      assistant_id, event_id, user_id, status, qr_token
    ) VALUES (
      -801, -801, '10000000-0000-0000-0000-000000000802', 'active', 'rls-valid-active-token'
    )
  $$,
  'an approved registration can create its own active ticket'
),
  true
);

SELECT set_config(
  'codex.tap_results',
  current_setting('codex.tap_results') || E'\n' || extensions.is(
  (SELECT count(*)::integer FROM public.ticket WHERE qr_token = 'rls-valid-active-token'),
  1,
  'a ticket holder can read her own QR ticket'
),
  true
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000804","role":"authenticated","email":"rls-owner@example.test","app_metadata":{"role":"admin","is_admin":true},"user_metadata":{}}',
  true
);
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000804', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

SELECT set_config(
  'codex.tap_results',
  current_setting('codex.tap_results') || E'\n' || extensions.is(
  (SELECT count(*)::integer FROM public.event WHERE id = -802),
  1,
  'an event owner can read her own draft'
),
  true
);

SELECT set_config(
  'codex.tap_results',
  current_setting('codex.tap_results') || E'\n' || extensions.is(
  (SELECT count(*)::integer FROM public.assistants WHERE event = -801),
  3,
  'an event owner can read registrations for her event'
),
  true
);

SELECT set_config(
  'codex.tap_results',
  current_setting('codex.tap_results') || E'\n' || extensions.lives_ok(
  $$ UPDATE public.assistants SET state = 'rejected' WHERE id = -802 $$,
  'an event owner can update the payment state for her event'
),
  true
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000803","role":"authenticated","email":"rls-other@example.test","app_metadata":{},"user_metadata":{"role":"superadmin","is_admin":true}}',
  true
);
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000803', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

SELECT set_config(
  'codex.tap_results',
  current_setting('codex.tap_results') || E'\n' || extensions.is(
  (SELECT count(*)::integer FROM public.event WHERE id = -802),
  0,
  'forged user_metadata does not grant superadmin access'
),
  true
);

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000803","role":"authenticated","email":"rls-other@example.test","app_metadata":{"role":"superadmin"},"user_metadata":{}}',
  true
);

SELECT set_config(
  'codex.tap_results',
  current_setting('codex.tap_results') || E'\n' || extensions.is(
  (SELECT count(*)::integer FROM public.event WHERE id = -802),
  1,
  'trusted app_metadata can grant superadmin access'
),
  true
);

SELECT set_config(
  'codex.tap_results',
  current_setting('codex.tap_results') || E'\n' || extensions.throws_ok(
  $$ SELECT id FROM public.event_checkin_registration LIMIT 1 $$,
  '42501',
  NULL,
  'authenticated users cannot read check-in PII directly'
),
  true
);

SELECT set_config(
  'codex.tap_results',
  current_setting('codex.tap_results') || COALESCE(
    (
      SELECT E'\n' || string_agg(result, E'\n')
      FROM extensions.finish() AS finished(result)
    ),
    ''
  ),
  true
);

SELECT result
FROM regexp_split_to_table(
  current_setting('codex.tap_results'),
  E'\n'
) AS lines(result);

ROLLBACK;
