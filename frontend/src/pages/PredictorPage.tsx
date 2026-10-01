import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePredictionFixtures, usePredictionLeaderboard } from "@/shared/api/queries";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { Container } from "@/shared/ui/Container";
import { Skeleton, SkeletonCard } from "@/shared/ui/Skeleton";
import { QueryState } from "@/shared/ui/States";
import { Tabs, useTabParam } from "@/shared/ui/Tabs";
import { useAuth } from "@/features/auth/AuthProvider";
import { AuthModal } from "@/features/auth/AuthModal";
import { LeaderboardTab } from "@/features/predictor/LeaderboardTab";
import { PredictTab } from "@/features/predictor/PredictTab";
import { PredictorHero } from "@/features/predictor/PredictorHero";
import { ResultsTab } from "@/features/predictor/ResultsTab";
import { FIXTURES_KEY, LEADERBOARD_KEY } from "@/features/predictor/predictionApi";

const TABS = ["predict", "results", "leaderboard"] as const;

export default function PredictorPage() {
  const { t } = useI18n();
  useDocumentTitle(t("predictor.title"));
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useTabParam(TABS, "predict");
  const [authOpen, setAuthOpen] = useState(false);
  const fixtures = usePredictionFixtures();
  const leaderboard = usePredictionLeaderboard();
  const signedIn = Boolean(user);
  const requireAuth = useCallback(() => setAuthOpen(true), []);

  // Signing in or out changes whose predictions the server returns.
  const userId = user?.id ?? null;
  const lastUser = useRef(userId);
  useEffect(() => {
    if (lastUser.current === userId) return;
    lastUser.current = userId;
    void queryClient.invalidateQueries({ queryKey: FIXTURES_KEY });
    void queryClient.invalidateQueries({ queryKey: LEADERBOARD_KEY });
  }, [userId, queryClient]);

  return (
    <Container className="space-y-4 py-4 sm:py-6">
      <PredictorHero signedIn={signedIn} leaderboard={leaderboard} onRequireAuth={requireAuth}>
        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { key: "predict", label: t("predictor.tab.predict") },
            { key: "results", label: t("predictor.tab.results") },
            { key: "leaderboard", label: t("predictor.tab.leaderboard") },
          ]}
        />
      </PredictorHero>

      <div role="tabpanel">
        {tab === "leaderboard" ? (
          <QueryState query={leaderboard} errorClassName="card" loading={<SkeletonCard rows={8} rowClassName="h-9" />}>
            {(board) => <LeaderboardTab board={board} signedIn={signedIn} onRequireAuth={requireAuth} />}
          </QueryState>
        ) : (
          <QueryState query={fixtures} errorClassName="card" loading={tab === "predict" ? <PredictSkeleton /> : <SkeletonCard rows={4} rowClassName="h-16" />}>
            {(list) =>
              tab === "predict" ? (
                <PredictTab fixtures={list} signedIn={signedIn} onRequireAuth={requireAuth} />
              ) : (
                <ResultsTab fixtures={list} signedIn={signedIn} onRequireAuth={requireAuth} />
              )
            }
          </QueryState>
        )}
      </div>

      {authOpen && <AuthModal initialMode="login" onClose={() => setAuthOpen(false)} />}
    </Container>
  );
}

function PredictSkeleton() {
  return (
    <div className="space-y-2.5" aria-busy="true">
      <Skeleton className="mx-1 h-5 w-40" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card space-y-3 p-4">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="ml-auto h-8 w-24 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
