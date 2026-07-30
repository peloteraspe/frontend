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
  created_at,
  updated_at
)
VALUES (
  '10000000-0000-0000-0000-000000000701',
  'authenticated',
  'authenticated',
  'external-invite-captain@example.test',
  crypt('password', gen_salt('bf')),
  now(),
  now(),
  now()
);

INSERT INTO public.team (name, slug, created_by_user_id)
VALUES (
  'External Email FC',
  'external-email-fc',
  '10000000-0000-0000-0000-000000000701'
);

INSERT INTO public.team_member (team_id, user_id, role, status, joined_at)
SELECT id, '10000000-0000-0000-0000-000000000701', 'captain', 'active', now()
FROM public.team
WHERE slug = 'external-email-fc';

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000701', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

SELECT set_config(
  'test.external_invitation_id',
  (
    SELECT id::TEXT
    FROM public.create_team_invitation(
      (SELECT id FROM public.team WHERE slug = 'external-email-fc'),
      'email',
      NULL,
      '  NEW-PLAYER@EXAMPLE.TEST  '
    )
  ),
  true
);

SELECT set_config(
  'test.external_invitation_token',
  (
    SELECT invitation_token::TEXT
    FROM public.team_invitation
    WHERE id = current_setting('test.external_invitation_id')::BIGINT
  ),
  true
);

SELECT extensions.is(
  (
    SELECT invitee_user_id
    FROM public.team_invitation
    WHERE id = current_setting('test.external_invitation_id')::BIGINT
  ),
  NULL::UUID,
  'an invitation can be created before the email has an account'
);

SELECT extensions.is(
  (
    SELECT invitee_email
    FROM public.team_invitation
    WHERE id = current_setting('test.external_invitation_id')::BIGINT
  ),
  'new-player@example.test',
  'the external email is normalized'
);

SELECT extensions.is(
  (
    SELECT email_delivery_status
    FROM public.team_invitation
    WHERE id = current_setting('test.external_invitation_id')::BIGINT
  ),
  'pending',
  'the external invitation is ready for email delivery'
);

RESET ROLE;

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
VALUES
  (
    '10000000-0000-0000-0000-000000000702',
    'authenticated',
    'authenticated',
    'wrong-player@example.test',
    crypt('password', gen_salt('bf')),
    now(),
    now(),
    now()
  ),
  (
    '10000000-0000-0000-0000-000000000703',
    'authenticated',
    'authenticated',
    'new-player@example.test',
    crypt('password', gen_salt('bf')),
    now(),
    now(),
    now()
  );

INSERT INTO public.profile ("user", username, onboarding_step, is_profile_complete)
VALUES ('10000000-0000-0000-0000-000000000703', 'new_player', 3, true);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000702', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

SELECT extensions.throws_ok(
  format(
    'SELECT * FROM public.claim_team_invitation_by_token(%L::UUID)',
    current_setting('test.external_invitation_token')
  ),
  'P0002',
  NULL,
  'a different account cannot claim the private invitation token'
);

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000703', true);

SELECT extensions.is(
  (
    SELECT invitee_user_id
    FROM public.claim_team_invitation_by_token(
      current_setting('test.external_invitation_token')::UUID
    )
  ),
  '10000000-0000-0000-0000-000000000703'::UUID,
  'the account with the invited email can claim it'
);

SELECT extensions.is(
  (
    SELECT invitee_username
    FROM public.team_invitation
    WHERE id = current_setting('test.external_invitation_id')::BIGINT
  ),
  'new_player',
  'claiming attaches the new profile username'
);

SELECT extensions.is(
  (
    SELECT invitee_user_id
    FROM public.claim_team_invitation_by_token(
      current_setting('test.external_invitation_token')::UUID
    )
  ),
  '10000000-0000-0000-0000-000000000703'::UUID,
  'claiming the same invitation twice is idempotent'
);

SELECT extensions.is(
  (
    SELECT status
    FROM public.respond_to_team_invitation(
      current_setting('test.external_invitation_id')::BIGINT,
      'accepted'
    )
  ),
  'accepted',
  'the new account can accept the claimed invitation'
);

SELECT extensions.is(
  (
    SELECT status
    FROM public.team_member
    WHERE team_id = (SELECT id FROM public.team WHERE slug = 'external-email-fc')
      AND user_id = '10000000-0000-0000-0000-000000000703'
  ),
  'active',
  'accepting creates the active membership'
);

SELECT extensions.is(
  (
    SELECT role
    FROM public.team_member
    WHERE team_id = (SELECT id FROM public.team WHERE slug = 'external-email-fc')
      AND user_id = '10000000-0000-0000-0000-000000000703'
  ),
  'player',
  'the claimed membership has player role'
);

SELECT * FROM extensions.finish();

ROLLBACK;
