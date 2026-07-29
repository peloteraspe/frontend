-- Sprint 1 verification support: /profile must be readable by authenticated
-- users so the "Mis equipos" section can render after login.

GRANT SELECT ON TABLE public.profile TO authenticated;
GRANT SELECT ON TABLE public.profile_position TO authenticated, service_role;
GRANT SELECT ON TABLE public.level TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.player_position TO anon, authenticated, service_role;

COMMENT ON TABLE public.profile IS
  'Player profile data used by authenticated profile and team flows.';
