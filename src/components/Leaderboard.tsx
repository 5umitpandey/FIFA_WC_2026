import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Trophy, Medal, Award, X, ChevronRight, Flag } from 'lucide-react';

const FLAG_CODE_MAP: Record<string, string> = {
  'ARG': 'ar', 'BRA': 'br', 'FRA': 'fr', 'ENG': 'gb-eng', 'GER': 'de',
  'ESP': 'es', 'POR': 'pt', 'NED': 'nl', 'BEL': 'be', 'CRO': 'hr',
  'URU': 'uy', 'COL': 'co', 'MEX': 'mx', 'USA': 'us', 'CAN': 'ca',
  'JPN': 'jp', 'KOR': 'kr', 'MAR': 'ma', 'NOR': 'no', 'SEN': 'sn',
  'NGA': 'ng', 'SUI': 'ch',
};

function getFlagCode(code: string): string {
  return FLAG_CODE_MAP[code] || code.toLowerCase();
}

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  username: string;
  supporting_country: string;
  total_points: number;
  rank: number;
}

const ROUND_LABELS: Record<string, string> = {
  round_of_16: 'Round of 16',
  quarter_final: 'Quarter Finals',
  semi_final: 'Semi Finals',
  third_place: 'Third Place',
  final: 'Final',
};

const FIXTURE_NAME_FALLBACKS: Record<string, [string, string]> = {
  'QF-1': ['France', 'Morocco'],
  'QF-2': ['Spain', 'Belgium'],
  'QF-3': ['Norway', 'England'],
  'QF-4': ['Argentina', 'Switzerland'],
  'SF-1': ['Morocco', 'Spain'],
  'SF-2': ['Norway', 'Argentina'],
  FIN: ['Spain', 'Argentina'],
  TP: ['Morocco', 'Norway'],
};

