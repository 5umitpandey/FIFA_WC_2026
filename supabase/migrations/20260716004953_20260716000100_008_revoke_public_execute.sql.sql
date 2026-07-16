-- Revoke EXECUTE from PUBLIC on internal SECURITY DEFINER functions.
-- PostgreSQL grants EXECUTE to PUBLIC by default on functions, so the earlier
-- REVOKE FROM anon/authenticated had no effect. Revoke from PUBLIC instead,
-- which removes access from anon, authenticated, and any other role.

REVOKE EXECUTE ON FUNCTION public.calculate_match_scores(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calculate_tournament_scores() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.on_match_winner_changed() FROM PUBLIC;
