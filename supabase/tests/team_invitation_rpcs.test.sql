BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT extensions.plan(22);

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
  ('10000000-0000-0000-0000-000000000401', 'authenticated', 'authenticated', 'rpc-captain@example.test', crypt('password', gen_salt('bf')), now(), now(), now()),
  ('10000000-0000-0000-0000-000000000402', 'authenticated', 'authenticated', 'rpc-accept@example.test', crypt('password', gen_salt('bf')), now(), now(), now()),
  ('10000000-0000-0000-0000-000000000403', 'authenticated', 'authenticated', 'rpc-reject@example.test', crypt('password', gen_salt('bf')), now(), now(), now()),
  ('10000000-0000-0000-0000-000000000404', 'authenticated', 'authenticated', 'rpc-other-captain@example.test', crypt('password', gen_salt('bf')), now(), now(), now()),
  ('10000000-0000-0000-0000-000000000405', 'authenticated', 'authenticated', 'rpc-cancel@example.test', crypt('password', gen_salt('bf')), now(), now(), now()),
  ('10000000-0000-0000-0000-000000000406', 'authenticated', 'authenticated', 'rpc-expire@example.test', crypt('password', gen_salt('bf')), now(), now(), now());

INSERT INTO public.profile ("user", username, onboarding_step, is_profile_complete)
VALUES
  ('10000000-0000-0000-0000-000000000402', 'rpc_accept', 3, true),
  ('10000000-0000-0000-0000-000000000403', 'rpc_reject', 3, true),
  ('10000000-0000-0000-0000-000000000405', 'rpc_cancel', 3, true),
  ('10000000-0000-0000-0000-000000000406', 'rpc_expire', 3, true);

INSERT INTO public.team (name, slug, created_by_user_id)
VALUES
  ('Invitation RPC FC', 'invitation-rpc-fc', '10000000-0000-0000-0000-000000000401'),
  ('Other Captain FC', 'other-captain-fc', '10000000-0000-0000-0000-000000000404');

INSERT INTO public.team_member (team_id, user_id, role, status, joined_at)
SELECT id, '10000000-0000-0000-0000-000000000401', 'captain', 'active', now()
FROM public.team
WHERE slug = 'invitation-rpc-fc';

INSERT INTO public.team_member (team_id, user_id, role, status, joined_at)
SELECT id, '10000000-0000-0000-0000-000000000404', 'captain', 'active', now()
FROM public.team
WHERE slug = 'other-captain-fc';

INSERT INTO public.team_invitation (
  team_id,
  invited_by_user_id,
  invitee_user_id,
  invitee_email,
  delivery_method,
  source,
  created_at,
  expires_at
)
SELECT
  id,
  '10000000-0000-0000-0000-000000000401',
  '10000000-0000-0000-0000-000000000406',
  'rpc-expire@example.test',
  'email',
  'captain_search',
  now() - interval '15 days',
  now() - interval '1 day'
FROM public.team
WHERE slug = 'invitation-rpc-fc';

