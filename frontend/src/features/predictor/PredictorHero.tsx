import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { LogIn, Sparkles } from "lucide-react";
import type { PredictionLeaderboard } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import type { TranslationKey } from "@/shared/i18n/ru";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/Button";
import { Skeleton } from "@/shared/ui/Skeleton";
import { ColorWash, StatTile } from "@/features/team/StatTile";
import { POINTS_TONE } from "./PointsBadge";

const RULES: { points: number; key: TranslationKey }[] = [
  { points: 3, key: "predictor.rule.exact" },
  { points: 2, key: "predictor.rule.diff" },
  { points: 1, key: "predictor.rule.outcome" },
];

/** Title, scoring rules and the viewer's season summary (or a sign-in call to action). `children` is the tab bar. */
export function PredictorHero({
  signedIn,
  leaderboard,
  onRequireAuth,
  children,
}: {
  signedIn: boolean;
  leaderboard: UseQueryResult<PredictionLeaderboard>;
  onRequireAuth: () => void;
  children: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <section className="card relative overflow-hidden">
      <ColorWash color="#17a2b0" />
      <div className="relative flex flex-col gap-5 p-4 sm:p-6 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-brand-fg shadow-sm sm:h-14 sm:w-14">
              <Sparkles size={26} />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{t("predictor.title")}</h1>
              <p className="text-sm text-ink-2">{t("predictor.subtitle")}</p>
            </div>
          </div>
          <ul aria-label={t("predictor.rulesTitle")} className="flex flex-wrap gap-1.5">
            {RULES.map((r) => (
              <li key={r.points} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2/80 py-1 pl-1 pr-3 text-[12px] font-semibold text-ink-2">
                <span className={cn("inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[11px] font-extrabold tnum", POINTS_TONE[r.points])}>
                  {r.points}
                </span>
                {t(r.key)}
              </li>
            ))}
          </ul>
        </div>

        <div className="md:w-[340px] md:shrink-0">
          {signedIn ? (
            <Summary leaderboard={leaderboard} />
          ) : (
            <div className="rounded-2xl bg-surface-2/80 p-4 text-center md:text-left">
              <p className="text-sm text-ink-2">{t("predictor.signInText")}</p>
              <Button onClick={onRequireAuth} className="mt-3 w-full md:w-auto">
                <LogIn size={16} />
                {t("predictor.signInCta")}
              </Button>
            </div>
          )}
        </div>
      </div>
      <div className="relative -mb-px border-t border-line">{children}</div>
    </section>
  );
}

function Summary({ leaderboard }: { leaderboard: UseQueryResult<PredictionLeaderboard> }) {
  const { t } = useI18n();
  if (leaderboard.isPending) {
    return (
      <div className="grid grid-cols-3 gap-2" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[66px] rounded-xl" />
        ))}
      </div>
    );
  }
  // On error the summary just shows dashes; the leaderboard tab offers the retry.
  // `me` is only sent when the user is outside the top list; otherwise their row is in `top`.
  const me = leaderboard.data?.me ?? leaderboard.data?.top.find((r) => r.isMe) ?? null;
  const total = leaderboard.data?.total ?? 0;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <StatTile value={me?.points ?? 0} label={t("predictor.stat.points")} />
        <StatTile value={me ? `#${me.rank}` : "—"} label={t("predictor.stat.rank")} sub={me ? t("predictor.rankOf", { total }) : undefined} />
        <StatTile value={me?.exact ?? 0} label={t("predictor.stat.exact")} />
      </div>
      {!me && <p className="text-center text-xs font-medium text-ink-3 md:text-left">{t("predictor.firstPick")}</p>}
    </div>
  );
}
