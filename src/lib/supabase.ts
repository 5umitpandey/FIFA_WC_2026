import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type MatchRound = 'round_of_16' | 'quarter_final' | 'semi_final' | 'third_place' | 'final';
export type MatchStatus = 'scheduled' | 'live' | 'completed';
export type ScoreType = 'match' | 'champion' | 'runner_up' | 'third_place';

export interface Team {
  id: string;
  name: string;
  flag_url: string;
  group_name?: string;
  is_qualified: boolean;
}

export interface Match {
  id: string;
  match_code: string;
  round: MatchRound;
  match_number: number;
  team1_id?: string;
  team2_id?: string;
  kickoff_time?: string;
  status: MatchStatus;
  winner_id?: string;
  home_score?: number;
  away_score?: number;
  created_at: string;
  updated_at: string;
  team1?: Team;
  team2?: Team;
  winner?: Team;
}

export interface Prediction {
  id: string;
  user_id: string;
  match_id: string;
  predicted_winner_id?: string;
  is_submitted: boolean;
  created_at: string;
  updated_at: string;
  match?: Match;
  predicted_winner?: Team;
}

export interface Score {
  id: string;
  user_id: string;
  match_id?: string;
  points_earned: number;
  score_type: ScoreType;
  created_at: string;
  match?: Match;
}

export interface TournamentPrediction {
  id: string;
  user_id: string;
  predicted_champion?: string;
  predicted_runner_up?: string;
  predicted_third_place?: string;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  champion?: Team;
  runner_up?: Team;
  third_place?: Team;
}

export interface User {
  id: string;
  full_name: string;
  username: string;
  supporting_country: string;
  created_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  username: string;
  supporting_country: string;
  total_points: number;
  rank: number;
}
