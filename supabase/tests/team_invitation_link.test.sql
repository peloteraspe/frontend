BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT extensions.plan(15);

INSERT INTO auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
)
VALUES
  ('10000000-0000-0000-0000-000000000601', 'authenticated', 'authenticated', 'link-captain@example.test', crypt('password', gen_salt('bf')), now(), now(), now()),
  ('10000000-0000-0000-0000-000000000602', 'authenticated', 'authenticated', 'link-viewer-one@example.test', crypt('password', gen_salt('bf')), now(), now(), now()),
  ('10000000-0000-0000-0000-000000000603', 'authenticated', 'authenticated', 'link-viewer-two@example.test', crypt('password', gen_salt('bf')), now(), now(), now()),
  ('10000000-0000-0000-0000-000000000604', 'authenticated', 'authenticated', 'link-member@example.test', crypt('password', gen_salt('bf')), now(), now(), now()),
  ('10000000-0000-0000-0000-000000000605', 'authenticated', 'authenticated', 'link-regular@example.test', crypt('password', gen_salt('bf')), now(), now(), now());

INSERT INTO public.profile ("user", username, onboarding_step, is_profile_complete)
VALUES
  ('10000000-0000-0000-0000-000000000602', 'link_viewer_one', 3, true),
  ('10000000-0000-0000-0000-000000000603', 'link_viewer_two', 3, true),
  ('10000000-0000-0000-0000-000000000604', 'link_member', 3, true),
  ('10000000-0000-0000-0000-000000000605', 'link_regular', 3, true);

INSERT INTO public.team (name, slug, created_by_user_id)
VALUES ('General Link FC', 'general-link-fc', '10000000-0000-0000-0000-000000000601');

INSERT INTO public.team_member (team_id, user_id, role, status, joined_at)
SELECT id, '10000000-0000-0000-0000-000000000601', 'captain', 'active', now()
FROM public.team
WHERE slug = 'general-link-fc';

INSERT INTO public.team_member (team_id, user_id, role, status, joined_at)
SELECT id, '10000000-0000-0000-0000-000000000604', 'player', 'active', now()
FROM public.team
WHERE slug = 'general-link-fc';

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000601', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

SELECT set_config(
  'test.general_link_token',
  public.get_team_general_invitation_token(
    (SELECT id FROM public.team WHERE slug = 'general-link-fc')
  )::TEXT,
  true
);

SELECT extensions.ok(
  current_setting('test.general_link_token')::UUID IS NOT NULL,
  'active captain can obtain the general invitation token'
);

SELECT extensions.throws_ok(
  $$ SELECT invitation_token FROM public.team WHERE slug = 'general-link-fc' $$,
  '42501',
  NULL,
  'authenticated clients cannot select the protected token column directly'
);

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000605', true);

SELECT extensions.throws_ok(
  format(
    'SELECT public.get_team_general_invitation_token(%s)',
    (SELECT id FROM public.team WHERE slug = 'general-link-fc')
  ),
  'P0002',
  NULL,
  'regular member cannot obtain a team invitation token'
);

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', 'anon', true);

SELECT extensions.is(
  (
    SELECT count(*)::INTEGER
    FROM public.get_team_invitation_link_preview(
      current_setting('test.general_link_token')::UUID
    )
  ),
  1,
  'anonymous viewer can validate a link using public team fields only'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000602', true);

SELECT set_config(
  'test.viewer_one_invitation_id',
  (
    SELECT id::TEXT
    FROM public.resolve_team_link_invitation(
      current_setting('test.general_link_token')::UUID
    )
  ),
  true
);

SELECT extensions.is(
  (
    SELECT status
    FROM public.team_invitation
    WHERE id = current_setting('test.viewer_one_invitation_id')::BIGINT
  ),
  'pending',
  'authenticated viewer receives a pending invitation'
);

SELECT extensions.is(
  (
    SELECT source
    FROM public.team_invitation
    WHERE id = current_setting('test.viewer_one_invitation_id')::BIGINT
  ),
  'team_link',
  'general link invitation records team_link source'
);

SELECT extensions.is(
  (
    SELECT id
    FROM public.resolve_team_link_invitation(
      current_setting('test.general_link_token')::UUID
    )
  ),
  current_setting('test.viewer_one_invitation_id')::BIGINT,
  'refreshing the link reuses the same invitation'
);

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000603', true);

SELECT extensions.is(
  (
    SELECT status
    FROM public.resolve_team_link_invitation(
      current_setting('test.general_link_token')::UUID
    )
  ),
  'pending',
  'a second viewer can use the same general link'
);

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000602', true);

SELECT extensions.is(
  (
    SELECT status
    FROM public.respond_to_team_invitation(
      current_setting('test.viewer_one_invitation_id')::BIGINT,
      'rejected'
    )
  ),
  'rejected',
  'viewer can reject an invitation created from the link'
);

SELECT extensions.is(
  (
    SELECT status
    FROM public.resolve_team_link_invitation(
      current_setting('test.general_link_token')::UUID
    )
  ),
  'rejected',
  'refresh does not reopen a rejected link invitation'
);

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000604', true);

SELECT extensions.throws_ok(
  format(
    'SELECT * FROM public.resolve_team_link_invitation(%L::UUID)',
    current_setting('test.general_link_token')
  ),
  'P0001',
  NULL,
  'active member cannot create another membership invitation'
);

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000601', true);

SELECT set_config(
  'test.new_general_link_token',
  public.regenerate_team_general_invitation_token(
    (SELECT id FROM public.team WHERE slug = 'general-link-fc')
  )::TEXT,
  true
);

SELECT extensions.isnt(
  current_setting('test.new_general_link_token'),
  current_setting('test.general_link_token'),
  'regeneration creates a different token'
);

SELECT extensions.is(
  (
    SELECT count(*)::INTEGER
    FROM public.get_team_invitation_link_preview(
      current_setting('test.general_link_token')::UUID
    )
  ),
  0,
  'previous token is invalid immediately after regeneration'
);

SELECT extensions.is(
  (
    SELECT count(*)::INTEGER
    FROM public.get_team_invitation_link_preview(
      current_setting('test.new_general_link_token')::UUID
    )
  ),
  1,
  'new token works immediately'
);

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000605', true);

SELECT extensions.throws_ok(
  format(
    'SELECT public.regenerate_team_general_invitation_token(%s)',
    (SELECT id FROM public.team WHERE slug = 'general-link-fc')
  ),
  'P0002',
  NULL,
  'non-captain cannot regenerate the invitation token'
);

SELECT * FROM extensions.finish();

ROLLBACK;
