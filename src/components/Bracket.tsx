import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, Team, Prediction } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Clock, Check, X, AlertTriangle, Lock } from 'lucide-react';

// --- Layout Constants ---
const SLOT_H = 170; // px height per quarter-final slot
const MATCH_W = 256; // px width of match card
const CONN_W = 44;   // px width of connector between rounds
const PREDICTION_LOCK_MS = 60 * 60 * 1000;
const LOCK_COUNTDOWN_WINDOW_MS = 2 * 60 * 60 * 1000;

// --- Bracket Tree (quarter-final onward) ---
// Round of 16 is complete, so the active bracket starts at the quarter-finals.
const QF_PAIRS = [
  { m1: 'QF-1', m2: 'QF-2', next: 'SF-1' },
  { m1: 'QF-3', m2: 'QF-4', next: 'SF-2' },
];

// Source mapping: which matches feed each TBD slot
const SOURCE_MAP: Record<string, [string, string]> = {
  'SF-1': ['QF-1', 'QF-2'],
  'SF-2': ['QF-3', 'QF-4'],
  'FIN':  ['SF-1', 'SF-2'],
  'TP':   ['SF-1', 'SF-2'],
};

const ACTIVE_QF_FIXTURES: Record<string, [string, string]> = {
  'QF-1': ['FRA', 'MAR'],
  'QF-2': ['ESP', 'BEL'],
  'QF-3': ['NOR', 'ENG'],
  'QF-4': ['ARG', 'SUI'],
};

const KNOWN_TEAMS: Record<string, Team> = {
  ARG: { id: 'ARG', name: 'Argentina', flag_url: 'https://flagcdn.com/w80/ar.png', is_qualified: true },
  BEL: { id: 'BEL', name: 'Belgium', flag_url: 'https://flagcdn.com/w80/be.png', is_qualified: true },
  ENG: { id: 'ENG', name: 'England', flag_url: 'https://flagcdn.com/w80/gb-eng.png', is_qualified: true },
  ESP: { id: 'ESP', name: 'Spain', flag_url: 'https://flagcdn.com/w80/es.png', is_qualified: true },
  FRA: { id: 'FRA', name: 'France', flag_url: 'https://flagcdn.com/w80/fr.png', is_qualified: true },
  MAR: { id: 'MAR', name: 'Morocco', flag_url: 'https://flagcdn.com/w80/ma.png', is_qualified: true },
  NOR: { id: 'NOR', name: 'Norway', flag_url: 'https://flagcdn.com/w80/no.png', is_qualified: true },
  SUI: { id: 'SUI', name: 'Switzerland', flag_url: 'https://flagcdn.com/w80/ch.png', is_qualified: true },
};

interface MatchWithDetails {
  id: string;
  match_code: string;
  round: string;
  match_number: number;
  team1_id?: string;
  team2_id?: string;
  kickoff_time?: string;
  status: string;
  winner_id?: string;
  home_score?: number;
  away_score?: number;
  created_at: string;
  updated_at: string;
  team1?: Team;
  team2?: Team;
  winner?: Team;
}

function hydrateActiveQuarterFinals(matchMap: Map<string, MatchWithDetails>) {
  const next = new Map(matchMap);
  const teams = new Map<string, Team>(Object.entries(KNOWN_TEAMS));

  next.forEach((match) => {
    [match.team1, match.team2, match.winner].forEach((team) => {
      if (team) teams.set(team.id, team);
    });
  });

  Object.entries(ACTIVE_QF_FIXTURES).forEach(([matchCode, [team1Id, team2Id]]) => {
    const match = next.get(matchCode);
    const team1 = teams.get(team1Id);
    const team2 = teams.get(team2Id);
    if (!match || !team1 || !team2) return;

    next.set(matchCode, {
      ...match,
      team1_id: team1.id,
      team2_id: team2.id,
      team1,
      team2,
      status: match.status === 'completed' || match.status === 'live' ? match.status : 'scheduled',
      winner_id: match.status === 'completed' ? match.winner_id : undefined,
      winner: match.status === 'completed' ? match.winner : undefined,
      home_score: match.status === 'completed' ? match.home_score : undefined,
      away_score: match.status === 'completed' ? match.away_score : undefined,
    });
  });

  return next;
}

