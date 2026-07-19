-- Fix: calculate_tournament_scores was gated on final being completed,
-- so third_place bonus could never be scored before the final.
-- Now each bonus (champion, runner_up, third_place) is scored independently.
CREATE OR REPLACE FUNCTION calculate_tournament_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_final RECORD;
  v_tp    RECORD;
  v_runner_up_id text;
  v_user  RECORD;
  v_pred  RECORD;
BEGIN
  -- Get both matches regardless of completion status
  SELECT id, winner_id, team1_id, team2_id INTO v_final
    FROM matches WHERE round = 'final';

  SELECT id, winner_id INTO v_tp
    FROM matches WHERE round = 'third_place';

  -- Determine runner-up from final teams
  IF v_final.winner_id IS NOT NULL
     AND v_final.team1_id IS NOT NULL
     AND v_final.team2_id IS NOT NULL THEN
    v_runner_up_id := CASE
      WHEN v_final.winner_id = v_final.team1_id THEN v_final.team2_id
      ELSE v_final.team1_id
    END;
  END IF;

  FOR v_user IN SELECT id FROM users LOOP
    SELECT predicted_champion, predicted_runner_up, predicted_third_place
      INTO v_pred FROM tournament_predictions WHERE user_id = v_user.id;

    IF NOT FOUND THEN CONTINUE; END IF;

    -- Champion: only if final completed
    IF v_final.winner_id IS NOT NULL THEN
      INSERT INTO scores (user_id, points_earned, score_type)
      VALUES (
        v_user.id,
        CASE WHEN v_pred.predicted_champion = v_final.winner_id THEN 6 ELSE 0 END,
        'champion'
      )
      ON CONFLICT (user_id, score_type) WHERE match_id IS NULL
      DO UPDATE SET points_earned = EXCLUDED.points_earned;
    END IF;

    -- Runner-up: only if final completed
    IF v_runner_up_id IS NOT NULL THEN
      INSERT INTO scores (user_id, points_earned, score_type)
      VALUES (
        v_user.id,
        CASE WHEN v_pred.predicted_runner_up = v_runner_up_id THEN 5 ELSE 0 END,
        'runner_up'
      )
      ON CONFLICT (user_id, score_type) WHERE match_id IS NULL
      DO UPDATE SET points_earned = EXCLUDED.points_earned;
    END IF;

    -- Third place: scored independently as soon as TP match is completed
    IF v_tp.winner_id IS NOT NULL THEN
      INSERT INTO scores (user_id, points_earned, score_type)
      VALUES (
        v_user.id,
        CASE WHEN v_pred.predicted_third_place = v_tp.winner_id THEN 4 ELSE 0 END,
        'third_place'
      )
      ON CONFLICT (user_id, score_type) WHERE match_id IS NULL
      DO UPDATE SET points_earned = EXCLUDED.points_earned;
    END IF;
  END LOOP;
END;
$$;

-- Immediately recalculate for all users now that TP result is in
SELECT calculate_tournament_scores();
