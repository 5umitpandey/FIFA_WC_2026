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

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
}

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

const seededUsers = [
  {
    username: 'wcseed01',
    fullName: 'World Cup Seed 01',
    password: 'Wc2026!Seed01',
    supportingCountry: 'ARG',
    picks: { 'QF-1': 'MAR', 'QF-2': 'ESP', 'QF-3': 'NOR', 'QF-4': 'ARG', 'SF-1': 'ESP', 'SF-2': 'ARG', FIN: 'ARG' },
    champion: 'ARG',
    runnerUp: 'ESP',
    thirdPlace: 'NOR',
  },
  {
    username: 'wcseed02',
    fullName: 'World Cup Seed 02',
    password: 'Wc2026!Seed02',
    supportingCountry: 'ESP',
    picks: { 'QF-1': 'FRA', 'QF-2': 'ESP', 'QF-3': 'NOR', 'QF-4': 'ARG', 'SF-1': 'ESP', 'SF-2': 'ARG', FIN: 'ESP' },
    champion: 'ESP',
    runnerUp: 'ARG',
    thirdPlace: 'MAR',
  },
  {
    username: 'wcseed03',
    fullName: 'World Cup Seed 03',
    password: 'Wc2026!Seed03',
    supportingCountry: 'MAR',
    picks: { 'QF-1': 'MAR', 'QF-2': 'BEL', 'QF-3': 'ENG', 'QF-4': 'ARG', 'SF-1': 'MAR', 'SF-2': 'ARG', FIN: 'ARG' },
    champion: 'ARG',
    runnerUp: 'MAR',
    thirdPlace: 'ESP',
  },
  {
    username: 'wcseed04',
    fullName: 'World Cup Seed 04',
    password: 'Wc2026!Seed04',
    supportingCountry: 'NOR',
    picks: { 'QF-1': 'MAR', 'QF-2': 'ESP', 'QF-3': 'NOR', 'QF-4': 'SUI', 'SF-1': 'ESP', 'SF-2': 'NOR', FIN: 'NOR' },
    champion: 'NOR',
    runnerUp: 'ESP',
    thirdPlace: 'ARG',
  },
  {
    username: 'wcseed05',
    fullName: 'World Cup Seed 05',
    password: 'Wc2026!Seed05',
    supportingCountry: 'FRA',
    picks: { 'QF-1': 'FRA', 'QF-2': 'BEL', 'QF-3': 'ENG', 'QF-4': 'SUI', 'SF-1': 'FRA', 'SF-2': 'ENG', FIN: 'FRA' },
    champion: 'FRA',
    runnerUp: 'ENG',
    thirdPlace: 'BEL',
  },
  {
    username: 'wcseed06',
    fullName: 'World Cup Seed 06',
    password: 'Wc2026!Seed06',
    supportingCountry: 'BEL',
    picks: { 'QF-1': 'MAR', 'QF-2': 'BEL', 'QF-3': 'NOR', 'QF-4': 'ARG', 'SF-1': 'BEL', 'SF-2': 'ARG', FIN: 'ARG' },
    champion: 'ARG',
    runnerUp: 'BEL',
    thirdPlace: 'NOR',
  },
  {
    username: 'wcseed07',
    fullName: 'World Cup Seed 07',
    password: 'Wc2026!Seed07',
    supportingCountry: 'ENG',
    picks: { 'QF-1': 'MAR', 'QF-2': 'ESP', 'QF-3': 'ENG', 'QF-4': 'ARG', 'SF-1': 'MAR', 'SF-2': 'ARG', FIN: 'ARG' },
    champion: 'ARG',
    runnerUp: 'MAR',
    thirdPlace: 'ESP',
  },
  {
    username: 'wcseed08',
    fullName: 'World Cup Seed 08',
    password: 'Wc2026!Seed08',
    supportingCountry: 'SUI',
    picks: { 'QF-1': 'FRA', 'QF-2': 'ESP', 'QF-3': 'NOR', 'QF-4': 'SUI', 'SF-1': 'ESP', 'SF-2': 'SUI', FIN: 'ESP' },
    champion: 'ESP',
    runnerUp: 'SUI',
    thirdPlace: 'NOR',
  },
  {
    username: 'wcseed09',
    fullName: 'World Cup Seed 09',
    password: 'Wc2026!Seed09',
    supportingCountry: 'MAR',
    picks: { 'QF-1': 'MAR', 'QF-2': 'ESP', 'QF-3': 'ENG', 'QF-4': 'ARG', 'SF-1': 'ESP', 'SF-2': 'ARG', FIN: 'ARG' },
    champion: 'ARG',
    runnerUp: 'ESP',
    thirdPlace: 'MAR',
  },
  {
    username: 'wcseed10',
    fullName: 'World Cup Seed 10',
    password: 'Wc2026!Seed10',
    supportingCountry: 'ARG',
    picks: { 'QF-1': 'MAR', 'QF-2': 'BEL', 'QF-3': 'NOR', 'QF-4': 'ARG', 'SF-1': 'MAR', 'SF-2': 'ARG', FIN: 'ARG' },
    champion: 'ARG',
    runnerUp: 'MAR',
    thirdPlace: 'NOR',
  },
];

