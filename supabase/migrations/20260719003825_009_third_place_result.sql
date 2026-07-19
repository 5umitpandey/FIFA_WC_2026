-- 3rd place match: England defeats France
UPDATE matches
  SET status = 'completed',
      winner_id = 'ENG',
      home_score = 2,
      away_score = 1,
      updated_at = now()
WHERE match_code = 'TP';
