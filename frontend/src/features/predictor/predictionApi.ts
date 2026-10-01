import type { QueryClient } from "@tanstack/react-query";
import { request } from "@/shared/api/client";
import type { PredictionFixture } from "@/shared/api/types";

export type Score = { homeScore: number; awayScore: number };
type Prediction = NonNullable<PredictionFixture["prediction"]>;

export const MAX_GOALS = 20;
export const FIXTURES_KEY = ["prediction-fixtures"] as const;
export const LEADERBOARD_KEY = ["prediction-leaderboard"] as const;

/** Writes `prediction` into every cached fixtures list (all languages) without refetching. */
function patchPrediction(queryClient: QueryClient, matchId: string, prediction: Prediction | null) {
  queryClient.setQueriesData<PredictionFixture[]>({ queryKey: FIXTURES_KEY }, (list) =>
    list?.map((f) => (f.match.id === matchId ? { ...f, prediction } : f)),
  );
}

export async function savePrediction(queryClient: QueryClient, matchId: string, score: Score) {
  const saved = await request<Prediction>(`/predictions/${matchId}`, { method: "PUT", body: score });
  patchPrediction(queryClient, matchId, saved);
  // The prediction count on the leaderboard changed; the fixtures don't need a refetch.
  void queryClient.invalidateQueries({ queryKey: LEADERBOARD_KEY });
}

export async function deletePrediction(queryClient: QueryClient, matchId: string) {
  await request<unknown>(`/predictions/${matchId}`, { method: "DELETE" });
  patchPrediction(queryClient, matchId, null);
  void queryClient.invalidateQueries({ queryKey: LEADERBOARD_KEY });
}

export const clampGoals = (n: number) => Math.min(MAX_GOALS, Math.max(0, Math.round(n)));
