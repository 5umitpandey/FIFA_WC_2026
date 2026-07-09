import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MatchUpdates {
  match_code: string;
  team1_id?: string;
  team2_id?: string;
  status?: "scheduled" | "live" | "completed";
  winner_id?: string;
  home_score?: number;
  away_score?: number;
  kickoff_time?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === "POST") {
      const body = await req.json();
      const { matches: matchUpdates } = body as { matches: MatchUpdates[] };

      if (!matchUpdates || !Array.isArray(matchUpdates)) {
        return new Response(
          JSON.stringify({ error: "Invalid request body" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const results = [];

      for (const update of matchUpdates) {
        const updateData: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };

        if (update.team1_id) updateData.team1_id = update.team1_id;
        if (update.team2_id) updateData.team2_id = update.team2_id;
        if (update.status) updateData.status = update.status;
        if (update.winner_id) updateData.winner_id = update.winner_id;
        if (update.home_score !== undefined) updateData.home_score = update.home_score;
        if (update.away_score !== undefined) updateData.away_score = update.away_score;
        if (update.kickoff_time) updateData.kickoff_time = update.kickoff_time;

        const { error: matchError } = await supabase
          .from("matches")
          .update(updateData)
          .eq("match_code", update.match_code);

        if (matchError) {
          console.error(`Error updating match ${update.match_code}:`, matchError);
          continue;
        }

        if (update.status === "completed" && update.winner_id) {
          await calculateScores(supabase, update.match_code);
        }

        results.push({ match_code: update.match_code, status: "updated" });
      }

      if (matchUpdates.some((m) => m.status === "completed")) {
        await calculateTournamentScores(supabase);
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "GET") {
      const { data: matches } = await supabase
        .from("matches")
        .select("*")
        .order("match_number", { ascending: true });

      return new Response(
        JSON.stringify(matches),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error in sync-matches:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function calculateScores(supabase: any, matchCode: string) {
  const { data: match } = await supabase
    .from("matches")
    .select("id, round, winner_id")
    .eq("match_code", matchCode)
    .single();

  if (!match || !match.winner_id) return;

  const { data: predictions } = await supabase
    .from("predictions")
    .select("id, user_id, predicted_winner_id")
    .eq("match_id", match.id);

  if (!predictions) return;

  const pointsMap: Record<string, number> = {
    round_of_16: 3,
    quarter_final: 3,
    semi_final: 3,
    third_place: 4,
    final: 6,
  };

  const pointsPerMatch = pointsMap[match.round] || 3;

  // Count every saved prediction once the real match result is known.
  // A user does not need to have pressed "Lock in Predictions" if the match
  // prediction window has already closed.
  for (const pred of predictions) {
    const points = pred.predicted_winner_id === match.winner_id ? pointsPerMatch : 0;

    const { data: existingScore } = await supabase
      .from("scores")
      .select("id")
      .eq("user_id", pred.user_id)
      .eq("match_id", match.id)
      .maybeSingle();

    if (existingScore) {
      await supabase
        .from("scores")
        .update({ points_earned: points })
        .eq("id", existingScore.id);
    } else {
      await supabase.from("scores").insert({
        user_id: pred.user_id,
        match_id: match.id,
        points_earned: points,
        score_type: "match",
      });
    }
  }
}

async function calculateTournamentScores(supabase: any) {
  const { data: finalMatch } = await supabase
    .from("matches")
    .select("id, winner_id, team1_id, team2_id")
    .eq("round", "final")
    .eq("status", "completed")
    .maybeSingle();

  const { data: thirdPlaceMatch } = await supabase
    .from("matches")
    .select("id, winner_id, team1_id, team2_id")
    .eq("round", "third_place")
    .eq("status", "completed")
    .maybeSingle();

  if (!finalMatch) return;

  const { data: users } = await supabase.from("users").select("id");
  if (!users) return;

  for (const user of users) {
    const { data: tp } = await supabase
      .from("tournament_predictions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!tp) continue;

    let runnerUpId: string | null = null;
    if (finalMatch.winner_id === finalMatch.team1_id) {
      runnerUpId = finalMatch.team2_id;
    } else if (finalMatch.winner_id === finalMatch.team2_id) {
      runnerUpId = finalMatch.team1_id;
    }

    const championScore = tp.predicted_champion === finalMatch.winner_id ? 6 : 0;
    const runnerUpScore = tp.predicted_runner_up === runnerUpId ? 5 : 0;

    const { data: existingChamp } = await supabase
      .from("scores")
      .select("id")
      .eq("user_id", user.id)
      .eq("score_type", "champion")
      .maybeSingle();

    if (existingChamp) {
      await supabase
        .from("scores")
        .update({ points_earned: championScore })
        .eq("id", existingChamp.id);
    } else {
      await supabase.from("scores").insert({
        user_id: user.id,
        points_earned: championScore,
        score_type: "champion",
      });
    }

    const { data: existingRunnerUp } = await supabase
      .from("scores")
      .select("id")
      .eq("user_id", user.id)
      .eq("score_type", "runner_up")
      .maybeSingle();

    if (existingRunnerUp) {
      await supabase
        .from("scores")
        .update({ points_earned: runnerUpScore })
        .eq("id", existingRunnerUp.id);
    } else {
      await supabase.from("scores").insert({
        user_id: user.id,
        points_earned: runnerUpScore,
        score_type: "runner_up",
      });
    }

    if (thirdPlaceMatch && thirdPlaceMatch.winner_id) {
      const thirdPlaceScore = tp.predicted_third_place === thirdPlaceMatch.winner_id ? 4 : 0;

      const { data: existingThird } = await supabase
        .from("scores")
        .select("id")
        .eq("user_id", user.id)
        .eq("score_type", "third_place")
        .maybeSingle();

      if (existingThird) {
        await supabase
          .from("scores")
          .update({ points_earned: thirdPlaceScore })
          .eq("id", existingThird.id);
      } else {
        await supabase.from("scores").insert({
          user_id: user.id,
          points_earned: thirdPlaceScore,
          score_type: "third_place",
        });
      }
    }
  }
}
