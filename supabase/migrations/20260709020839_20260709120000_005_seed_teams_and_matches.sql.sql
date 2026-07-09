-- Seed all teams and match rows that were never inserted

-- Insert all teams
INSERT INTO teams (id, name, flag_url, is_qualified) VALUES
  ('ARG', 'Argentina', 'https://flagcdn.com/w80/ar.png', true),
  ('BRA', 'Brazil', 'https://flagcdn.com/w80/br.png', true),
  ('FRA', 'France', 'https://flagcdn.com/w80/fr.png', true),
  ('ENG', 'England', 'https://flagcdn.com/w80/gb-eng.png', true),
  ('GER', 'Germany', 'https://flagcdn.com/w80/de.png', true),
  ('ESP', 'Spain', 'https://flagcdn.com/w80/es.png', true),
  ('POR', 'Portugal', 'https://flagcdn.com/w80/pt.png', true),
  ('NED', 'Netherlands', 'https://flagcdn.com/w80/nl.png', true),
  ('BEL', 'Belgium', 'https://flagcdn.com/w80/be.png', true),
  ('NOR', 'Norway', 'https://flagcdn.com/w80/no.png', true),
  ('CRO', 'Croatia', 'https://flagcdn.com/w80/hr.png', true),
  ('URU', 'Uruguay', 'https://flagcdn.com/w80/uy.png', true),
  ('COL', 'Colombia', 'https://flagcdn.com/w80/co.png', true),
  ('MEX', 'Mexico', 'https://flagcdn.com/w80/mx.png', true),
  ('USA', 'United States', 'https://flagcdn.com/w80/us.png', true),
  ('CAN', 'Canada', 'https://flagcdn.com/w80/ca.png', true),
  ('JPN', 'Japan', 'https://flagcdn.com/w80/jp.png', true),
  ('KOR', 'South Korea', 'https://flagcdn.com/w80/kr.png', true),
  ('MAR', 'Morocco', 'https://flagcdn.com/w80/ma.png', true),
  ('SUI', 'Switzerland', 'https://flagcdn.com/w80/ch.png', true),
  ('SEN', 'Senegal', 'https://flagcdn.com/w80/sn.png', true),
  ('NGA', 'Nigeria', 'https://flagcdn.com/w80/ng.png', true),
  ('PAR', 'Paraguay', 'https://flagcdn.com/w80/py.png', true),
  ('EGY', 'Egypt', 'https://flagcdn.com/w80/eg.png', true)
ON CONFLICT (id) DO NOTHING;

-- Insert all match rows (round_of_16 = match_number 1-8, quarter_final = 1-4, semi_final = 1-2, third_place = 1, final = 1)
INSERT INTO matches (match_code, round, match_number, team1_id, team2_id, kickoff_time, status, winner_id, home_score, away_score) VALUES
  -- Round of 16 (completed)
  ('R16-1', 'round_of_16', 1, 'CAN', 'MAR', '2026-07-04 18:00:00+00', 'completed', 'MAR', 0, 3),
  ('R16-2', 'round_of_16', 2, 'PAR', 'FRA', '2026-07-05 13:30:00+00', 'completed', 'FRA', 0, 1),
  ('R16-3', 'round_of_16', 3, 'USA', 'BEL', '2026-07-06 23:30:00+00', 'completed', 'BEL', NULL, NULL),
  ('R16-4', 'round_of_16', 4, 'POR', 'ESP', '2026-07-06 19:00:00+00', 'completed', 'ESP', NULL, NULL),
  ('R16-5', 'round_of_16', 5, 'BRA', 'NOR', '2026-07-05 20:00:00+00', 'completed', 'NOR', NULL, NULL),
  ('R16-6', 'round_of_16', 6, 'MEX', 'ENG', '2026-07-06 00:00:00+00', 'completed', 'ENG', NULL, NULL),
  ('R16-7', 'round_of_16', 7, 'SUI', 'COL', '2026-07-07 20:00:00+00', 'completed', 'SUI', NULL, NULL),
  ('R16-8', 'round_of_16', 8, 'ARG', 'EGY', '2026-07-07 16:00:00+00', 'completed', 'ARG', NULL, NULL),
  -- Quarter-finals (scheduled)
  ('QF-1', 'quarter_final', 1, 'FRA', 'MAR', '2026-07-09 20:00:00+00', 'scheduled', NULL, NULL, NULL),
  ('QF-2', 'quarter_final', 2, 'ESP', 'BEL', '2026-07-10 19:00:00+00', 'scheduled', NULL, NULL, NULL),
  ('QF-3', 'quarter_final', 3, 'NOR', 'ENG', '2026-07-11 21:00:00+00', 'scheduled', NULL, NULL, NULL),
  ('QF-4', 'quarter_final', 4, 'ARG', 'SUI', '2026-07-12 01:00:00+00', 'scheduled', NULL, NULL, NULL),
  -- Semi-finals (TBD)
  ('SF-1', 'semi_final', 1, NULL, NULL, '2026-07-14 19:00:00+00', 'scheduled', NULL, NULL, NULL),
  ('SF-2', 'semi_final', 2, NULL, NULL, '2026-07-15 19:00:00+00', 'scheduled', NULL, NULL, NULL),
  -- Third place (TBD)
  ('TP', 'third_place', 1, NULL, NULL, '2026-07-18 16:00:00+00', 'scheduled', NULL, NULL, NULL),
  -- Final (TBD)
  ('FIN', 'final', 1, NULL, NULL, '2026-07-19 19:00:00+00', 'scheduled', NULL, NULL, NULL)
ON CONFLICT (match_code) DO NOTHING;