function pointsForUser(user) {
  const matchScore = Object.entries(user.picks).reduce((total, [code, pick]) => {
    return total + (actualWinners[code] === pick ? matchPoints[code] : 0);
  }, 0);
  const championScore = user.champion === actualChampion ? 6 : 0;
  const runnerUpScore = user.runnerUp === actualRunnerUp ? 5 : 0;
  const thirdPlaceScore = user.thirdPlace === actualThirdPlace ? 4 : 0;
  return {
    matchScore,
    championScore,
    runnerUpScore,
    thirdPlaceScore,
    total: matchScore + championScore + runnerUpScore + thirdPlaceScore,
  };
}

async function getSessionClient(username, password) {
  const client = createClient(supabaseUrl, supabaseAnonKey);
  const email = `${username}@wc2026.local`;

  const signUpResult = await client.auth.signUp({ email, password });
  if (signUpResult.error && !/already|registered|exists/i.test(signUpResult.error.message)) {
    throw new Error(`${username} signup failed: ${signUpResult.error.message}`);
  }

  const signInResult = await client.auth.signInWithPassword({ email, password });
  if (signInResult.error) {
    throw new Error(`${username} signin failed: ${signInResult.error.message}`);
  }

  return { client, authUser: signInResult.data.user };
}

async function main() {
  const readClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: matches, error: matchError } = await readClient
    .from('matches')
    .select('id, match_code')
    .in('match_code', Object.keys(actualWinners));

  if (matchError) throw matchError;

  const matchByCode = new Map((matches ?? []).map((match) => [match.match_code, match]));
  const missing = Object.keys(actualWinners).filter((code) => !matchByCode.has(code));
  if (missing.length) {
    throw new Error(`Missing matches in Supabase: ${missing.join(', ')}`);
  }

  const created = [];

  for (const seededUser of seededUsers) {
    const { client, authUser } = await getSessionClient(seededUser.username, seededUser.password);
    if (!authUser?.id) throw new Error(`No auth user id for ${seededUser.username}`);

    const { error: profileError } = await client.from('users').upsert({
      id: authUser.id,
      full_name: seededUser.fullName,
      username: seededUser.username,
      supporting_country: seededUser.supportingCountry,
    }, { onConflict: 'id' });
    if (profileError) throw new Error(`${seededUser.username} profile failed: ${profileError.message}`);

    const predictionRows = Object.entries(seededUser.picks).map(([matchCode, winnerId]) => ({
      user_id: authUser.id,
      match_id: matchByCode.get(matchCode).id,
      predicted_winner_id: winnerId,
      is_submitted: true,
    }));

    const { error: predictionError } = await client
      .from('predictions')
      .upsert(predictionRows, { onConflict: 'user_id,match_id' });
    if (predictionError) throw new Error(`${seededUser.username} predictions failed: ${predictionError.message}`);

    const { error: tournamentError } = await client.from('tournament_predictions').upsert({
      user_id: authUser.id,
      predicted_champion: seededUser.champion,
      predicted_runner_up: seededUser.runnerUp,
      predicted_third_place: seededUser.thirdPlace,
      is_locked: true,
    }, { onConflict: 'user_id' });
    if (tournamentError) throw new Error(`${seededUser.username} tournament failed: ${tournamentError.message}`);

    const { data: existingScores, error: existingScoreError } = await client
      .from('scores')
      .select('id,score_type')
      .eq('user_id', authUser.id)
      .is('match_id', null);
    if (existingScoreError) throw new Error(`${seededUser.username} score lookup failed: ${existingScoreError.message}`);

    const scoreSummary = pointsForUser(seededUser);
    const hasChampionScore = existingScores?.some((score) => score.score_type === 'champion');
    const hasRunnerUpScore = existingScores?.some((score) => score.score_type === 'runner_up');
    const hasThirdPlaceScore = existingScores?.some((score) => score.score_type === 'third_place');

    const { data: existingMatchScores, error: existingMatchScoreError } = await client
      .from('scores')
      .select('id')
      .eq('user_id', authUser.id)
      .not('match_id', 'is', null)
      .limit(1);
    if (existingMatchScoreError) throw new Error(`${seededUser.username} match score lookup failed: ${existingMatchScoreError.message}`);

    if (!existingMatchScores?.length) {
      const matchScoreRows = Object.entries(seededUser.picks).map(([matchCode, winnerId]) => ({
        user_id: authUser.id,
        match_id: matchByCode.get(matchCode).id,
        points_earned: actualWinners[matchCode] === winnerId ? matchPoints[matchCode] : 0,
        score_type: 'match',
      }));

      const { error: scoreError } = await client.from('scores').insert(matchScoreRows);
      if (scoreError) throw new Error(`${seededUser.username} scores failed: ${scoreError.message}`);
    }

    const missingBonusScoreRows = [
      !hasChampionScore && { user_id: authUser.id, points_earned: scoreSummary.championScore, score_type: 'champion' },
      !hasRunnerUpScore && { user_id: authUser.id, points_earned: scoreSummary.runnerUpScore, score_type: 'runner_up' },
      !hasThirdPlaceScore && { user_id: authUser.id, points_earned: scoreSummary.thirdPlaceScore, score_type: 'third_place' },
    ].filter(Boolean);

    if (missingBonusScoreRows.length) {
      const { error: bonusScoreError } = await client.from('scores').insert(missingBonusScoreRows);
      if (bonusScoreError) throw new Error(`${seededUser.username} bonus scores failed: ${bonusScoreError.message}`);
    }

    created.push({
      id: authUser.id,
      username: seededUser.username,
      password: seededUser.password,
      total_points: scoreSummary.total,
    });

    await client.auth.signOut();
  }

  const { client: leaderboardClient } = await getSessionClient(seededUsers[0].username, seededUsers[0].password);
  const { data: users } = await leaderboardClient.from('users').select('id, username, full_name, supporting_country');
  const { data: scores } = await leaderboardClient.from('scores').select('user_id, points_earned');
  const totals = new Map();
  (scores ?? []).forEach((score) => {
    totals.set(score.user_id, (totals.get(score.user_id) ?? 0) + score.points_earned);
  });

  const leaderboard = (users ?? [])
    .map((user) => ({
      username: user.username,
      full_name: user.full_name,
      supporting_country: user.supporting_country,
      total_points: totals.get(user.id) ?? 0,
    }))
    .sort((a, b) => b.total_points - a.total_points)
    .map((entry, index) => ({ rank: index + 1, ...entry }));

  console.log(JSON.stringify({ created, leaderboard }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