export function Leaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<LeaderboardEntry | null>(null);
  const [breakdown, setBreakdown] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data: users } = await supabase.from('users').select('id, full_name, username, supporting_country');
      const { data: scores } = await supabase.from('scores').select('user_id, points_earned');

      if (!mounted || !users) return;

      const totals = new Map<string, number>();
      scores?.forEach((s) => totals.set(s.user_id, (totals.get(s.user_id) ?? 0) + s.points_earned));

      const sorted = users
        .map((u) => ({
          user_id: u.id,
          full_name: u.full_name,
          username: u.username,
          supporting_country: u.supporting_country,
          total_points: totals.get(u.id) ?? 0,
          rank: 0,
        }))
        .sort((a, b) => b.total_points - a.total_points);

      let currentRank = 1;
      const leaderboard = sorted.map((e, idx) => {
        if (idx > 0 && e.total_points < sorted[idx - 1].total_points) {
          currentRank = idx + 1;
        }
        return { ...e, rank: currentRank };
      });

      setEntries(leaderboard);
      setLoading(false);
    }

    load();
    return () => { mounted = false; };
  }, []);

  const handlePointsClick = useCallback(async (entry: LeaderboardEntry) => {
    setSelectedUser(entry);

    const { data: scores } = await supabase
      .from('scores')
      .select('match_id, points_earned, score_type')
      .eq('user_id', entry.user_id);

    const { data: preds } = await supabase
      .from('predictions')
      .select('match_id, predicted_winner_id, predicted_winner:teams(id, name), match:matches(round, match_code, team1:teams!matches_team1_id_fkey(id, name), team2:teams!matches_team2_id_fkey(id, name), winner:teams!matches_winner_id_fkey(id, name))')
      .eq('user_id', entry.user_id);

    const { data: tp } = await supabase
      .from('tournament_predictions')
      .select('predicted_champion, predicted_runner_up, predicted_third_place, champion:teams!tournament_predictions_predicted_champion_fkey(id, name), runner_up:teams!tournament_predictions_predicted_runner_up_fkey(id, name), third_place:teams!tournament_predictions_predicted_third_place_fkey(id, name)')
      .eq('user_id', entry.user_id)
      .maybeSingle();

    const { data: teams } = await supabase
      .from('teams')
      .select('id, name');

    const { data: finalMatch } = await supabase
      .from('matches')
      .select('winner_id, team1_id, team2_id, winner:teams!matches_winner_id_fkey(name)')
      .eq('round', 'final')
      .maybeSingle();

    const { data: tpMatch } = await supabase
      .from('matches')
      .select('winner_id, winner:teams!matches_winner_id_fkey(name)')
      .eq('round', 'third_place')
      .maybeSingle();

    let runnerUpActual: string | null = null;
    if (finalMatch?.winner_id && finalMatch.team1_id && finalMatch.team2_id) {
      const runnerUpId = finalMatch.winner_id === finalMatch.team1_id ? finalMatch.team2_id : finalMatch.team1_id;
      runnerUpActual = (await supabase.from('teams').select('name').eq('id', runnerUpId).maybeSingle()).data?.name ?? null;
    }

    const getTeamName = (teamField: any): string | null => {
      if (!teamField) return null;
      if (Array.isArray(teamField)) return teamField[0]?.name ?? null;
      return teamField?.name ?? null;
    };

    const teamNameById = new Map((teams || []).map((team) => [team.id, team.name]));
    const bonusPoints = (scoreType: string) => scores?.find((s) => s.score_type === scoreType && !s.match_id)?.points_earned ?? 0;

    const matchScores = (preds || []).map((p: any) => {
      const score = scores?.find((s) => s.match_id === p.match_id);
      const m = p.match || {};
      const fallbackFixture = FIXTURE_NAME_FALLBACKS[m.match_code] || ['TBD', 'TBD'];
      const winnerName = getTeamName(m.winner);
      const predictedName = getTeamName(p.predicted_winner);

      return {
        round: m.round,
        match_code: m.match_code,
        team1: getTeamName(m.team1) || fallbackFixture[0],
        team2: getTeamName(m.team2) || fallbackFixture[1],
        predicted: predictedName,
        actual: winnerName,
        points: score?.points_earned ?? 0,
        correct: p.predicted_winner_id === m.winner_id,
      };
    }).sort((a, b) => {
      const order = ['round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final'];
      return order.indexOf(a.round) - order.indexOf(b.round);
    });

    const finalMatchData = finalMatch as any;
    const tpMatchData = tpMatch as any;

    setBreakdown({
      match_scores: matchScores,
      champion: tp ? {
        predicted: getTeamName((tp as any).champion) || teamNameById.get(tp.predicted_champion) || tp.predicted_champion || null,
        actual: getTeamName(finalMatchData?.winner),
        points: bonusPoints('champion'),
      } : null,
      runner_up: tp ? {
        predicted: getTeamName((tp as any).runner_up) || teamNameById.get(tp.predicted_runner_up) || tp.predicted_runner_up || null,
        actual: runnerUpActual,
        points: bonusPoints('runner_up'),
      } : null,
      third_place: tp ? {
        predicted: getTeamName((tp as any).third_place) || teamNameById.get(tp.predicted_third_place) || tp.predicted_third_place || null,
        actual: getTeamName(tpMatchData?.winner),
        points: bonusPoints('third_place'),
      } : null,
      total_points: entry.total_points,
    });
  }, []);

  if (loading) {
    return (
      <div className="glass-card rounded-xl p-6">
        <div className="h-8 bg-white/10 rounded w-1/4 mb-6 animate-pulse"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-white/10 rounded animate-pulse"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <Trophy className="w-6 h-6 text-fifa-gold" />
        Leaderboard
      </h2>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Rank</th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase">User</th>
              <th className="px-4 py-4 text-right text-xs font-semibold text-gray-400 uppercase">Points</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const isCurrentUser = user?.id === entry.user_id;
              return (
                <tr key={entry.user_id} className={`border-b border-white/5 last:border-0 ${isCurrentUser ? 'bg-fifa-gold/10' : ''} hover:bg-white/5`}>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {entry.rank === 1 && <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 flex items-center justify-center"><Trophy className="w-4 h-4 text-fifa-darker" /></div>}
                      {entry.rank === 2 && <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center"><Medal className="w-4 h-4 text-fifa-darker" /></div>}
                      {entry.rank === 3 && <div className="w-8 h-8 rounded-full bg-amber-700 flex items-center justify-center"><Award className="w-4 h-4 text-white" /></div>}
                      {entry.rank > 3 && <span className="w-8 h-8 flex items-center justify-center text-gray-400 font-medium">{entry.rank}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {entry.supporting_country && (
                        <img
                          src={`https://flagcdn.com/w40/${getFlagCode(entry.supporting_country)}.png`}
                          alt={entry.supporting_country}
                          className="w-6 h-4 object-cover rounded"
                          loading="lazy"
                        />
                      )}
                      <div>
                        <p className="text-white font-medium">
                          {/^test/i.test(entry.username) ? '🤖' : '🧑'} {entry.full_name}
                        </p>
                        <p className="text-gray-500 text-sm">@{entry.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button onClick={() => handlePointsClick(entry)} className="text-fifa-gold font-bold text-lg hover:underline inline-flex items-center gap-1 group">
                      {entry.total_points}
                      <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Flag className="w-5 h-5 text-fifa-gold" />
          Scoring Rules
        </h3>
        <ul className="space-y-2 text-gray-300">
          <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span>Correct knockout match = <span className="text-fifa-gold font-semibold">3 pts</span></li>
          <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-500"></span>Correct Champion = <span className="text-fifa-gold font-semibold">6 pts</span></li>
          <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-gray-400"></span>Correct Runner Up = <span className="text-fifa-gold font-semibold">5 pts</span></li>
          <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-600"></span>Correct Third Place = <span className="text-fifa-gold font-semibold">4 pts</span></li>
          <li className="flex items-center gap-2 text-gray-400 text-sm mt-4"><span className="w-2 h-2 rounded-full bg-transparent border border-gray-500"></span>No negative points</li>
        </ul>
      </div>

      {selectedUser && breakdown && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="glass-card rounded-xl p-6 max-w-lg w-full my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">{selectedUser.full_name}'s Score</h3>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {breakdown.match_scores.map((s: any, i: number) => (
                <div key={i} className={`p-3 rounded-lg border ${s.correct ? 'bg-green-500/10 border-green-500/30' : s.actual ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">{ROUND_LABELS[s.round] || s.round}</span>
                    <span className={`text-sm font-semibold ${s.correct ? 'text-green-400' : 'text-red-400'}`}>+{s.points}</span>
                  </div>
                  <p className="text-white text-sm">{s.team1} vs {s.team2}</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Pred: <span className={s.correct ? 'text-green-400' : 'text-white'}>{s.predicted || '-'}</span>
                    {s.actual && <> | Actual: <span className="text-fifa-gold">{s.actual}</span></>}
                  </p>
                </div>
              ))}

              {breakdown.champion && (
                <div className="p-3 rounded-lg border border-white/10 bg-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">1st Place / Champion</span>
                    <span className={`text-sm font-semibold ${breakdown.champion.points > 0 ? 'text-green-400' : 'text-red-400'}`}>+{breakdown.champion.points}</span>
                  </div>
                  <p className="text-gray-400 text-sm">Pred: {breakdown.champion.predicted || '-'}{breakdown.champion.actual && <> | Actual: {breakdown.champion.actual}</>}</p>
                </div>
              )}

              {breakdown.runner_up && (
                <div className="p-3 rounded-lg border border-white/10 bg-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">2nd Place / Runner Up</span>
                    <span className={`text-sm font-semibold ${breakdown.runner_up.points > 0 ? 'text-green-400' : 'text-red-400'}`}>+{breakdown.runner_up.points}</span>
                  </div>
                  <p className="text-gray-400 text-sm">Pred: {breakdown.runner_up.predicted || '-'}{breakdown.runner_up.actual && <> | Actual: {breakdown.runner_up.actual}</>}</p>
                </div>
              )}

              {breakdown.third_place && (
                <div className="p-3 rounded-lg border border-white/10 bg-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">3rd Place</span>
                    <span className={`text-sm font-semibold ${breakdown.third_place.points > 0 ? 'text-green-400' : 'text-red-400'}`}>+{breakdown.third_place.points}</span>
                  </div>
                  <p className="text-gray-400 text-sm">Pred: {breakdown.third_place.predicted || '-'}{breakdown.third_place.actual && <> | Actual: {breakdown.third_place.actual}</>}</p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-gray-400">Total Points</span>
              <span className="text-2xl font-bold text-fifa-gold">{breakdown.total_points}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
