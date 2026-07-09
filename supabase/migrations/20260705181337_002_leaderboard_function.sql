/*
# Leaderboard Function and Utilities

1. Functions
- `get_leaderboard()` - Returns ranked user entries with total points
- Uses window function ROW_NUMBER() for ranking

2. Purpose
- Efficiently calculates leaderboard without client-side sorting
- Returns: user_id, full_name, username, supporting_country, total_points, rank
*/

CREATE OR REPLACE FUNCTION get_leaderboard()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  username text,
  supporting_country text,
  total_points bigint,
  rank bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.full_name,
    u.username,
    u.supporting_country,
    COALESCE(SUM(s.points_earned), 0) as total_points,
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(s.points_earned), 0) DESC) as rank
  FROM users u
  LEFT JOIN scores s ON s.user_id = u.id
  GROUP BY u.id, u.full_name, u.username, u.supporting_country
  ORDER BY total_points DESC;
END;
$$;