export function Bracket() {
  const { user } = useAuth();
  const [matchMap, setMatchMap] = useState<Map<string, MatchWithDetails>>(new Map());
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [scores, setScores] = useState<Map<string, number>>(new Map());
  const [lockedSubs, setLockedSubs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingTeam, setPendingTeam] = useState<{ matchId: string; teamId: string } | null>(null);
  const [highlightedMatchCode, setHighlightedMatchCode] = useState<string | null>(null);
  const [thirdPlacePromptOpen, setThirdPlacePromptOpen] = useState(false);
  const [tournamentDraft, setTournamentDraft] = useState<{ championId?: string | null; runnerUpId?: string | null; thirdPlaceId?: string | null }>({});
  const [now, setNow] = useState(() => Date.now());

  const getNextMatchCode = useCallback((matchCode: string): string | null => {
    const match = Object.entries(SOURCE_MAP).find(([, sources]) => sources.includes(matchCode));
    return match?.[0] ?? null;
  }, []);

  const getSlotInNextMatch = useCallback((matchCode: string, nextMatchCode: string): 1 | 2 | null => {
    const sources = SOURCE_MAP[nextMatchCode];
    if (!sources) return null;
    return sources[0] === matchCode ? 1 : sources[1] === matchCode ? 2 : null;
  }, []);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .select('id, match_code, round, match_number, team1_id, team2_id, kickoff_time, status, winner_id, home_score, away_score, created_at, updated_at, team1:teams!matches_team1_id_fkey(id,name,flag_url), team2:teams!matches_team2_id_fkey(id,name,flag_url), winner:teams!matches_winner_id_fkey(id,name,flag_url)')
          .order('match_number', { ascending: true });

        if (!mounted) return;
        if (matchError) {
          console.error('Failed to load matches', matchError);
        }

        const m = new Map<string, MatchWithDetails>();
        let hydratedMatchMap = m;
        if (matchData) {
          const matches = (matchData as unknown as MatchWithDetails[]);
          matches.forEach((match) => m.set(match.match_code, match));
          hydratedMatchMap = hydrateActiveQuarterFinals(m);

          setMatchMap(hydratedMatchMap);
        }

        if (user) {
          const [predRes, scoreRes, tpRes] = await Promise.all([
            supabase.from('predictions').select('id,user_id,match_id,predicted_winner_id,is_submitted,created_at,updated_at').eq('user_id', user.id),
            supabase.from('scores').select('match_id,points_earned').eq('user_id', user.id),
            supabase.from('tournament_predictions').select('predicted_champion,predicted_runner_up,predicted_third_place,is_locked').eq('user_id', user.id).maybeSingle(),
          ]);
          if (!mounted) return;
          if (predRes.error) {
            console.error('Failed to load predictions', predRes.error);
          }
          if (predRes.data && mounted) {
            const predData = predRes.data as Prediction[];
            let hydratedMap = hydratedMatchMap;
            predData.forEach((prediction) => {
              if (!prediction.predicted_winner_id) return;
              const sourceMatch = Array.from(hydratedMap.values()).find((match) => match.id === prediction.match_id);
              if (!sourceMatch) return;
              const selectedTeam = sourceMatch.team1?.id === prediction.predicted_winner_id
                ? sourceMatch.team1
                : sourceMatch.team2?.id === prediction.predicted_winner_id
                  ? sourceMatch.team2
                  : undefined;
              if (!selectedTeam) return;
              const nextMatchCode = getNextMatchCode(sourceMatch.match_code);
              if (!nextMatchCode) return;
              const slot = getSlotInNextMatch(sourceMatch.match_code, nextMatchCode);
              if (!slot) return;
              const nextMatch = hydratedMap.get(nextMatchCode);
              if (!nextMatch) return;
              const existingTeam = slot === 1 ? nextMatch.team1 : nextMatch.team2;
              if (existingTeam?.id && existingTeam.id !== selectedTeam.id) return;
              const updatedMatch = {
                ...nextMatch,
                ...(slot === 1 ? { team1_id: selectedTeam.id, team1: selectedTeam } : { team2_id: selectedTeam.id, team2: selectedTeam }),
              };
              hydratedMap = new Map(hydratedMap);
              hydratedMap.set(nextMatchCode, updatedMatch);
            });
            setMatchMap(hydratedMap);
            setPredictions(predData);
          }
          if (scoreRes.error) {
            console.error('Failed to load scores', scoreRes.error);
          }
          if (scoreRes.data && mounted) {
            const sm = new Map<string, number>();
            scoreRes.data.forEach((s) => s.match_id && sm.set(s.match_id, s.points_earned));
            setScores(sm);
          }
          if (tpRes.error) {
            console.error('Failed to load tournament predictions', tpRes.error);
          }
          if (tpRes.data && mounted) {
            setTournamentDraft({
              championId: tpRes.data.predicted_champion ?? undefined,
              runnerUpId: tpRes.data.predicted_runner_up ?? undefined,
              thirdPlaceId: tpRes.data.predicted_third_place ?? undefined,
            });
            if (tpRes.data.is_locked && mounted) setLockedSubs(true);
            if (tpRes.data.predicted_champion && !tpRes.data.predicted_third_place && !tpRes.data.is_locked && mounted) {
              setThirdPlacePromptOpen(true);
            }
          }
        }
      } catch (error) {
        console.error('Bracket load failed', error);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [user]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const isLocked = useCallback((match: MatchWithDetails): boolean => {
    if (match.status === 'completed' || match.status === 'live') return true;
    if (!match.kickoff_time) return false;
    return (new Date(match.kickoff_time).getTime() - PREDICTION_LOCK_MS) <= now;
  }, [now]);

  const canPredict = useCallback((match: MatchWithDetails): boolean => {
    if (isLocked(match)) return false;
    if (!match.team1_id && !match.team2_id) return false;
    const pred = predictions.find((p) => p.match_id === match.id);
    return !pred?.is_submitted && !lockedSubs;
  }, [isLocked, predictions, lockedSubs]);

  const getPrediction = useCallback((matchId: string) => {
    return predictions.find((p) => p.match_id === matchId);
  }, [predictions]);

  const thirdPlaceCandidates = useMemo(() => {
    const teams: Team[] = [];
    const addTeam = (team?: Team) => {
      if (team && !teams.some((item) => item.id === team.id)) {
        teams.push(team);
      }
    };

    ['SF-1', 'SF-2'].forEach((code) => {
      const match = matchMap.get(code);
      if (!match || !match.team1 || !match.team2) {
        return;
      }
      const pred = predictions.find((p) => p.match_id === match.id);
      if (pred?.predicted_winner_id) {
        const loser = pred.predicted_winner_id === match.team1.id ? match.team2 : match.team1;
        addTeam(loser);
      } else {
        addTeam(match.team1);
        addTeam(match.team2);
      }
    });

    return teams;
  }, [matchMap, predictions]);

  const persistTournamentPrediction = useCallback(async (draft: Partial<{ championId?: string | null; runnerUpId?: string | null; thirdPlaceId?: string | null }>) => {
    if (!user) return;
    const nextDraft = { ...tournamentDraft, ...draft };
    const { data } = await supabase
      .from('tournament_predictions')
      .upsert({
        user_id: user.id,
        predicted_champion: nextDraft.championId ?? null,
        predicted_runner_up: nextDraft.runnerUpId ?? null,
        predicted_third_place: nextDraft.thirdPlaceId ?? null,
        is_locked: false,
      }, { onConflict: 'user_id' })
      .select('predicted_champion,predicted_runner_up,predicted_third_place,is_locked');

    if (data?.[0]) {
      setTournamentDraft({
        championId: data[0].predicted_champion ?? undefined,
        runnerUpId: data[0].predicted_runner_up ?? undefined,
        thirdPlaceId: data[0].predicted_third_place ?? undefined,
      });
    } else {
      setTournamentDraft(nextDraft);
    }
  }, [user, tournamentDraft]);

  const advanceToNextRound = useCallback((sourceMatch: MatchWithDetails, team: Team) => {
    const nextMatchCode = getNextMatchCode(sourceMatch.match_code);
    if (!nextMatchCode) return;

    const slot = getSlotInNextMatch(sourceMatch.match_code, nextMatchCode);
    if (!slot) return;

    setMatchMap((prev) => {
      const next = new Map(prev);
      const nextMatch = next.get(nextMatchCode);
      if (!nextMatch) return prev;

      const updatedMatch = {
        ...nextMatch,
        ...(slot === 1
          ? { team1_id: team.id, team1: team }
          : { team2_id: team.id, team2: team }),
      };

      next.set(nextMatchCode, updatedMatch);
      return next;
    });

    setHighlightedMatchCode(nextMatchCode);
    window.setTimeout(() => setHighlightedMatchCode(null), 700);
  }, [getNextMatchCode, getSlotInNextMatch]);

  const handleTeamClick = useCallback(async (match: MatchWithDetails, teamId: string) => {
    if (!user || !canPredict(match)) return;
    setPendingTeam({ matchId: match.id, teamId });

    const upsertPredictionForMatch = async (targetMatch: MatchWithDetails, winnerId: string) => {
      const existing = predictions.find((p) => p.match_id === targetMatch.id);
      const optimistic = {
        id: existing?.id ?? `${targetMatch.id}-${winnerId}`,
        user_id: user.id,
        match_id: targetMatch.id,
        predicted_winner_id: winnerId,
        is_submitted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Prediction;

      setPredictions((prev) => [...prev.filter((p) => p.match_id !== targetMatch.id), optimistic]);

      const { data } = await supabase
        .from('predictions')
        .upsert({ user_id: user.id, match_id: targetMatch.id, predicted_winner_id: winnerId, is_submitted: false }, { onConflict: 'user_id,match_id' })
        .select('id,user_id,match_id,predicted_winner_id,is_submitted,created_at,updated_at');

      if (data) {
        const updatedPredictions = data as Prediction[];
        setPredictions((prev) => [...prev.filter((p) => p.match_id !== targetMatch.id), ...updatedPredictions]);
      }
      return optimistic;
    };

    const selectedTeam = match.team1?.id === teamId ? match.team1 : match.team2;
    if (!selectedTeam) return;

    // Update the source match prediction first, then advance the next round.
    await upsertPredictionForMatch(match, teamId);
    advanceToNextRound(match, selectedTeam);

    if (match.match_code === 'FIN') {
      const otherTeam = match.team1?.id === teamId ? match.team2 : match.team1;
      await persistTournamentPrediction({ championId: teamId, runnerUpId: otherTeam?.id ?? null });
      setThirdPlacePromptOpen(true);
    }
  }, [user, canPredict, advanceToNextRound, getNextMatchCode, matchMap, persistTournamentPrediction]);

  const handleSubmit = useCallback(async () => {
    if (!user || !showConfirm) return;
    setSubmitting(true);
    const toSubmit = predictions.filter((p) => !p.is_submitted);
    await Promise.all(toSubmit.map((p) => supabase.from('predictions').update({ is_submitted: true }).eq('id', p.id)));
    await supabase.from('tournament_predictions').upsert({
      user_id: user.id,
      predicted_champion: tournamentDraft.championId ?? null,
      predicted_runner_up: tournamentDraft.runnerUpId ?? null,
      predicted_third_place: tournamentDraft.thirdPlaceId ?? null,
      is_locked: true,
    }, { onConflict: 'user_id' });
    setLockedSubs(true);
    setShowConfirm(false);
    setThirdPlacePromptOpen(false);
    setSubmitting(false);
  }, [user, showConfirm, predictions, tournamentDraft]);

  // Compute TBD label: show potential teams from source matches
  const getTbdInfo = useCallback((matchCode: string): { team1Label: string; team2Label: string } => {
    const sources = SOURCE_MAP[matchCode];
    if (!sources) return { team1Label: 'TBD', team2Label: 'TBD' };
    const getTeamLabel = (sourceCode: string): string => {
      const src = matchMap.get(sourceCode);
      if (!src) return 'TBD';
      if (src.winner) return src.winner.name;
      if (src.status === 'completed' && src.winner_id) return src.winner_id;
      // Show potential teams
      if (src.team1 && src.team2) return `W: ${src.team1.name.split(' ').pop()} / ${src.team2.name.split(' ').pop()}`;
      return 'TBD';
    };
    return { team1Label: getTeamLabel(sources[0]), team2Label: getTeamLabel(sources[1]) };
  }, [matchMap]);

  const formatDate = (iso: string): string => {
    const d = new Date(iso);
    const kickoffTime = d.getTime();
    const msUntilKickoff = kickoffTime - now;
    const msUntilLock = msUntilKickoff - PREDICTION_LOCK_MS;

    if (msUntilKickoff <= LOCK_COUNTDOWN_WINDOW_MS && msUntilLock > 0) {
      const totalSeconds = Math.ceil(msUntilLock / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `Predictions lock in ${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    const today = new Date(now);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const sameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (sameDay(d, today)) return `Today, ${timeStr}`;
    if (sameDay(d, tomorrow)) return `Tomorrow, ${timeStr}`;
    if (sameDay(d, yesterday)) return `Yesterday, ${timeStr}`;

    return d.toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' }) + `, ${timeStr}`;
  };

  const hasPending = predictions.some((p) => !p.is_submitted);

  if (loading) {
    return (
      <div className="glass-card rounded-xl p-8 flex items-center justify-center min-h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-fifa-gold/30 border-t-fifa-gold animate-spin" />
          <p className="text-gray-400 text-sm">Loading bracket...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span className="text-fifa-gold">⚽</span>
          Knockout Bracket
        </h2>
        {hasPending && !lockedSubs && (
          <button
            onClick={() => setShowConfirm(true)}
            className="bg-gradient-to-r from-fifa-gold to-yellow-600 text-fifa-darker font-semibold px-5 py-2 rounded-lg hover:opacity-90 transition-opacity text-sm"
          >
            Lock in Predictions
          </button>
        )}
      </div>

      {/* Scrollable bracket */}
      <div className="overflow-x-auto pb-6">
        <div className="flex" style={{ width: 'max-content' }}>
          {/* === R16 → QF CONNECTORS === */}
          {/* === QF COLUMN === */}
          <RoundColumn label="Quarter-finals">
            {['QF-1','QF-2','QF-3','QF-4'].map((code) => {
              const match = matchMap.get(code);
              const showPlaceholder = !match?.team1_id && !match?.team2_id;
              return (
                <MatchSlot key={code} slots={1}>
                  {match ? (
                    showPlaceholder ? (
                      <TbdMatchCard
                        match={match}
                        info={getTbdInfo(code)}
                        formatDate={formatDate}
                      />
                    ) : (
                      <MatchCard
                        match={match}
                        prediction={getPrediction(match.id)}
                        canPredict={canPredict(match)}
                        locked={isLocked(match)}
                        points={scores.get(match.id)}
                        pendingTeam={pendingTeam}
                        highlighted={highlightedMatchCode === match.match_code}
                        formatDate={formatDate}
                        onTeamClick={(teamId) => handleTeamClick(match, teamId)}
                      />
                    )
                  ) : <TBDCard />}
                </MatchSlot>
              );
            })}
          </RoundColumn>

          {/* === QF → SF CONNECTORS === */}
          <div className="flex flex-col" style={{ width: CONN_W }}>
            {QF_PAIRS.map((pair) => <Connector key={pair.next} sourceSlots={1} />)}
          </div>

          {/* === SF COLUMN === */}
          <RoundColumn label="Semi-finals">
            {['SF-1','SF-2'].map((code) => {
              const match = matchMap.get(code);
              const showPlaceholder = !match?.team1_id && !match?.team2_id;
              return (
                <MatchSlot key={code} slots={2}>
                  {match ? (
                    showPlaceholder ? (
                      <TbdMatchCard match={match} info={getTbdInfo(code)} formatDate={formatDate} />
                    ) : (
                      <MatchCard
                        match={match}
                        prediction={getPrediction(match.id)}
                        canPredict={canPredict(match)}
                        locked={isLocked(match)}
                        points={scores.get(match.id)}
                        pendingTeam={pendingTeam}
                        highlighted={highlightedMatchCode === match.match_code}
                        formatDate={formatDate}
                        onTeamClick={(teamId) => handleTeamClick(match, teamId)}
                      />
                    )
                  ) : <TBDCard />}
                </MatchSlot>
              );
            })}
          </RoundColumn>

          {/* === SF → FINAL CONNECTOR === */}
          <div className="flex flex-col" style={{ width: CONN_W }}>
            <Connector sourceSlots={2} />
          </div>

          {/* === FINAL COLUMN === */}
          <RoundColumn label="Final">
            <MatchSlot slots={4}>
              {(() => {
                const match = matchMap.get('FIN');
                const showPlaceholder = !match?.team1_id && !match?.team2_id;
                if (!match) return <TBDCard />;
                return showPlaceholder ? (
                  <TbdMatchCard match={match} info={getTbdInfo('FIN')} formatDate={formatDate} isFinal />
                ) : (
                  <MatchCard
                    match={match}
                    prediction={getPrediction(match.id)}
                    canPredict={canPredict(match)}
                    locked={isLocked(match)}
                    points={scores.get(match.id)}
                    pendingTeam={pendingTeam}
                    highlighted={highlightedMatchCode === match.match_code}
                    formatDate={formatDate}
                    onTeamClick={(teamId) => handleTeamClick(match, teamId)}
                    isFinal
                  />
                );
              })()}
            </MatchSlot>
          </RoundColumn>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {thirdPlacePromptOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl p-6 max-w-md w-full border border-fifa-gold/30">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-amber-600 text-xl">🥉</span>
              <h3 className="text-xl font-semibold text-white">Pick your 3rd place finisher</h3>
            </div>
            <p className="text-sm text-gray-300 mb-4">You’ve selected your champion. Choose the team you think will finish third.</p>
            <div className="space-y-2">
              {thirdPlaceCandidates.map((team) => (
                <button
                  key={team.id}
                  onClick={async () => {
                    setThirdPlacePromptOpen(false);
                    await supabase.from('tournament_predictions').upsert({
                      user_id: user?.id,
                      predicted_champion: tournamentDraft.championId ?? null,
                      predicted_runner_up: tournamentDraft.runnerUpId ?? null,
                      predicted_third_place: team.id,
                      is_locked: false,
                    }, { onConflict: 'user_id' });
                    setTournamentDraft((prev) => ({ ...prev, thirdPlaceId: team.id }));
                  }}
                  className="w-full flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left transition hover:border-fifa-gold/40 hover:bg-fifa-gold/10"
                >
                  <img src={team.flag_url} alt={team.name} className="w-9 h-6 object-cover rounded shadow-sm" loading="lazy" />
                  <span className="text-sm font-medium text-white">{team.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
              <h3 className="text-xl font-semibold text-white">Lock in Predictions?</h3>
            </div>
            <p className="text-gray-300 mb-6 text-sm">
              Once submitted, your predictions cannot be changed. Make sure you're happy with all your picks first.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowConfirm(false)} disabled={submitting}
                className="px-4 py-2 rounded-lg border border-white/20 text-gray-300 hover:bg-white/10 disabled:opacity-50 text-sm">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-fifa-gold to-yellow-600 text-fifa-darker font-semibold hover:opacity-90 disabled:opacity-50 text-sm">
                {submitting ? 'Submitting...' : 'Confirm & Lock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Sub-components ---

function RoundColumn({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col" style={{ width: MATCH_W }}>
      <div className="text-center text-sm font-semibold text-fifa-gold mb-3 h-6">{label}</div>
      {children}
    </div>
  );
}

function MatchSlot({ slots, children }: { slots: number; children: React.ReactNode }) {
  return (
    <div style={{ height: slots * SLOT_H, display: 'flex', alignItems: 'center' }}>
      {children}
    </div>
  );
}

// Connector draws the bracket lines between two source matches and the next match
function Connector({ sourceSlots }: { sourceSlots: number }) {
  const h = sourceSlots * 2 * SLOT_H;
  const armY = (sourceSlots * SLOT_H) / 2; // center of each source match within this connector
  const gold = 'rgba(212, 175, 55, 0.4)';

  return (
    <div style={{ width: CONN_W, height: h, position: 'relative', marginTop: 24 /* label height */ }}>
      {/* Top arm (horizontal from upper match to vertical line) */}
      <div style={{ position: 'absolute', top: armY - 1, left: 0, right: CONN_W / 2, height: 2, background: gold }} />
      {/* Bottom arm (horizontal from lower match to vertical line) */}
      <div style={{ position: 'absolute', top: h - armY - 1, left: 0, right: CONN_W / 2, height: 2, background: gold }} />
      {/* Vertical line connecting top arm to bottom arm */}
      <div style={{ position: 'absolute', top: armY, bottom: armY, right: CONN_W / 2, width: 2, background: gold }} />
      {/* Center arm (horizontal from vertical line to next match) */}
      <div style={{ position: 'absolute', top: h / 2 - 1, left: CONN_W / 2, right: 0, height: 2, background: gold }} />
    </div>
  );
}

function TBDCard() {
  return (
    <div className="w-full rounded-xl p-3 bg-white/3 border border-white/5">
      <div className="flex gap-2 mb-2">
        <div className="w-9 h-6 bg-white/10 rounded" />
        <div className="h-4 bg-white/10 rounded w-24 mt-1" />
      </div>
      <div className="flex gap-2">
        <div className="w-9 h-6 bg-white/10 rounded" />
        <div className="h-4 bg-white/10 rounded w-20 mt-1" />
      </div>
    </div>
  );
}

function TbdMatchCard({ match, info, formatDate, isFinal }: {
  match: MatchWithDetails;
  info: { team1Label: string; team2Label: string };
  formatDate: (s: string) => string;
  isFinal?: boolean;
}) {
  return (
    <div className={`w-full rounded-xl p-3 bg-white/5 border ${isFinal ? 'border-fifa-gold/30' : 'border-white/10'}`}>
      {match.kickoff_time && (
        <p className="text-xs text-gray-400 mb-2">{formatDate(match.kickoff_time)}</p>
      )}
      <div className="space-y-2">
        {[info.team1Label, info.team2Label].map((label, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10">
            <div className="w-9 h-6 bg-white/20 rounded flex items-center justify-center">
              <span className="text-gray-500 text-xs">?</span>
            </div>
            <span className="text-gray-400 text-sm leading-tight">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface MatchCardProps {
  match: MatchWithDetails;
  prediction?: Prediction;
  canPredict: boolean;
  locked: boolean;
  points?: number;
  pendingTeam: { matchId: string; teamId: string } | null;
  highlighted?: boolean;
  formatDate: (s: string) => string;
  onTeamClick: (teamId: string) => void;
  isFinal?: boolean;
}

function MatchCard({ match, prediction, canPredict, locked, pendingTeam, highlighted, formatDate, onTeamClick, isFinal }: MatchCardProps) {
  const completed = match.status === 'completed';
  const live = match.status === 'live';
  const predWinner = prediction?.predicted_winner_id;

  const teamRow = (team: Team | undefined, teamId: string | undefined) => {
    if (!team || !teamId) return null;
    const isPred = predWinner === teamId;
    const isWinner = match.winner_id === teamId;
    const isCorrect = isPred && isWinner;
    const isWrong = isPred && completed && !isWinner;
    const isPending = pendingTeam?.matchId === match.id && pendingTeam?.teamId === teamId;

    return (
      <button
        key={teamId}
        onClick={() => canPredict && onTeamClick(teamId)}
        disabled={!canPredict}
        className={`flex items-center gap-2 p-2 rounded-lg border w-full text-left transition-all duration-200 ${
          isPred
            ? 'bg-fifa-gold/20 border-fifa-gold/60'
            : 'bg-white/5 border-white/10 hover:border-white/25'
        } ${canPredict ? 'cursor-pointer' : 'cursor-default'} ${isPending ? 'scale-105' : ''}`}
      >
        <img
          src={team.flag_url}
          alt={team.name}
          className="w-9 h-6 object-cover rounded shadow-sm flex-shrink-0"
          loading="lazy"
        />
        <span className={`flex-1 text-sm font-medium truncate ${isWinner ? 'text-white' : completed ? 'text-gray-400' : 'text-white'}`}>
          {team.name}
        </span>
        {isWinner && completed && <Check className="w-4 h-4 text-green-400 flex-shrink-0" />}
        {isPred && !completed && <span className="text-[10px] uppercase tracking-wide text-fifa-gold">Pick</span>}
        {isCorrect && <Check className="w-4 h-4 text-green-400 flex-shrink-0" />}
        {isWrong && <X className="w-4 h-4 text-red-400 flex-shrink-0" />}
      </button>
    );
  };

  return (
    <div className={`w-full rounded-xl p-3 border transition-all duration-300 ${
      isFinal
        ? 'bg-fifa-gold/5 border-fifa-gold/40'
        : completed
        ? 'bg-white/5 border-white/15'
        : 'glass-card border-white/10'
    } ${locked && !completed ? 'opacity-60' : ''} ${highlighted ? 'ring-2 ring-yellow-400/70 ring-offset-2 ring-offset-slate-950 animate-pulse' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">{match.match_code}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-1 ${
          completed
            ? 'text-gray-400'
            : live
            ? 'bg-green-500/20 text-green-400'
            : locked
            ? 'bg-red-500/20 text-red-400'
            : 'bg-green-500/20 text-green-400'
        }`}>
          {completed ? (
            'FT'
          ) : live ? (
            <><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> LIVE</>
          ) : locked ? (
            <><Lock className="w-3 h-3" /> Locked</>
          ) : (
            <><Clock className="w-3 h-3" /> Open</>
          )}
        </span>
      </div>

      {/* Kickoff time */}
      {match.kickoff_time && !completed && (
        <p className="text-xs text-gray-400 mb-2">{formatDate(match.kickoff_time)}</p>
      )}

      {/* Teams */}
      <div className="space-y-1.5">
        {teamRow(match.team1, match.team1_id)}
        {teamRow(match.team2, match.team2_id)}
      </div>

      {/* Prediction indicator for open matches */}
      {!completed && !locked && predWinner && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <span className="text-xs text-fifa-gold">Prediction saved</span>
        </div>
      )}
    </div>
  );
}
