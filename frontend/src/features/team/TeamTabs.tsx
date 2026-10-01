import { ArrowDownLeft, ArrowUpRight, CalendarDays, History, Repeat, Users } from "lucide-react";
import { useStandings, useTeamMatches, useTeamTransfers } from "@/shared/api/queries";
import type { Position, SquadPlayer, TeamDetail } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { MatchList } from "@/features/matches/MatchRow";
import { StandingsTable } from "@/features/standings/StandingsTable";
import { TransferRow } from "@/features/transfers/TransferRow";
import { Card, CardHeader } from "@/shared/ui/Card";
import { SkeletonCard } from "@/shared/ui/Skeleton";
import { EmptyState, QueryState } from "@/shared/ui/States";
import { SquadList } from "./SquadList";

export function TeamTableTab({ team }: { team: TeamDetail }) {
  const { t } = useI18n();
  const standings = useStandings(team.league?.slug);
  return (
    <QueryState query={standings} loading={<SkeletonCard rows={12} rowClassName="h-9" />}>
      {(rows) => (
        <Card>
          <CardHeader title={team.league?.name ?? t("tabs.table")} />
          {rows.length ? <StandingsTable rows={rows} highlightSlug={team.slug} /> : <EmptyState title={t("common.noData")} />}
        </Card>
      )}
    </QueryState>
  );
}

export function TeamMatchesTab({ team }: { team: TeamDetail }) {
  const { t } = useI18n();
  const matches = useTeamMatches(team.slug);
  return (
    <QueryState
      query={matches}
      loading={
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonCard rows={5} rowClassName="h-11" />
          <SkeletonCard rows={5} rowClassName="h-11" />
        </div>
      }
    >
      {(all) => {
        const upcoming = all.filter((m) => m.status !== "FINISHED" && m.status !== "CANCELLED").sort((a, b) => a.kickoff.localeCompare(b.kickoff));
        const results = all.filter((m) => m.status === "FINISHED").sort((a, b) => b.kickoff.localeCompare(a.kickoff));
        return (
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <MatchList
              title={t("team.upcoming")}
              icon={<CalendarDays size={16} className="text-ink-3" />}
              matches={upcoming}
              showDate
              highlightTeamId={team.id}
              empty={<EmptyState title={t("team.noUpcoming")} className="py-10" />}
            />
            <MatchList
              title={t("team.results")}
              icon={<History size={16} className="text-ink-3" />}
              matches={results}
              showDate
              highlightTeamId={team.id}
              empty={<EmptyState title={t("team.noResults")} className="py-10" />}
            />
          </div>
        );
      }}
    </QueryState>
  );
}

const POSITIONS: Position[] = ["GK", "DF", "MF", "FW"];

export function TeamSquadTab({ team }: { team: TeamDetail }) {
  const { t } = useI18n();
  if (team.squad.length === 0) {
    return (
      <Card>
        <EmptyState icon={<Users size={22} />} title={t("team.noSquad")} />
      </Card>
    );
  }
  const groups = POSITIONS.map((pos) => ({
    pos,
    players: team.squad.filter((p) => p.position === pos).sort((a, b) => (a.number ?? 999) - (b.number ?? 999) || a.name.localeCompare(b.name)),
  })).filter((g): g is { pos: Position; players: SquadPlayer[] } => g.players.length > 0);

  return (
    <Card>
      <CardHeader
        title={t("tabs.squad")}
        icon={<Users size={16} />}
        action={<span className="text-[13px] font-semibold text-ink-3 tnum">{team.squad.length}</span>}
      />
      {groups.map((g) => (
        <SquadList key={g.pos} title={t(`squad.${g.pos}`)} players={g.players} />
      ))}
    </Card>
  );
}

export function TeamTransfersTab({ team }: { team: TeamDetail }) {
  const { t } = useI18n();
  const transfers = useTeamTransfers(team.slug);
  return (
    <QueryState
      query={transfers}
      loading={
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonCard rows={4} rowClassName="h-12" />
          <SkeletonCard rows={4} rowClassName="h-12" />
        </div>
      }
    >
      {(all) => {
        if (all.length === 0) {
          return (
            <Card>
              <EmptyState icon={<Repeat size={22} />} title={t("transfers.none")} />
            </Card>
          );
        }
        const sections = [
          { key: "in", title: t("transfers.arrivals"), icon: <ArrowDownLeft size={16} className="text-win" />, items: all.filter((x) => x.direction === "IN") },
          {
            key: "out",
            title: t("transfers.departures"),
            icon: <ArrowUpRight size={16} className="text-loss" />,
            items: all.filter((x) => x.direction === "OUT"),
          },
        ];
        return (
          <div className="space-y-4">
            {sections.map((s) => (
              <Card key={s.key}>
                <CardHeader title={s.title} icon={s.icon} action={<span className="text-[13px] font-semibold text-ink-3 tnum">{s.items.length}</span>} />
                {s.items.length ? (
                  <div className="divide-y divide-line">
                    {s.items.map((tr) => (
                      <TransferRow key={tr.id} transfer={tr} />
                    ))}
                  </div>
                ) : (
                  <EmptyState title={t("transfers.none")} className="py-8" />
                )}
              </Card>
            ))}
          </div>
        );
      }}
    </QueryState>
  );
}
