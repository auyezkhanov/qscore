import { lazy, Suspense, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { Header } from "@/layout/Header";
import { MobileNav } from "@/layout/MobileNav";
import { Footer } from "@/layout/Footer";
import { SyncBanner } from "@/layout/SyncBanner";
import { Page } from "@/shared/ui/Container";
import { Skeleton } from "@/shared/ui/Skeleton";
import { ErrorBoundary } from "./ErrorBoundary";

const HomePage = lazy(() => import("@/pages/HomePage"));
const LeaguesPage = lazy(() => import("@/pages/LeaguesPage"));
const LeaguePage = lazy(() => import("@/pages/LeaguePage"));
const MatchPage = lazy(() => import("@/pages/MatchPage"));
const TeamPage = lazy(() => import("@/pages/TeamPage"));
const PlayerPage = lazy(() => import("@/pages/PlayerPage"));
const NewsPage = lazy(() => import("@/pages/NewsPage"));
const NewsArticlePage = lazy(() => import("@/pages/NewsArticlePage"));
const TransfersPage = lazy(() => import("@/pages/TransfersPage"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
const PredictorPage = lazy(() => import("@/pages/PredictorPage"));
const TvPage = lazy(() => import("@/pages/TvPage"));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function PageFallback() {
  return (
    <Page>
      <Skeleton className="h-40 w-full rounded-card" />
      <Skeleton className="h-96 w-full rounded-card" />
    </Page>
  );
}

export function App() {
  const location = useLocation();
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Header />
      <SyncBanner />
      <main className="flex-1">
        {/* Reset the boundary on navigation so one broken page doesn't stick. */}
        <ErrorBoundary key={location.pathname}>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/leagues" element={<LeaguesPage />} />
              <Route path="/league/:slug" element={<LeaguePage />} />
              <Route path="/match/:id" element={<MatchPage />} />
              <Route path="/team/:slug" element={<TeamPage />} />
              <Route path="/player/:slug" element={<PlayerPage />} />
              <Route path="/news" element={<NewsPage />} />
              <Route path="/news/:id" element={<NewsArticlePage />} />
              <Route path="/transfers" element={<TransfersPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/predictor" element={<PredictorPage />} />
              <Route path="/tv" element={<TvPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
