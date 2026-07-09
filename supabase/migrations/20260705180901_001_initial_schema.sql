/*
# FIFA World Cup 2026 Knockout Prediction Schema

## Overview
This schema creates a complete database structure for a World Cup knockout prediction game.
Users can predict match winners, track scores, and compete on a leaderboard.

## Tables Created

### 1. users
- `id` (uuid, primary key, references auth.users)
- `full_name` (text, not null)
- `username` (text, unique, not null)
- `supporting_country` (text, not null) - FIFA country code
- `created_at` (timestamp)

### 2. teams
- `id` (text, primary key) - FIFA country code
- `name` (text, not null)
- `flag_url` (text, not null)
- `group` (text) - Group stage group
- `is_qualified` (boolean) - Whether team has qualified for knockout

### 3. matches
- `id` (uuid, primary key)
- `match_code` (text, unique, not null) - FIFA match code
- `round` (enum: round_of_16, quarter_final, semi_final, third_place, final)
- `match_number` (integer) - Position in that round
- `team1_id` (text, references teams) - Can be NULL until team is determined
- `team2_id` (text, references teams)
- `kickoff_time` (timestamptz)
- `status` (enum: scheduled, live, completed)
- `winner_id` (text, references teams) - Set when match completes
- `home_score` (integer)
- `away_score` (integer)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### 4. predictions
- `id` (uuid, primary key)
- `user_id` (uuid, references users)
- `match_id` (uuid, references matches)
- `predicted_winner_id` (text, references teams)
- `is_submitted` (boolean) - Whether prediction is locked
- `created_at` (timestamp)
- `updated_at` (timestamp)

### 5. scores
- `id` (uuid, primary key)
- `user_id` (uuid, references users)
- `match_id` (uuid, references matches)
- `points_earned` (integer)
- `score_type` (enum: match, champion, runner_up, third_place)
- `created_at` (timestamp)

### 6. tournament_predictions
- `id` (uuid, primary key)
- `user_id` (uuid, references users, unique)
- `predicted_champion` (text, references teams)
- `predicted_runner_up` (text, references teams)
- `predicted_third_place` (text, references teams)
- `is_locked` (boolean) - Whether all predictions are submitted
- `created_at` (timestamp)

## Security
- RLS enabled on all tables
- Owner-scoped policies for users, predictions, scores, tournament_predictions
- Read-only access for teams and matches (authenticated)
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE match_round AS ENUM ('round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final');
CREATE TYPE match_status AS ENUM ('scheduled', 'live', 'completed');
CREATE TYPE score_type AS ENUM ('match', 'champion', 'runner_up', 'third_place');

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text NOT NULL,
    username text UNIQUE NOT NULL,
    supporting_country text NOT NULL,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own" ON users;
CREATE POLICY "users_select_own" ON users FOR SELECT
    TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_insert_own" ON users;
CREATE POLICY "users_insert_own" ON users FOR INSERT
    TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users FOR UPDATE
    TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    id text PRIMARY KEY,
    name text NOT NULL,
    flag_url text NOT NULL,
    group_name text,
    is_qualified boolean DEFAULT false
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teams_read_all" ON teams;
CREATE POLICY "teams_read_all" ON teams FOR SELECT
    TO authenticated USING (true);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    match_code text UNIQUE NOT NULL,
    round match_round NOT NULL,
    match_number integer NOT NULL,
    team1_id text REFERENCES teams(id),
    team2_id text REFERENCES teams(id),
    kickoff_time timestamptz,
    status match_status NOT NULL DEFAULT 'scheduled',
    winner_id text REFERENCES teams(id),
    home_score integer,
    away_score integer,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "matches_read_all" ON matches;
CREATE POLICY "matches_read_all" ON matches FOR SELECT
    TO authenticated USING (true);

-- Predictions table
CREATE TABLE IF NOT EXISTS predictions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES users(id) ON DELETE CASCADE,
    match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    predicted_winner_id text REFERENCES teams(id),
    is_submitted boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, match_id)
);

ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "predictions_select_own" ON predictions;
CREATE POLICY "predictions_select_own" ON predictions FOR SELECT
    TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "predictions_insert_own" ON predictions;
CREATE POLICY "predictions_insert_own" ON predictions FOR INSERT
    TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "predictions_update_own" ON predictions;
CREATE POLICY "predictions_update_own" ON predictions FOR UPDATE
    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Scores table
CREATE TABLE IF NOT EXISTS scores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES users(id) ON DELETE CASCADE,
    match_id uuid REFERENCES matches(id) ON DELETE CASCADE,
    points_earned integer NOT NULL DEFAULT 0,
    score_type score_type NOT NULL DEFAULT 'match',
    created_at timestamptz DEFAULT now()
);

ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scores_select_own" ON scores;
CREATE POLICY "scores_select_own" ON scores FOR SELECT
    TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "scores_insert_own" ON scores;
CREATE POLICY "scores_insert_own" ON scores FOR INSERT
    TO authenticated WITH CHECK (auth.uid() = user_id);

-- Tournament predictions (champion, runner-up, third place)
CREATE TABLE IF NOT EXISTS tournament_predictions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    predicted_champion text REFERENCES teams(id),
    predicted_runner_up text REFERENCES teams(id),
    predicted_third_place text REFERENCES teams(id),
    is_locked boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE tournament_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tournament_predictions_select_own" ON tournament_predictions;
CREATE POLICY "tournament_predictions_select_own" ON tournament_predictions FOR SELECT
    TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "tournament_predictions_insert_own" ON tournament_predictions;
CREATE POLICY "tournament_predictions_insert_own" ON tournament_predictions FOR INSERT
    TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tournament_predictions_update_own" ON tournament_predictions;
CREATE POLICY "tournament_predictions_update_own" ON tournament_predictions FOR UPDATE
    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_matches_round ON matches(round);
CREATE INDEX IF NOT EXISTS idx_matches_kickoff ON matches(kickoff_time);
CREATE INDEX IF NOT EXISTS idx_predictions_user ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match ON predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_scores_user ON scores(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_predictions_user ON tournament_predictions(user_id);
