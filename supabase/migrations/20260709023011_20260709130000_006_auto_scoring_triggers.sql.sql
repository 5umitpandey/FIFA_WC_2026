/*
# Auto-scoring triggers

1. `calculate_match_scores_trigger()`
   - Fires AFTER UPDATE on matches when winner_id changes (NULL → value or value → different value)
   - Calculates points for ALL users who predicted that match
   - Upserts into scores table (score_type = 'match')

2. `calculate_tournament_scores_trigger()`
   - Fires AFTER UPDATE on matches when winner_id changes on a 'final' or 'third_place' match
   - Calculates champion (6pts), runner-up (5pts), and third-place (4pts) bonus scores
   - Upserts into scores table for all users with tournament_predictions

3. Both triggers use SECURITY DEFINER to bypass RLS (service-level operation)
*/

-- Points per round for match predictions
CREATE OR REPLACE FUNCTION get_match_points(round match_round)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE round
    WHEN 'round_of_16' THEN 3
    WHEN 'quarter_final' THEN 3
    WHEN 'semi_final' THEN 3
    WHEN 'third_place' THEN 4
    WHEN 'final' THEN 6
    ELSE 3
  END;
$$;

-- Function: calculate and upsert match scores for all users who predicted a given match
CREATE OR REPLACE FUNCTION calculate_match_scores(match_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match RECORD;
  v_points integer;
  v_pred RECORD;
BEGIN
  SELECT id, round, winner_id INTO v_match FROM matches WHERE id = match_uuid;
  IF NOT FOUND OR v_match.winner_id IS NULL THEN RETURN; END IF;

  v_points := get_match_points(v_match.round);

  FOR v_pred IN
    SELECT user_id, predicted_winner_id FROM predictions WHERE match_id = match_uuid
  LOOP
    INSERT INTO scores (user_id, match_id, points_earned, score_type)
    VALUES (v_pred.user_id, match_uuid,
            CASE WHEN v_pred.predicted_winner_id = v_match.winner_id THEN v_points ELSE 0 END,
            'match')
    ON CONFLICT (user_id, match_id) WHERE match_id IS NOT NULL
    DO UPDATE SET points_earned = EXCLUDED.points_earned;
  END LOOP;
END;
$$;

-- Function: calculate tournament bonus scores (champion, runner-up, third-place)
CREATE OR REPLACE FUNCTION calculate_tournament_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_final RECORD;
  v_tp RECORD;
  v_runner_up_id text;
  v_user RECORD;
  v_tp_pred RECORD;
  v_champion_pts integer;
  v_runner_up_pts integer;
  v_third_place_pts integer;
BEGIN
  SELECT id, winner_id, team1_id, team2_id, status INTO v_final
    FROM matches WHERE round = 'final' AND status = 'completed';
  IF NOT FOUND THEN RETURN; END IF;

  v_runner_up_id := CASE
    WHEN v_final.winner_id = v_final.team1_id THEN v_final.team2_id
    WHEN v_final.winner_id = v_final.team2_id THEN v_final.team1_id
    ELSE NULL
  END;

  SELECT id, winner_id, status INTO v_tp
    FROM matches WHERE round = 'third_place' AND status = 'completed';

  FOR v_user IN SELECT id FROM users LOOP
    SELECT predicted_champion, predicted_runner_up, predicted_third_place
      INTO v_tp_pred FROM tournament_predictions WHERE user_id = v_user.id;

    IF NOT FOUND THEN CONTINUE; END IF;

    v_champion_pts := CASE WHEN v_tp_pred.predicted_champion = v_final.winner_id THEN 6 ELSE 0 END;
    v_runner_up_pts := CASE WHEN v_tp_pred.predicted_runner_up = v_runner_up_id THEN 5 ELSE 0 END;
    v_third_place_pts := CASE
      WHEN v_tp IS NOT NULL AND v_tp.winner_id IS NOT NULL AND v_tp_pred.predicted_third_place = v_tp.winner_id THEN 4
      ELSE 0
    END;

    -- Champion score (no match_id)
    INSERT INTO scores (user_id, points_earned, score_type)
    VALUES (v_user.id, v_champion_pts, 'champion')
    ON CONFLICT (user_id, score_type) WHERE match_id IS NULL
    DO UPDATE SET points_earned = EXCLUDED.points_earned;

    -- Runner-up score (no match_id)
    INSERT INTO scores (user_id, points_earned, score_type)
    VALUES (v_user.id, v_runner_up_pts, 'runner_up')
    ON CONFLICT (user_id, score_type) WHERE match_id IS NULL
    DO UPDATE SET points_earned = EXCLUDED.points_earned;

    -- Third-place score (no match_id)
    INSERT INTO scores (user_id, points_earned, score_type)
    VALUES (v_user.id, v_third_place_pts, 'third_place')
    ON CONFLICT (user_id, score_type) WHERE match_id IS NULL
    DO UPDATE SET points_earned = EXCLUDED.points_earned;
  END LOOP;
END;
$$;

-- Trigger function: fires on matches UPDATE when winner_id changes
CREATE OR REPLACE FUNCTION on_match_winner_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act when winner_id changed (NULL→value or value→different)
  IF (OLD.winner_id IS DISTINCT FROM NEW.winner_id) AND NEW.winner_id IS NOT NULL THEN
    -- Calculate match prediction scores
    PERFORM calculate_match_scores(NEW.id);

    -- If this is the final or third-place match, recalculate tournament bonuses
    IF NEW.round IN ('final', 'third_place') THEN
      PERFORM calculate_tournament_scores();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop old trigger if exists, then create
DROP TRIGGER IF EXISTS trigger_match_winner_changed ON matches;
CREATE TRIGGER trigger_match_winner_changed
  AFTER UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION on_match_winner_changed();

-- Add unique constraints to support ON CONFLICT upserts
-- scores: one row per (user_id, match_id) for match-type scores
CREATE UNIQUE INDEX IF NOT EXISTS scores_user_match_unique
  ON scores (user_id, match_id)
  WHERE match_id IS NOT NULL;

-- scores: one row per (user_id, score_type) for bonus-type scores (no match_id)
CREATE UNIQUE INDEX IF NOT EXISTS scores_user_bonustype_unique
  ON scores (user_id, score_type)
  WHERE match_id IS NULL;