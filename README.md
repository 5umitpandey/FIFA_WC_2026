# World Cup 2026 Knockout Predictions

> A FIFA World Cup-style knockout prediction game for friends, offices, fan groups, and private competitions.

World Cup 2026 Knockout Predictions is a React + Supabase web app where users sign up, choose a supporting country, predict knockout winners, lock their bracket, and compete on a live leaderboard. It is built around the drama of the knockout stage: deadline pressure, bracket progression, champion picks, third-place predictions, and a points table that updates as results come in.

## Matchday Experience

The app opens directly into the tournament experience after login:

- A glassy dark-and-gold World Cup-inspired interface.
- A live knockout bracket starting from the current active round.
- Country flags for teams and supported nations.
- Saved winner picks that advance through the user's personal bracket.
- Countdown text before prediction lock windows.
- A leaderboard with medals, ranks, user flags, and score breakdowns.
- A personal predictions panel showing rank, points, champion, runner-up, and third-place picks.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, custom glass-card theme |
| Icons | lucide-react |
| Backend | Supabase Auth, Postgres, Row Level Security |
| Server Logic | Supabase Edge Function |
| Flags | flagcdn.com image URLs |

## Core Features

### Authentication

Users create an account with:

- Full name
- Username
- Password
- Supporting country

The app uses Supabase Auth internally, but users sign in with a username. The username is mapped to a local email format:

```txt
username@wc2026.local
```

Signup validation:

- Full name is required.
- Username is required.
- Password must be at least 8 characters.
- Password confirmation must match.
- Supporting country is selected during signup.

### Knockout Bracket

The active bracket is rendered from quarter-finals onward:

| Round | Matches |
| --- | --- |
| Quarter-finals | QF-1, QF-2, QF-3, QF-4 |
| Semi-finals | SF-1, SF-2 |
| Final | FIN |

Current active quarter-final fixtures:

| Code | Fixture |
| --- | --- |
| QF-1 | France vs Morocco |
| QF-2 | Spain vs Belgium |
| QF-3 | Norway vs England |
| QF-4 | Argentina vs Switzerland |

Bracket flow:

```txt
QF-1 winner + QF-2 winner -> SF-1
QF-3 winner + QF-4 winner -> SF-2
SF-1 winner + SF-2 winner -> Final
```

When a user selects a team:

- The prediction is saved.
- The selected team advances into the next round in that user's bracket.
- The next match slot is highlighted briefly.
- Final selections also save champion and runner-up predictions.
- After choosing a champion, the app prompts for a third-place finisher.

### Prediction Locking

Prediction locking is based on match kickoff time.

Rules:

- A match is open while it is more than 1 hour away from kickoff.
- A match locks exactly 1 hour before kickoff.
- Live and completed matches are always locked.
- Submitted predictions cannot be changed.
- Once tournament predictions are locked, the user cannot keep editing their bracket.

Countdown behavior:

- More than 2 hours before kickoff: the normal match date/time is shown.
- From 2 hours before kickoff until 1 hour before kickoff: the time display changes to a live countdown.
- The countdown text is:

```txt
Predictions lock in MM:SS
```

This gives users a clear warning that the prediction window is closing.

### Lock In Predictions

The `Lock in Predictions` button appears when the user has unsent picks.

When confirmed:

- All current unsent match predictions are marked as submitted.
- Champion, runner-up, and third-place predictions are saved.
- Tournament predictions are marked as locked.
- The user can no longer edit those submitted picks.

### My Predictions Panel

Every authenticated user sees a personal summary card above the main page.

It shows:

- Supporting country
- Current rank
- Total points
- Predicted champion
- Predicted runner-up
- Predicted third place

### Leaderboard

The leaderboard ranks all users by total points.

It includes:

- Rank
- Medal-style top-three treatment
- User full name
- Username
- Supporting country flag
- Total points
- Current-user highlighting
- Clickable point totals for detailed scoring breakdowns

The score breakdown modal shows:

- Match-by-match predictions
- Predicted winner
- Actual winner, when available
- Points earned per match
- Champion points
- Third-place points
- Total score

## Full Game Rules

### Match Prediction Rules

1. Users predict one winner for each visible knockout match.
2. A prediction can be changed until it is submitted or the match lock time is reached.
3. Match picks are saved automatically when selected.
4. A selected winner advances into the next round of that user's bracket.
5. Unknown future-round teams remain `TBD` until the user predicts earlier-round winners or real match results are loaded.
6. Match predictions lock 1 hour before kickoff.
7. Live and completed matches cannot be predicted.
8. There are no negative points.

### Tournament Prediction Rules

1. The final winner becomes the predicted champion.
2. The other finalist becomes the predicted runner-up.
3. After champion selection, the user chooses a predicted third-place finisher.
4. Tournament predictions are stored separately from match predictions.
5. Tournament predictions lock when the user confirms their bracket.

### Scoring Rules

