import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const actualWinners = {
  'QF-1': 'MAR',
  'QF-2': 'ESP',
  'QF-3': 'NOR',
  'QF-4': 'ARG',
  'SF-1': 'ESP',
  'SF-2': 'ARG',
  FIN: 'ARG',
};

const matchPoints = {
  'QF-1': 3,
  'QF-2': 3,
  'QF-3': 3,
  'QF-4': 3,
  'SF-1': 3,
  'SF-2': 3,
  FIN: 6,
};

const actualChampion = 'ARG';
const actualRunnerUp = 'ESP';
const actualThirdPlace = 'NOR';

const { error: signInError } = await supabase.auth.signInWithPassword({
  email: 'wcseed01@wc2026.local',
  password: 'Wc2026!Seed01',
});

if (signInError) throw signInError;

const { data: user, error: userError } = await supabase
  .from('users')
  .select('id, username, full_name, supporting_country')
  .eq('username', 'test4')
  .maybeSingle();

if (userError) throw userError;
if (!user) {
  console.log(JSON.stringify({ error: 'No user named test4 found' }, null, 2));
  process.exit(0);
}

const { data: scores, error: scoreError } = await supabase
  .from('scores')
  .select('match_id, points_earned, score_type')
  .eq('user_id', user.id);

if (scoreError) throw scoreError;

const { data: predictions, error: predictionError } = await supabase
  .from('predictions')
  .select('predicted_winner_id, is_submitted, match:matches(id, match_code)')
  .eq('user_id', user.id);

if (predictionError) throw predictionError;

const { data: tournamentPrediction, error: tournamentError } = await supabase
  .from('tournament_predictions')
  .select('predicted_champion, predicted_runner_up, predicted_third_place, is_locked')
  .eq('user_id', user.id)
  .maybeSingle();

if (tournamentError) throw tournamentError;

const expectedMatchRows = (predictions ?? [])
  .map((prediction) => {
    const match = Array.isArray(prediction.match) ? prediction.match[0] : prediction.match;
    const matchCode = match?.match_code;
    if (!matchCode || !actualWinners[matchCode]) return null;
    return {
      match_code: matchCode,
      predicted_winner_id: prediction.predicted_winner_id,
      is_submitted: prediction.is_submitted,
      expected_points: prediction.predicted_winner_id === actualWinners[matchCode] ? matchPoints[matchCode] : 0,
    };
  })
  .filter(Boolean)
  .sort((a, b) => Object.keys(actualWinners).indexOf(a.match_code) - Object.keys(actualWinners).indexOf(b.match_code));

const expectedBonus = tournamentPrediction ? {
  champion: tournamentPrediction.predicted_champion === actualChampion ? 6 : 0,
  runner_up: tournamentPrediction.predicted_runner_up === actualRunnerUp ? 5 : 0,
  third_place: tournamentPrediction.predicted_third_place === actualThirdPlace ? 4 : 0,
} : null;

const actualScoreTotal = (scores ?? []).reduce((sum, score) => sum + score.points_earned, 0);
const expectedTotal = expectedMatchRows.reduce((sum, row) => sum + row.expected_points, 0)
  + (expectedBonus ? expectedBonus.champion + expectedBonus.runner_up + expectedBonus.third_place : 0);

console.log(JSON.stringify({
  user,
  actual_score_rows: scores ?? [],
  actual_score_total: actualScoreTotal,
  saved_predictions_against_test_result: expectedMatchRows,
  tournament_prediction: tournamentPrediction,
  expected_bonus: expectedBonus,
  expected_total_if_scored_now: expectedTotal,
}, null, 2));
