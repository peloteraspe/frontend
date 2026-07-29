-- TEAM-109: Allow backend service-role reads of public profile usernames.
-- Public team profiles resolve active member user IDs to usernames server-side.

GRANT SELECT ON TABLE public.profile TO service_role;
