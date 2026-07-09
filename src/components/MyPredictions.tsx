import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase, Team } from '../lib/supabase';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';

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

interface TournamentPrediction {
  predicted_champion?: string;
  predicted_runner_up?: string;
  predicted_third_place?: string;
  champion?: Team;
  runner_up?: Team;
  third_place?: Team;
}

export function MyPredictions() {
  const { user } = useAuth();
  const [tp, setTp] = useState<TournamentPrediction | null>(null);
  const [total, setTotal] = useState(0);
  const [rank, setRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const userId = user.id;
    let mounted = true;

    async function load() {
      const [tpRes, scoresRes] = await Promise.all([
        supabase
          .from('tournament_predictions')
          .select(`predicted_champion, predicted_runner_up, predicted_third_place, champion:teams!tournament_predictions_predicted_champion_fkey(id, name, flag_url), runner_up:teams!tournament_predictions_predicted_runner_up_fkey(id, name, flag_url), third_place:teams!tournament_predictions_predicted_third_place_fkey(id, name, flag_url)`)
          .eq('user_id', userId)
          .maybeSingle(),
        supabase.from('scores').select('points_earned').eq('user_id', userId),
      ]);

      if (!mounted) return;

      if (tpRes.data) {
        const rawTp = tpRes.data as unknown as TournamentPrediction;
        setTp({
          ...rawTp,
          champion: Array.isArray(rawTp.champion) ? rawTp.champion[0] : rawTp.champion,
          runner_up: Array.isArray(rawTp.runner_up) ? rawTp.runner_up[0] : rawTp.runner_up,
          third_place: Array.isArray(rawTp.third_place) ? rawTp.third_place[0] : rawTp.third_place,
        });
      }

      const sum = scoresRes.data?.reduce((acc, s) => acc + s.points_earned, 0) ?? 0;
      setTotal(sum);

      // Calculate rank
      const { data: allUsers } = await supabase.from('scores').select('user_id, points_earned');
      if (allUsers && mounted) {
        const userTotals = new Map<string, number>();
        allUsers.forEach((s) => {
          userTotals.set(s.user_id, (userTotals.get(s.user_id) ?? 0) + s.points_earned);
        });
        const sorted = [...userTotals.entries()].sort((a, b) => b[1] - a[1]);
        const r = sorted.findIndex(([id]) => id === userId) + 1;
        setRank(r > 0 ? r : null);
      }

      setLoading(false);
    }

    load();
    return () => { mounted = false; };
  }, [user]);

  if (loading) {
    return (
      <div className="glass-card rounded-xl p-6">
        <div className="h-6 bg-white/10 rounded w-1/3 mb-4 animate-pulse"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-white/10 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-fifa-gold" />
        My Predictions
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 rounded-lg p-4 text-center">
          <div className="text-gray-400 text-sm mb-2">Supporting</div>
          {user?.supporting_country && (
            <>
              <img
                src={`https://flagcdn.com/w80/${getFlagCode(user.supporting_country)}.png`}
                alt={user.supporting_country}
                className="w-10 h-7 object-cover rounded shadow-lg mx-auto mb-2"
                loading="lazy"
              />
              <span className="text-white font-medium text-sm">{user.supporting_country}</span>
            </>
          )}
        </div>
        <div className="bg-white/5 rounded-lg p-4 text-center">
          <div className="text-gray-400 text-sm mb-2">Rank</div>
          <div className="text-2xl font-bold text-white flex items-center justify-center gap-1">
            <TrendingUp className="w-5 h-5 text-fifa-gold" />
            {rank ? `#${rank}` : '-'}
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-4 text-center">
          <div className="text-gray-400 text-sm mb-2">Points</div>
          <div className="text-2xl font-bold text-fifa-gold">{total}</div>
        </div>
        <div className="bg-white/5 rounded-lg p-4 text-center">
          <div className="text-gray-400 text-sm mb-2">Predicted Champion</div>
          {tp?.champion ? (
            <>
              <img src={tp.champion.flag_url} alt={tp.champion.name} className="w-10 h-7 object-cover rounded shadow mx-auto mb-1" loading="lazy" />
              <span className="text-white font-medium text-sm">{tp.champion.name}</span>
            </>
          ) : tp?.predicted_champion ? (
            <span className="text-gray-400 text-sm">{tp.predicted_champion}</span>
          ) : (
            <span className="text-gray-500 text-sm">Not predicted</span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="bg-white/5 rounded-lg p-4 text-center">
          <div className="text-gray-400 text-sm mb-2 flex items-center justify-center gap-1">
            <Medal className="w-4 h-4" /> Runner Up
          </div>
          {tp?.runner_up ? (
            <div className="flex items-center justify-center gap-2">
              <img src={tp.runner_up.flag_url} alt={tp.runner_up.name} className="w-6 h-4 object-cover rounded" loading="lazy" />
              <span className="text-white font-medium text-sm">{tp.runner_up.name}</span>
            </div>
          ) : (
            <span className="text-gray-500 text-sm">Not predicted</span>
          )}
        </div>
        <div className="bg-white/5 rounded-lg p-4 text-center">
          <div className="text-gray-400 text-sm mb-2 flex items-center justify-center gap-1">
            <Award className="w-4 h-4" /> Third Place
          </div>
          {tp?.third_place ? (
            <div className="flex items-center justify-center gap-2">
              <img src={tp.third_place.flag_url} alt={tp.third_place.name} className="w-6 h-4 object-cover rounded" loading="lazy" />
              <span className="text-white font-medium text-sm">{tp.third_place.name}</span>
            </div>
          ) : (
            <span className="text-gray-500 text-sm">Not predicted</span>
          )}
        </div>
      </div>
    </div>
  );
}