| Prediction Type | Points |
| --- | ---: |
| Correct knockout match winner | 3 |
| Correct third-place winner | 4 |
| Correct runner-up | 5 |
| Correct champion | 6 |
| Incorrect pick | 0 |

There are no penalties for wrong predictions.

Server scoring details:

- Round of 16, quarter-final, and semi-final match predictions are scored as match predictions.
- Third-place match scoring is worth 4 points.
- Final match scoring is worth 6 points in the match scoring function.
- Champion, runner-up, and third-place tournament bonuses are calculated when final and third-place results are completed.

## Data Model

The Supabase schema contains these main tables:

| Table | Purpose |
| --- | --- |
| `users` | App profile tied to Supabase Auth user |
| `teams` | Country codes, names, flags, qualification status |
| `matches` | Knockout fixtures, times, status, scores, winners |
| `predictions` | Per-user match winner predictions |
| `scores` | Points earned from matches and tournament bonuses |
| `tournament_predictions` | Champion, runner-up, third-place predictions |

Important enums:

```sql
match_round:
  round_of_16
  quarter_final
  semi_final
  third_place
  final

match_status:
  scheduled
  live
  completed

score_type:
  match
  champion
  runner_up
  third_place
```

## Security Model

Supabase Row Level Security is enabled.

Publicly readable:

- `teams`
- `matches`

Authenticated leaderboard access:

- `users`
- `scores`
- `predictions`
- `tournament_predictions`

User-owned writes:

- Users can create and update their own profile.
- Users can create and update their own predictions.
- Users can create and update their own tournament predictions.
- User data is tied to `auth.uid()`.

## Match Sync Edge Function

The Supabase Edge Function at:

```txt
supabase/functions/sync-matches/index.ts
```

supports:

- `GET` to return all matches ordered by match number.
- `POST` to update match data.

Accepted match update fields:

```ts
{
  match_code: string;
  team1_id?: string;
  team2_id?: string;
  status?: "scheduled" | "live" | "completed";
  winner_id?: string;
  home_score?: number;
  away_score?: number;
  kickoff_time?: string;
}
```

When a match is completed with a winner:

- Match prediction scores are recalculated.
- Tournament scores are recalculated if a completed match update is included.

The function uses the Supabase service role key, so deploy it only in a trusted Supabase Edge Function environment.

## Project Structure

```txt
.
├── src
│   ├── App.tsx
│   ├── components
│   │   ├── Auth.tsx
│   │   ├── Bracket.tsx
│   │   ├── Leaderboard.tsx
│   │   ├── MyPredictions.tsx
│   │   └── Navigation.tsx
│   ├── hooks
│   │   └── useAuth.tsx
│   ├── lib
│   │   └── supabase.ts
│   ├── main.tsx
│   └── index.css
├── supabase
│   ├── functions
│   │   └── sync-matches
│   │       └── index.ts
│   └── migrations
│       ├── 20260705180901_001_initial_schema.sql
│       ├── 20260705181337_002_leaderboard_function.sql
│       ├── 20260705184056_003_fix_rls_policies.sql
│       └── 20260705185032_004_correct_fixtures.sql
├── package.json
├── tailwind.config.js
└── vite.config.ts
```

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

The app will throw an error at startup if either variable is missing.

## Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Run a production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Type-check the app:

```bash
npm run typecheck
```

Lint the app:

```bash
npm run lint
```

## Supabase Setup

1. Create a Supabase project.
2. Add the environment variables to `.env`.
3. Run the SQL migrations in order from `supabase/migrations`.
4. Deploy the `sync-matches` Edge Function.
5. Configure function secrets:

```txt
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

6. Verify that `teams` and `matches` are readable before login.
7. Create a test user and submit a bracket.

## Current Fixture Migration

The latest fixture migration marks the Round of 16 as complete and sets the active quarter-final bracket:

```txt
France vs Morocco
Spain vs Belgium
Norway vs England
Argentina vs Switzerland
```

Kickoff times are stored in UTC. The frontend renders dates and times using the user's browser locale.

## Design Notes

The UI uses:

- Dark stadium-style background
- Gold accents for key actions and point totals
- Glass-card surfaces
- Flag-first team rows
- Status chips for open, locked, live, and completed matches
- Medal treatments for top-three leaderboard ranks
- Compact bracket cards optimized for scanning

## Deployment Notes

This is a Vite single-page app and can be deployed to:

- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages with suitable routing configuration
- Any static hosting service

Required deployment variables:

```txt
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

The Supabase Edge Function is deployed separately through Supabase.

## Roadmap Ideas

- Admin dashboard for match updates
- Tie-breaker rules for leaderboard ranking
- Shareable bracket images
- Group leagues
- Live result polling
- Email or push reminders before lock windows
- Audit log for changed match results

## License

This project is currently private and does not declare an open-source license. Add a license file before publishing publicly if you want others to reuse or modify it.
