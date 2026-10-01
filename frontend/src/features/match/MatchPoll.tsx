import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Vote } from "lucide-react";
import type { MatchDetail, MatchVotes, TeamRef, VoteChoice } from "@/shared/api/types";
import { ApiError } from "@/shared/api/client";
import { castVote, useMatchVotes } from "@/shared/api/queries";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { cn } from "@/shared/lib/utils";
import { CardHeader } from "@/shared/ui/Card";
import { Skeleton } from "@/shared/ui/Skeleton";
import { ErrorState } from "@/shared/ui/States";
import { TeamLogo } from "@/shared/ui/TeamLogo";

const CHOICES: VoteChoice[] = ["home", "draw", "away"];

/**
 * "Who will win?" fan poll: three buttons before voting, percentage bars after (or once closed).
 * `resultsOnly` (after kick-off) renders nothing unless people actually voted.
 */
export function MatchPoll({ match, resultsOnly = false }: { match: MatchDetail; resultsOnly?: boolean }) {
  const { t } = useI18n();
  const query = useMatchVotes(match.id);
  const qc = useQueryClient();
  const key = ["votes", match.id];

  const mutation = useMutation({
    mutationFn: (choice: VoteChoice) => castVote(match.id, choice),
    onSuccess: (res) => qc.setQueryData<MatchVotes>(key, res),
    onError: (err) => {
      if (err instanceof ApiError && err.code === "VOTING_CLOSED") {
        qc.setQueryData<MatchVotes>(key, (old) => (old ? { ...old, open: false } : old));
      }
    },
  });

  const team = (c: VoteChoice): TeamRef | null => (c === "home" ? match.homeTeam : c === "away" ? match.awayTeam : null);
  const label = (c: VoteChoice) => team(c)?.name ?? t("poll.draw");
  const failed = mutation.isError && !(mutation.error instanceof ApiError && mutation.error.code === "VOTING_CLOSED");

  if (resultsOnly && (!query.data || query.data.total === 0)) return null;

  return (
    <section className="card overflow-hidden">
      <CardHeader title={t("poll.title")} icon={<Vote size={16} />} />
      {query.data ? (
        <div className="p-4 sm:p-5">
          {query.data.open && query.data.myVote == null ? (
            <div className="grid grid-cols-3 gap-2">
              {CHOICES.map((c) => {
                const pending = mutation.isPending && mutation.variables === c;
                const tm = team(c);
                return (
                  <button
                    key={c}
                    type="button"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate(c)}
                    aria-label={t("poll.voteFor", { choice: label(c) })}
                    className="flex min-w-0 flex-col items-center gap-2 rounded-xl bg-surface-2 px-2 py-3 transition hover:bg-surface-3 active:scale-[0.97] disabled:cursor-wait disabled:opacity-60"
                  >
                    <span className="relative flex h-10 w-10 items-center justify-center">
                      {pending ? (
                        <Loader2 size={22} className="animate-spin text-ink-3" />
                      ) : tm ? (
                        <TeamLogo team={tm} size="lg" />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-lg font-extrabold text-ink-2 ring-1 ring-line">X</span>
                      )}
                    </span>
                    <span className="w-full truncate text-center text-xs font-semibold">{label(c)}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <Results votes={query.data} label={label} team={team} />
          )}
          {failed && (
            <p role="alert" className="mt-3 text-center text-xs font-medium text-loss">
              {t("poll.error")}
            </p>
          )}
        </div>
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} className="py-6" />
      ) : (
        <div className="grid grid-cols-3 gap-2 p-4 sm:p-5" aria-busy="true">
          {CHOICES.map((c) => (
            <Skeleton key={c} className="h-[88px]" />
          ))}
        </div>
      )}
    </section>
  );
}

function Results({ votes, label, team }: { votes: MatchVotes; label: (c: VoteChoice) => string; team: (c: VoteChoice) => TeamRef | null }) {
  const { t } = useI18n();
  const percent = (c: VoteChoice) => (votes.total > 0 ? Math.round((votes.counts[c] / votes.total) * 100) : 0);
  const leader = Math.max(...CHOICES.map((c) => votes.counts[c]));

  return (
    <div>
      <ul className="space-y-2">
        {CHOICES.map((c) => {
          const mine = votes.myVote === c;
          const p = percent(c);
          const tm = team(c);
          return (
            <li key={c} className={cn("relative overflow-hidden rounded-xl bg-surface-2", mine && "ring-2 ring-brand")}>
              <span
                aria-hidden
                className={cn("absolute inset-y-0 left-0 transition-[width] duration-500", mine ? "bg-brand/25" : votes.counts[c] === leader && leader > 0 ? "bg-ink/10" : "bg-ink/[0.06]")}
                style={{ width: `${p}%` }}
              />
              <div className="relative flex items-center gap-2.5 px-3 py-2.5">
                {tm ? (
                  <TeamLogo team={tm} size="sm" />
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface text-[10px] font-extrabold text-ink-2 ring-1 ring-line">X</span>
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{label(c)}</span>
                {mine && (
                  <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-brand">
                    <Check size={13} strokeWidth={3} aria-hidden />
                    {t("poll.yourVote")}
                  </span>
                )}
                <span className="w-11 shrink-0 text-right text-sm font-extrabold tnum">{p}%</span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-center text-xs font-medium text-ink-3">
        {t("poll.total", { n: votes.total })}
        {!votes.open && <> · {t("poll.closed")}</>}
      </p>
    </div>
  );
}
