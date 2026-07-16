-- Security fixes:
-- 1. Fix mutable search_path on get_leaderboard and get_match_points
-- 2. Revoke EXECUTE from anon/authenticated on internal SECURITY DEFINER functions
--    (calculate_match_scores, calculate_tournament_scores, on_match_winner_changed)
--    These are trigger/internal functions and should never be called via REST RPC.

-- 1a. get_leaderboard: set immutable search_path
CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  username text,
  supporting_country text,
  total_points bigint,
  rank bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.full_name,
    u.username,
    u.supporting_country,
    COALESCE(SUM(s.points_earned), 0) AS total_points,
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(s.points_earned), 0) DESC) AS rank
  FROM users u
  LEFT JOIN scores s ON s.user_id = u.id
  GROUP BY u.id, u.full_name, u.username, u.supporting_country
  ORDER BY total_points DESC;
END;
$$;

-- 1b. get_match_points: set immutable search_path (already IMMUTABLE sql function, just add SET)
CREATE OR REPLACE FUNCTION public.get_match_points(round match_round)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE round
    WHEN 'round_of_16' THEN 3
    WHEN 'quarter_final' THEN 3
    WHEN 'semi_final' THEN 3
    WHEN 'third_place' THEN 4
    WHEN 'final' THEN 6
    ELSE 3
  END;
$$;

-- 2. Revoke EXECUTE from anon and authenticated on internal SECURITY DEFINER functions.
-- These are only invoked by triggers / other plpgsql functions, never via REST.
REVOKE EXECUTE ON FUNCTION public.calculate_match_scores(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_tournament_scores() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_match_winner_changed() FROM anon, authenticated;
