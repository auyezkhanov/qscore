import type { MatchDetail } from "@/shared/api/types";
import { useMatchPreview } from "@/shared/api/queries";
import { SkeletonCard } from "@/shared/ui/Skeleton";
import { QueryState } from "@/shared/ui/States";
import { isLive } from "@/features/matches/MatchStatus";
import { MatchAbsences } from "./MatchAbsences";
import { MatchPoll } from "./MatchPoll";
import { FactsCard, FormCard, NextMatchesCard } from "./MatchPreviewCards";
import { MatchTimeline } from "./MatchTimeline";
import { PlayerOfTheMatch } from "./PlayerOfTheMatch";

/**
 * Overview tab. Before kick-off it's a preview (poll, absences, form, facts, next fixtures);
 * once the match is under way the timeline leads, followed by the player of the match, facts and form.
 */
export function MatchOverview({ match }: { match: MatchDetail }) {
  const query = useMatchPreview(match.id);
  const upcoming = match.status === "SCHEDULED" || match.status === "POSTPONED";
  const started = isLive(match) || match.status === "FINISHED";

  const preview = (
    <QueryState query={query} loading={<SkeletonCard rows={3} rowClassName="h-10" />} errorClassName="card">
      {(p) =>
        started ? (
          <>
            <FactsCard preview={p} />
            <FormCard preview={p} />
          </>
        ) : (
          <>
            <FormCard preview={p} />
            <FactsCard preview={p} />
            <NextMatchesCard preview={p} />
          </>
        )
      }
    </QueryState>
  );

  if (started) {
    return (
      <div className="space-y-4">
        <section className="card overflow-hidden">
          <MatchTimeline match={match} />
        </section>
        {match.playerOfTheMatch && <PlayerOfTheMatch potm={match.playerOfTheMatch} match={match} />}
        <MatchPoll match={match} resultsOnly />
        {preview}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {upcoming && <MatchPoll match={match} />}
      <MatchAbsences match={match} variant="card" />
      {preview}
    </div>
  );
}
