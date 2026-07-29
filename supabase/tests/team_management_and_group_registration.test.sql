BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT extensions.plan(30);

INSERT INTO auth.users (id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
VALUES
  ('10000000-0000-0000-0000-000000000701','authenticated','authenticated','group-captain@example.test',crypt('password',gen_salt('bf')),now(),now(),now()),
  ('10000000-0000-0000-0000-000000000702','authenticated','authenticated','group-player-one@example.test',crypt('password',gen_salt('bf')),now(),now(),now()),
  ('10000000-0000-0000-0000-000000000703','authenticated','authenticated','group-player-two@example.test',crypt('password',gen_salt('bf')),now(),now(),now()),
  ('10000000-0000-0000-0000-000000000704','authenticated','authenticated','group-reviewer@example.test',crypt('password',gen_salt('bf')),now(),now(),now());

INSERT INTO public.profile ("user",username,onboarding_step,is_profile_complete)
VALUES
  ('10000000-0000-0000-0000-000000000701','group_captain',3,true),
  ('10000000-0000-0000-0000-000000000702','group_player_one',3,true),
  ('10000000-0000-0000-0000-000000000703','group_player_two',3,true);

INSERT INTO public.team (name,slug,created_by_user_id)
VALUES ('Group Registration FC','group-registration-fc','10000000-0000-0000-0000-000000000701');

UPDATE public.team SET max_members = 3 WHERE slug = 'group-registration-fc';

INSERT INTO public.team_member (team_id,user_id,role,status,joined_at)
SELECT id,'10000000-0000-0000-0000-000000000701','captain','active',now()
FROM public.team WHERE slug = 'group-registration-fc';
INSERT INTO public.team_member (team_id,user_id,role,status,joined_at)
SELECT id,'10000000-0000-0000-0000-000000000702','player','active',now()
FROM public.team WHERE slug = 'group-registration-fc';
INSERT INTO public.team_member (team_id,user_id,role,status,joined_at)
SELECT id,'10000000-0000-0000-0000-000000000703','player','active',now()
FROM public.team WHERE slug = 'group-registration-fc';

INSERT INTO public.event (
  title,start_time,end_time,max_users,min_users,price,is_published,
  allows_team_registration,team_registration_min_players,team_registration_max_players
)
VALUES
  ('Group Event Approved',now() + interval '2 days',now() + interval '2 days 2 hours',10,2,15,true,true,2,4),
  ('Group Event Rejected',now() + interval '3 days',now() + interval '3 days 2 hours',10,2,20,true,true,2,4),
  ('Group Event Cancelled',now() + interval '4 days',now() + interval '4 days 2 hours',10,2,25,true,true,2,4);

UPDATE public.event
SET team_registration_price_mode = 'fixed_team', team_registration_fixed_price = 50
WHERE title = 'Group Event Rejected';

INSERT INTO public."paymentMethod" (name,type,is_active,created_by)
VALUES ('Yape grupos','yape',true,'10000000-0000-0000-0000-000000000704');

INSERT INTO public."eventPaymentMethod" (event,"paymentMethod")
SELECT event.id, method.id
FROM public.event event
CROSS JOIN public."paymentMethod" method
WHERE event.title IN ('Group Event Approved','Group Event Rejected','Group Event Cancelled')
  AND method.name = 'Yape grupos';

SELECT set_config('test.team_id',(SELECT id::text FROM public.team WHERE slug='group-registration-fc'),true);
SELECT set_config('test.event_approved_id',(SELECT id::text FROM public.event WHERE title='Group Event Approved'),true);
SELECT set_config('test.event_rejected_id',(SELECT id::text FROM public.event WHERE title='Group Event Rejected'),true);
SELECT set_config('test.event_cancelled_id',(SELECT id::text FROM public.event WHERE title='Group Event Cancelled'),true);
SELECT set_config('test.payment_method_id',(SELECT id::text FROM public."paymentMethod" WHERE name='Yape grupos'),true);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000701',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT extensions.throws_ok(
  format(
    'SELECT * FROM public.update_team_as_captain(%s,%L,NULL,NULL,NULL,%s)',
    current_setting('test.team_id'),'Group Registration FC',2
  ),
  'P0001',NULL,'captain cannot lower the limit below the active roster'
);