SELECT set_config(
  'test.expire_invitation_id',
  (
    SELECT id::TEXT
    FROM public.team_invitation
    WHERE invitee_user_id = '10000000-0000-0000-0000-000000000406'
  ),
  true
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000401', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

SELECT set_config(
  'test.accept_invitation_id',
  (
    SELECT id::TEXT
    FROM public.create_team_invitation(
      (SELECT id FROM public.team WHERE slug = 'invitation-rpc-fc'),
      'email',
      NULL,
      '  RPC-ACCEPT@EXAMPLE.TEST  '
    )
  ),
  true
);

SELECT set_config(
  'test.reject_invitation_id',
  (
    SELECT id::TEXT
    FROM public.create_team_invitation(
      (SELECT id FROM public.team WHERE slug = 'invitation-rpc-fc'),
      'email',
      NULL,
      'rpc-reject@example.test'
    )
  ),
  true
);

SELECT set_config(
  'test.cancel_invitation_id',
  (
    SELECT id::TEXT
    FROM public.create_team_invitation(
      (SELECT id FROM public.team WHERE slug = 'invitation-rpc-fc'),
      'email',
      NULL,
      'rpc-cancel@example.test'
    )
  ),
  true
);

SELECT extensions.is(
  (
    SELECT status
    FROM public.team_invitation
    WHERE id = current_setting('test.accept_invitation_id')::BIGINT
  ),
  'pending',
  'captain creates a pending invitation'
);

SELECT extensions.is(
  (
    SELECT source
    FROM public.team_invitation
    WHERE id = current_setting('test.accept_invitation_id')::BIGINT
  ),
  'captain_search',
  'nominated invitation records captain_search source'
);

SELECT extensions.is(
  (
    SELECT invitee_email
    FROM public.team_invitation
    WHERE id = current_setting('test.accept_invitation_id')::BIGINT
  ),
  'rpc-accept@example.test',
  'email lookup and storage are normalized'
);

SELECT extensions.ok(
  (
    SELECT expires_at BETWEEN created_at + interval '13 days 23 hours'
      AND created_at + interval '14 days 1 hour'
    FROM public.team_invitation
    WHERE id = current_setting('test.accept_invitation_id')::BIGINT
  ),
  'RPC creates a fourteen-day invitation'
);

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000402', true);

SELECT extensions.throws_ok(
  $$
    SELECT *
    FROM public.create_team_invitation(
      (SELECT id FROM public.team WHERE slug = 'invitation-rpc-fc'),
      'email',
      NULL,
      'rpc-cancel@example.test'
    )
  $$,
  '42501',
  NULL,
  'non-captain cannot create an invitation'
);

SELECT extensions.is(
  (SELECT count(*)::INTEGER FROM public.team_invitation),
  1,
  'invitee RLS exposes only her invitation'
);

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000403', true);

SELECT extensions.throws_ok(
  format(
    'SELECT * FROM public.respond_to_team_invitation(%s, %L)',
    current_setting('test.accept_invitation_id'),
    'accepted'
  ),
  'P0002',
  NULL,
  'another user cannot respond to an invitation'
);

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000402', true);

SELECT extensions.is(
  (
    SELECT status
    FROM public.respond_to_team_invitation(
      current_setting('test.accept_invitation_id')::BIGINT,
      'accepted'
    )
  ),
  'accepted',
  'invitee can accept a pending invitation'
);

SELECT extensions.is(
  (
    SELECT status
    FROM public.team_member
    WHERE team_id = (SELECT id FROM public.team WHERE slug = 'invitation-rpc-fc')
      AND user_id = '10000000-0000-0000-0000-000000000402'
  ),
  'active',
  'acceptance creates an active membership'
);

SELECT extensions.is(
  (
    SELECT role
    FROM public.team_member
    WHERE team_id = (SELECT id FROM public.team WHERE slug = 'invitation-rpc-fc')
      AND user_id = '10000000-0000-0000-0000-000000000402'
  ),
  'player',
  'accepted membership always has player role'
);

SELECT extensions.ok(
  (
    SELECT responded_at IS NOT NULL
    FROM public.team_invitation
    WHERE id = current_setting('test.accept_invitation_id')::BIGINT
  ),
  'acceptance records responded_at'
);

SELECT extensions.is(
  (
    SELECT status
    FROM public.respond_to_team_invitation(
      current_setting('test.accept_invitation_id')::BIGINT,
      'accepted'
    )
  ),
  'accepted',
  'accepting twice is idempotent'
);

SELECT extensions.is(
  (
    SELECT count(*)::INTEGER
    FROM public.team_member
    WHERE team_id = (SELECT id FROM public.team WHERE slug = 'invitation-rpc-fc')
      AND user_id = '10000000-0000-0000-0000-000000000402'
  ),
  1,
  'idempotent acceptance does not duplicate membership'
);

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000403', true);

SELECT extensions.is(
  (
    SELECT status
    FROM public.respond_to_team_invitation(
      current_setting('test.reject_invitation_id')::BIGINT,
      'rejected'
    )
  ),
  'rejected',
  'invitee can reject a pending invitation'
);

SELECT extensions.is(
  (
    SELECT count(*)::INTEGER
    FROM public.team_member
    WHERE team_id = (SELECT id FROM public.team WHERE slug = 'invitation-rpc-fc')
      AND user_id = '10000000-0000-0000-0000-000000000403'
  ),
  0,
  'rejection does not create membership'
);

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000404', true);

SELECT extensions.throws_ok(
  format(
    'SELECT * FROM public.cancel_team_invitation(%s)',
    current_setting('test.cancel_invitation_id')
  ),
  'P0002',
  NULL,
  'captain from another team cannot cancel an invitation'
);

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000401', true);

SELECT extensions.is(
  (
    SELECT status
    FROM public.cancel_team_invitation(
      current_setting('test.cancel_invitation_id')::BIGINT
    )
  ),
  'cancelled',
  'team captain can cancel a pending invitation'
);

SELECT extensions.is(
  (
    SELECT status
    FROM public.cancel_team_invitation(
      current_setting('test.cancel_invitation_id')::BIGINT
    )
  ),
  'cancelled',
  'cancelling twice is idempotent'
);

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000406', true);

SELECT extensions.is(
  (
    SELECT status
    FROM public.respond_to_team_invitation(
      current_setting('test.expire_invitation_id')::BIGINT,
      'accepted'
    )
  ),
  'expired',
  'response validates expiration in real time'
);

SELECT extensions.is(
  (
    SELECT count(*)::INTEGER
    FROM public.team_member
    WHERE team_id = (SELECT id FROM public.team WHERE slug = 'invitation-rpc-fc')
      AND user_id = '10000000-0000-0000-0000-000000000406'
  ),
  0,
  'expired invitation cannot create membership'
);

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000401', true);

SELECT extensions.is(
  (
    SELECT count(*)::INTEGER
    FROM public.team_invitation
    WHERE team_id = (SELECT id FROM public.team WHERE slug = 'invitation-rpc-fc')
  ),
  4,
  'captain RLS exposes every invitation from her team'
);

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000404', true);

SELECT extensions.is(
  (
    SELECT count(*)::INTEGER
    FROM public.team_invitation
    WHERE team_id = (SELECT id FROM public.team WHERE slug = 'invitation-rpc-fc')
  ),
  0,
  'captain cannot read invitations from another team'
);

SELECT * FROM extensions.finish();

ROLLBACK;
