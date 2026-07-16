-- Analytics hardening: RLS policies need matching table grants for inserts.

GRANT INSERT ON TABLE public.product_analytics_events TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.product_analytics_events TO service_role;
