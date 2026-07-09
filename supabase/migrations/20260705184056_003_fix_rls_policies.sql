/*
# Fix RLS policies for public access

1. Changes
- Add anon access to teams table (needed before login)
- Add anon access to matches table (needed before login for bracket display)
- Keep authenticated-only policies for user data tables

2. Security
- Teams and matches are public data, safe to read anonymously
- User predictions and scores remain authenticated-only
*/

-- Allow anon to read teams
DROP POLICY IF EXISTS "teams_read_all" ON teams;
CREATE POLICY "teams_read_all" ON teams FOR SELECT
    TO anon, authenticated USING (true);

-- Allow anon to read matches
DROP POLICY IF EXISTS "matches_read_all" ON matches;
CREATE POLICY "matches_read_all" ON matches FOR SELECT
    TO anon, authenticated USING (true);

-- Allow authenticated users to read the leaderboard and prediction details
DROP POLICY IF EXISTS "users_read_all" ON users;
CREATE POLICY "users_read_all" ON users FOR SELECT
    TO authenticated USING (true);

DROP POLICY IF EXISTS "scores_read_all" ON scores;
CREATE POLICY "scores_read_all" ON scores FOR SELECT
    TO authenticated USING (true);

DROP POLICY IF EXISTS "predictions_read_all" ON predictions;
CREATE POLICY "predictions_read_all" ON predictions FOR SELECT
    TO authenticated USING (true);

DROP POLICY IF EXISTS "tournament_predictions_read_all" ON tournament_predictions;
CREATE POLICY "tournament_predictions_read_all" ON tournament_predictions FOR SELECT
    TO authenticated USING (true);
