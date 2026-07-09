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

const response = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/sync-matches`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
    apikey: env.VITE_SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    matches: [
      { match_code: 'QF-1', team1_id: 'FRA', team2_id: 'MAR', status: 'completed', winner_id: 'MAR' },
      { match_code: 'QF-2', team1_id: 'ESP', team2_id: 'BEL', status: 'completed', winner_id: 'ESP' },
      { match_code: 'QF-3', team1_id: 'NOR', team2_id: 'ENG', status: 'completed', winner_id: 'NOR' },
      { match_code: 'QF-4', team1_id: 'ARG', team2_id: 'SUI', status: 'completed', winner_id: 'ARG' },
      { match_code: 'SF-1', team1_id: 'MAR', team2_id: 'ESP', status: 'completed', winner_id: 'ESP' },
      { match_code: 'SF-2', team1_id: 'NOR', team2_id: 'ARG', status: 'completed', winner_id: 'ARG' },
      { match_code: 'FIN', team1_id: 'ESP', team2_id: 'ARG', status: 'completed', winner_id: 'ARG' },
      { match_code: 'TP', team1_id: 'MAR', team2_id: 'NOR', status: 'completed', winner_id: 'NOR' },
    ],
  }),
});

const text = await response.text();
console.log(text);

if (!response.ok) {
  process.exit(1);
}