RESET ROLE;
SET LOCAL ROLE service_role;
SELECT extensions.throws_ok(
  format(
    'INSERT INTO public.team_member(team_id,user_id,role,status,joined_at) VALUES (%s,%L::uuid,%L,%L,now())',
    current_setting('test.team_id'),'10000000-0000-0000-0000-000000000704','player','active'
  ),
  'P0001',NULL,'database prevents a fourth active member when the team limit is three'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000703',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);

SELECT extensions.is(
  public.set_featured_team(current_setting('test.team_id')::bigint),
  current_setting('test.team_id')::bigint,
  'active player can feature her team'
);

RESET ROLE;
SELECT extensions.is(
  (SELECT featured_team_id FROM public.profile WHERE "user"='10000000-0000-0000-0000-000000000703'),
  current_setting('test.team_id')::bigint,
  'profile stores the featured team'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000701',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT public.remove_team_member(
  current_setting('test.team_id')::bigint,
  (SELECT id FROM public.team_member WHERE team_id=current_setting('test.team_id')::bigint AND user_id='10000000-0000-0000-0000-000000000703')
);

RESET ROLE;
SELECT extensions.is(
  (SELECT status FROM public.team_member WHERE team_id=current_setting('test.team_id')::bigint AND user_id='10000000-0000-0000-0000-000000000703'),
  'removed',
  'captain removes an active player while retaining history'
);
SELECT extensions.is(
  (SELECT featured_team_id FROM public.profile WHERE "user"='10000000-0000-0000-0000-000000000703'),
  NULL::bigint,
  'removing a player clears her featured team'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000701',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT extensions.is(
  (SELECT user_id FROM public.transfer_team_captain(
    current_setting('test.team_id')::bigint,
    (SELECT id FROM public.team_member WHERE team_id=current_setting('test.team_id')::bigint AND user_id='10000000-0000-0000-0000-000000000702')
  )),
  '10000000-0000-0000-0000-000000000702'::uuid,
  'captaincy transfers to an active player'
);

RESET ROLE;
SELECT extensions.is(
  (SELECT count(*)::integer FROM public.team_member WHERE team_id=current_setting('test.team_id')::bigint AND role='captain' AND status='active'),
  1,
  'transfer leaves exactly one active captain'
);
SELECT extensions.is(
  (SELECT role FROM public.team_member WHERE team_id=current_setting('test.team_id')::bigint AND user_id='10000000-0000-0000-0000-000000000701'),
  'player',
  'former captain becomes a player'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000702',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT public.transfer_team_captain(
  current_setting('test.team_id')::bigint,
  (SELECT id FROM public.team_member WHERE team_id=current_setting('test.team_id')::bigint AND user_id='10000000-0000-0000-0000-000000000701')
);

RESET ROLE;
SELECT extensions.is(
  (SELECT user_id FROM public.team_member WHERE team_id=current_setting('test.team_id')::bigint AND role='captain' AND status='active'),
  '10000000-0000-0000-0000-000000000701'::uuid,
  'captaincy can be transferred back atomically'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000701',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT set_config(
  'test.registration_approved_id',
  (SELECT id::text FROM public.create_team_event_registration(
    current_setting('test.event_approved_id')::bigint,
    current_setting('test.team_id')::bigint,
    ARRAY['10000000-0000-0000-0000-000000000701'::uuid,'10000000-0000-0000-0000-000000000702'::uuid],
    '12345678',
    current_setting('test.payment_method_id')::bigint
  )),
  true
);

RESET ROLE;
SELECT extensions.is(
  (SELECT state FROM public.team_event_registration WHERE id=current_setting('test.registration_approved_id')::bigint),
  'pending',
  'group registration starts pending'
);
SELECT extensions.is(
  (SELECT participant_count FROM public.team_event_registration WHERE id=current_setting('test.registration_approved_id')::bigint),
  2,
  'server stores the selected participant count'
);
SELECT extensions.is(
  (SELECT total_amount FROM public.team_event_registration WHERE id=current_setting('test.registration_approved_id')::bigint),
  30::numeric,
  'server calculates total from frozen unit price'
);
SELECT extensions.is(
  (SELECT count(*)::integer FROM public.assistants WHERE team_event_registration_id=current_setting('test.registration_approved_id')::bigint AND state='pending'),
  2,
  'one pending assistant is created per selected member'
);
SELECT extensions.is(
  (SELECT count(*)::integer FROM public.ticket WHERE assistant_id IN (SELECT id FROM public.assistants WHERE team_event_registration_id=current_setting('test.registration_approved_id')::bigint)),
  0,
  'tickets are not emitted before approval'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000701',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT extensions.throws_ok(
  format(
    'SELECT * FROM public.create_team_event_registration(%s,%s,ARRAY[%L::uuid,%L::uuid],%L,%s)',
    current_setting('test.event_approved_id'),current_setting('test.team_id'),
    '10000000-0000-0000-0000-000000000701','10000000-0000-0000-0000-000000000702','87654321',
    current_setting('test.payment_method_id')
  ),
  'P0001',NULL,'team cannot create a second active registration for the same event'
);

RESET ROLE;
SET LOCAL ROLE service_role;
SELECT public.review_team_event_registration(
  current_setting('test.registration_approved_id')::bigint,'approve','10000000-0000-0000-0000-000000000704',NULL
);
RESET ROLE;

SELECT extensions.is(
  (SELECT state FROM public.team_event_registration WHERE id=current_setting('test.registration_approved_id')::bigint),
  'approved',
  'admin approval updates the whole group'
);
SELECT extensions.is(
  (SELECT count(*)::integer FROM public.assistants WHERE team_event_registration_id=current_setting('test.registration_approved_id')::bigint AND state='approved'),
  2,
  'admin approval updates every assistant'
);
SELECT extensions.is(
  (SELECT count(*)::integer FROM public.ticket WHERE assistant_id IN (SELECT id FROM public.assistants WHERE team_event_registration_id=current_setting('test.registration_approved_id')::bigint) AND status='active'),
  2,
  'approval emits one active ticket per participant'
);

SET LOCAL ROLE service_role;
SELECT public.review_team_event_registration(
  current_setting('test.registration_approved_id')::bigint,'approve','10000000-0000-0000-0000-000000000704',NULL
);
RESET ROLE;
SELECT extensions.is(
  (SELECT count(*)::integer FROM public.ticket WHERE assistant_id IN (SELECT id FROM public.assistants WHERE team_event_registration_id=current_setting('test.registration_approved_id')::bigint)),
  2,
  'repeated approval is idempotent for tickets'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000701',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT set_config(
  'test.registration_rejected_id',
  (SELECT id::text FROM public.create_team_event_registration(
    current_setting('test.event_rejected_id')::bigint,
    current_setting('test.team_id')::bigint,
    ARRAY['10000000-0000-0000-0000-000000000701'::uuid,'10000000-0000-0000-0000-000000000702'::uuid],
    '23456789',
    current_setting('test.payment_method_id')::bigint
  )),true
);
RESET ROLE;

SELECT extensions.is(
  (SELECT price_mode FROM public.team_event_registration WHERE id=current_setting('test.registration_rejected_id')::bigint),
  'fixed_team',
  'group registration freezes the fixed-team price mode'
);
SELECT extensions.is(
  (SELECT total_amount FROM public.team_event_registration WHERE id=current_setting('test.registration_rejected_id')::bigint),
  50::numeric,
  'fixed-team pricing does not multiply the amount by participant count'
);

SET LOCAL ROLE service_role;
SELECT extensions.throws_ok(
  format(
    'SELECT public.review_team_event_registration(%s,%L,%L::uuid,NULL)',
    current_setting('test.registration_rejected_id'),'reject','10000000-0000-0000-0000-000000000704'
  ),
  'P0001',NULL,'rejecting a group requires a reason'
);
SELECT public.review_team_event_registration(
  current_setting('test.registration_rejected_id')::bigint,'reject','10000000-0000-0000-0000-000000000704','Operación no encontrada'
);
RESET ROLE;

SELECT extensions.is(
  (SELECT state FROM public.team_event_registration WHERE id=current_setting('test.registration_rejected_id')::bigint),
  'rejected',
  'admin can reject the whole group'
);
SELECT extensions.is(
  (SELECT count(*)::integer FROM public.assistants WHERE team_event_registration_id=current_setting('test.registration_rejected_id')::bigint AND state='rejected'),
  2,
  'rejection updates every assistant'
);
SELECT extensions.is(
  (SELECT count(*)::integer FROM public.ticket WHERE assistant_id IN (SELECT id FROM public.assistants WHERE team_event_registration_id=current_setting('test.registration_rejected_id')::bigint) AND status='active'),
  0,
  'rejected group has no active tickets'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000701',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT set_config(
  'test.registration_cancelled_id',
  (SELECT id::text FROM public.create_team_event_registration(
    current_setting('test.event_cancelled_id')::bigint,
    current_setting('test.team_id')::bigint,
    ARRAY['10000000-0000-0000-0000-000000000701'::uuid,'10000000-0000-0000-0000-000000000702'::uuid],
    '34567890',
    current_setting('test.payment_method_id')::bigint
  )),true
);
RESET ROLE;

SET LOCAL ROLE service_role;
SELECT public.review_team_event_registration(
  current_setting('test.registration_cancelled_id')::bigint,'approve','10000000-0000-0000-0000-000000000704',NULL
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000701',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT public.cancel_team_event_registration(current_setting('test.registration_cancelled_id')::bigint);
RESET ROLE;

SELECT extensions.is(
  (SELECT state FROM public.team_event_registration WHERE id=current_setting('test.registration_cancelled_id')::bigint),
  'cancelled',
  'captain can cancel the complete registration before the event starts'
);
SELECT extensions.is(
  (SELECT count(*)::integer FROM public.assistants WHERE team_event_registration_id=current_setting('test.registration_cancelled_id')::bigint AND state='rejected'),
  2,
  'cancellation releases every participant registration'
);
SELECT extensions.is(
  (SELECT count(*)::integer FROM public.ticket WHERE assistant_id IN (SELECT id FROM public.assistants WHERE team_event_registration_id=current_setting('test.registration_cancelled_id')::bigint) AND status='revoked'),
  2,
  'cancellation revokes every individual ticket in the group'
);

SELECT set_config('request.jwt.claim.sub','',true);
SELECT set_config('request.jwt.claim.role','',true);
SET LOCAL ROLE authenticated;
SELECT extensions.throws_ok(
  format(
    'SELECT * FROM public.create_team_event_registration(%s,%s,ARRAY[%L::uuid,%L::uuid],%L,%s)',
    current_setting('test.event_rejected_id'),current_setting('test.team_id'),
    '10000000-0000-0000-0000-000000000701','10000000-0000-0000-0000-000000000702','45678901',
    current_setting('test.payment_method_id')
  ),
  'P0001',NULL,'group registration requires authentication'
);

SELECT * FROM extensions.finish();
ROLLBACK;
