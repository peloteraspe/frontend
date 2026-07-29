BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT extensions.plan(16);

SELECT extensions.has_table(
  'public',
  'team_invitation',
  'team_invitation table exists'
);
SELECT extensions.has_column(
  'public',
  'team_invitation',
  'source',
  'invitation source is stored'
);
SELECT extensions.has_column(
  'public',
  'team_invitation',
  'email_sent_at',
  'email sent timestamp is stored'
);
SELECT extensions.has_column(
  'public',
  'team_invitation',
  'email_delivery_status',
  'email delivery status is stored'
);
SELECT extensions.has_column(
  'public',
  'team_invitation',
  'provider_message_id',
  'email provider message id is stored'
);

SELECT extensions.ok(
  EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'team_invitation'
      AND indexname = 'team_invitation_invitation_token_unique_idx'
      AND indexdef ILIKE 'CREATE UNIQUE INDEX%'
  ),
  'invitation token has its own unique index'
);

SELECT extensions.ok(
  EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'team'
      AND indexname = 'team_general_invitation_token_unique_idx'
      AND indexdef ILIKE 'CREATE UNIQUE INDEX%'
  ),
  'team general invitation token keeps a unique index'
);

SELECT extensions.ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'team_invitation_pending_link_unique_idx'
  ),
  'team-link invitations are not globally unique per team'
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
VALUES
  (
    '10000000-0000-0000-0000-000000000301',
    'authenticated',
    'authenticated',
    'invitation-captain@example.test',
    crypt('password', gen_salt('bf')),
    now(),
    now(),
    now()
  ),
  (
    '10000000-0000-0000-0000-000000000302',
    'authenticated',
    'authenticated',
    'INVITATION-PLAYER@EXAMPLE.TEST',
    crypt('password', gen_salt('bf')),
    now(),
    now(),
    now()
  ),
  (
    '10000000-0000-0000-0000-000000000303',
    'authenticated',
    'authenticated',
    'invitation-member@example.test',
    crypt('password', gen_salt('bf')),
    now(),
    now(),
    now()
  );

INSERT INTO public.team (name, slug, created_by_user_id)
VALUES (
  'Invitation Constraints FC',
  'invitation-constraints-fc',
  '10000000-0000-0000-0000-000000000301'
);

INSERT INTO public.team_member (team_id, user_id, role, status, joined_at)
SELECT id, '10000000-0000-0000-0000-000000000301', 'captain', 'active', now()
FROM public.team
WHERE slug = 'invitation-constraints-fc';

INSERT INTO public.team_member (team_id, user_id, role, status, joined_at)
SELECT id, '10000000-0000-0000-0000-000000000303', 'player', 'active', now()
FROM public.team
WHERE slug = 'invitation-constraints-fc';

INSERT INTO public.team_invitation (
  team_id,
  invited_by_user_id,
  invitee_user_id,
  invitee_email,
  invitee_username,
  delivery_method,
  source
)
SELECT
  id,
  '10000000-0000-0000-0000-000000000301',
  '10000000-0000-0000-0000-000000000302',
  '  INVITATION-PLAYER@EXAMPLE.TEST  ',
  '  Player_302  ',
  'email',
  'captain_search'
FROM public.team
WHERE slug = 'invitation-constraints-fc';

SELECT extensions.is(
  (
    SELECT invitee_email
    FROM public.team_invitation
    WHERE invitee_user_id = '10000000-0000-0000-0000-000000000302'
  ),
  'invitation-player@example.test',
  'email is normalized before storage'
);

SELECT extensions.is(
  (
    SELECT invitee_username
    FROM public.team_invitation
    WHERE invitee_user_id = '10000000-0000-0000-0000-000000000302'
  ),
  'player_302',
  'username is normalized before storage'
);

SELECT extensions.ok(
  (
    SELECT expires_at BETWEEN created_at + interval '13 days 23 hours'
      AND created_at + interval '14 days 1 hour'
    FROM public.team_invitation
    WHERE invitee_user_id = '10000000-0000-0000-0000-000000000302'
  ),
  'new invitations expire after fourteen days by default'
);

SELECT extensions.is(
  (
    SELECT email_delivery_status
    FROM public.team_invitation
    WHERE invitee_user_id = '10000000-0000-0000-0000-000000000302'
  ),
  'pending',
  'nominated email starts pending delivery'
);

SELECT extensions.throws_ok(
  $$
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
      '10000000-0000-0000-0000-000000000301',
      '10000000-0000-0000-0000-000000000302',
      'invitation-player@example.test',
      'email',
      'captain_search'
    FROM public.team
    WHERE slug = 'invitation-constraints-fc'
  $$,
  '23505',
  NULL,
  'duplicate pending invitations are rejected'
);

SELECT extensions.throws_ok(
  $$
    INSERT INTO public.team_invitation (
      team_id,
      invited_by_user_id,
      invitee_user_id,
      delivery_method,
      source
    )
    SELECT
      id,
      '10000000-0000-0000-0000-000000000301',
      '10000000-0000-0000-0000-000000000303',
      'username',
      'captain_search'
    FROM public.team
    WHERE slug = 'invitation-constraints-fc'
  $$,
  '23514',
  NULL,
  'active members cannot receive pending invitations'
);

SELECT extensions.throws_ok(
  $$
    INSERT INTO public.team_invitation (
      team_id,
      invited_by_user_id,
      invitee_user_id,
      delivery_method,
      source
    )
    SELECT
      id,
      '10000000-0000-0000-0000-000000000301',
      '10000000-0000-0000-0000-000000000302',
      'username',
      'unknown_source'
    FROM public.team
    WHERE slug = 'invitation-constraints-fc'
  $$,
  '23514',
  NULL,
  'unknown invitation sources are rejected'
);

UPDATE public.team_invitation
SET status = 'rejected'
WHERE invitee_user_id = '10000000-0000-0000-0000-000000000302';

SELECT extensions.throws_ok(
  $$
    UPDATE public.team_invitation
    SET status = 'pending'
    WHERE invitee_user_id = '10000000-0000-0000-0000-000000000302'
  $$,
  '23514',
  NULL,
  'terminal invitations cannot be reused'
);

SELECT * FROM extensions.finish();

ROLLBACK;
