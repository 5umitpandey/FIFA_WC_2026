/*
# Update match fixtures with post-Round-of-16 World Cup 2026 data

1. Adds missing teams used by the knockout fixtures
2. Marks all Round of 16 fixtures as completed
3. Sets the active quarter-final bracket and kickoff times in UTC

## Active Bracket
- QF-1: France vs Morocco
- QF-2: Spain vs Belgium
- QF-3: Norway vs England
- QF-4: Argentina vs Switzerland
- SF-1: QF-1 winner vs QF-2 winner
- SF-2: QF-3 winner vs QF-4 winner
- Final: SF-1 winner vs SF-2 winner
*/

-- Add missing teams.
INSERT INTO teams (id, name, flag_url, is_qualified) VALUES
  ('NOR', 'Norway', 'https://flagcdn.com/w80/no.png', true),
  ('PAR', 'Paraguay', 'https://flagcdn.com/w80/py.png', true),
  ('EGY', 'Egypt', 'https://flagcdn.com/w80/eg.png', true),
  ('SUI', 'Switzerland', 'https://flagcdn.com/w80/ch.png', true)
ON CONFLICT (id) DO NOTHING;

-- R16-1: Canada vs Morocco; Morocco advanced.
UPDATE matches SET
  team1_id = 'CAN',
  team2_id = 'MAR',
  status = 'completed',
  winner_id = 'MAR',
  home_score = 0,
  away_score = 3,
  kickoff_time = '2026-07-04 18:00:00+00'
WHERE match_code = 'R16-1';

-- R16-2: Paraguay vs France; France advanced.
UPDATE matches SET
  team1_id = 'PAR',
  team2_id = 'FRA',
  status = 'completed',
  winner_id = 'FRA',
  home_score = 0,
  away_score = 1,
  kickoff_time = '2026-07-05 13:30:00+00'
WHERE match_code = 'R16-2';

-- R16-3: USA vs Belgium; Belgium advanced.
UPDATE matches SET
  team1_id = 'USA',
  team2_id = 'BEL',
  status = 'completed',
  winner_id = 'BEL',
  home_score = NULL,
  away_score = NULL,
  kickoff_time = '2026-07-06 23:30:00+00'
WHERE match_code = 'R16-3';

-- R16-4: Portugal vs Spain; Spain advanced.
UPDATE matches SET
  team1_id = 'POR',
  team2_id = 'ESP',
  status = 'completed',
  winner_id = 'ESP',
  home_score = NULL,
  away_score = NULL,
  kickoff_time = '2026-07-06 19:00:00+00'
WHERE match_code = 'R16-4';

-- R16-5: Brazil vs Norway; Norway advanced.
UPDATE matches SET
  team1_id = 'BRA',
  team2_id = 'NOR',
  status = 'completed',
  winner_id = 'NOR',
  home_score = NULL,
  away_score = NULL,
  kickoff_time = '2026-07-05 20:00:00+00'
WHERE match_code = 'R16-5';

-- R16-6: Mexico vs England; England advanced.
UPDATE matches SET
  team1_id = 'MEX',
  team2_id = 'ENG',
  status = 'completed',
  winner_id = 'ENG',
  home_score = NULL,
  away_score = NULL,
  kickoff_time = '2026-07-06 00:00:00+00'
WHERE match_code = 'R16-6';

-- R16-7: Switzerland vs Colombia; Switzerland advanced.
UPDATE matches SET
  team1_id = 'SUI',
  team2_id = 'COL',
  status = 'completed',
  winner_id = 'SUI',
  home_score = NULL,
  away_score = NULL,
  kickoff_time = '2026-07-07 20:00:00+00'
WHERE match_code = 'R16-7';

-- R16-8: Argentina vs Egypt; Argentina advanced.
UPDATE matches SET
  team1_id = 'ARG',
  team2_id = 'EGY',
  status = 'completed',
  winner_id = 'ARG',
  home_score = NULL,
  away_score = NULL,
  kickoff_time = '2026-07-07 16:00:00+00'
WHERE match_code = 'R16-8';

-- QF-1: France vs Morocco; Fri 10 Jul 1:30am IST.
UPDATE matches SET
  team1_id = 'FRA',
  team2_id = 'MAR',
  status = 'scheduled',
  winner_id = NULL,
  home_score = NULL,
  away_score = NULL,
  kickoff_time = '2026-07-09 20:00:00+00'
WHERE match_code = 'QF-1';

-- QF-2: Spain vs Belgium; Sat 11 Jul 12:30am IST.
UPDATE matches SET
  team1_id = 'ESP',
  team2_id = 'BEL',
  status = 'scheduled',
  winner_id = NULL,
  home_score = NULL,
  away_score = NULL,
  kickoff_time = '2026-07-10 19:00:00+00'
WHERE match_code = 'QF-2';

-- QF-3: Norway vs England; Sun 12 Jul 2:30am IST.
UPDATE matches SET
  team1_id = 'NOR',
  team2_id = 'ENG',
  status = 'scheduled',
  winner_id = NULL,
  home_score = NULL,
  away_score = NULL,
  kickoff_time = '2026-07-11 21:00:00+00'
WHERE match_code = 'QF-3';

-- QF-4: Argentina vs Switzerland; Sun 12 Jul 6:30am IST.
UPDATE matches SET
  team1_id = 'ARG',
  team2_id = 'SUI',
  status = 'scheduled',
  winner_id = NULL,
  home_score = NULL,
  away_score = NULL,
  kickoff_time = '2026-07-12 01:00:00+00'
WHERE match_code = 'QF-4';

-- SF-1: Winner QF-1 vs winner QF-2; Wed 15 Jul 12:30am IST.
UPDATE matches SET
  team1_id = NULL,
  team2_id = NULL,
  status = 'scheduled',
  winner_id = NULL,
  home_score = NULL,
  away_score = NULL,
  kickoff_time = '2026-07-14 19:00:00+00'
WHERE match_code = 'SF-1';

-- SF-2: Winner QF-3 vs winner QF-4; Thu 16 Jul 12:30am IST.
UPDATE matches SET
  team1_id = NULL,
  team2_id = NULL,
  status = 'scheduled',
  winner_id = NULL,
  home_score = NULL,
  away_score = NULL,
  kickoff_time = '2026-07-15 19:00:00+00'
WHERE match_code = 'SF-2';

-- Third Place: Loser SF-1 vs loser SF-2.
UPDATE matches SET
  team1_id = NULL,
  team2_id = NULL,
  status = 'scheduled',
  winner_id = NULL,
  home_score = NULL,
  away_score = NULL,
  kickoff_time = '2026-07-18 16:00:00+00'
WHERE match_code = 'TP';

-- Final: Winner SF-1 vs winner SF-2; Mon 20 Jul 12:30am IST.
UPDATE matches SET
  team1_id = NULL,
  team2_id = NULL,
  status = 'scheduled',
  winner_id = NULL,
  home_score = NULL,
  away_score = NULL,
  kickoff_time = '2026-07-19 19:00:00+00'
WHERE match_code = 'FIN';
