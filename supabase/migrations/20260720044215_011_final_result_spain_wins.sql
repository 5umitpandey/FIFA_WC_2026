-- Final: Spain defeats Argentina
UPDATE matches
  SET status     = 'completed',
      winner_id  = 'ESP',
      home_score = 1,
      away_score = 0,
      updated_at = now()
WHERE match_code = 'FIN';
