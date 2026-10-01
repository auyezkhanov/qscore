import { LogIn, Trophy } from "lucide-react";
import type { LeaderboardRow, PredictionLeaderboard } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader } from "@/shared/ui/Card";
import { EmptyState } from "@/shared/ui/States";

const MEDALS: Record<number, string> = {
  1: "bg-amber-400 text-black",
  2: "bg-slate-300 text-black",
  3: "bg-orange-400 text-black",
};

const COLS = "grid grid-cols-[2rem_minmax(0,1fr)_2.75rem_2.75rem_3rem] items-center gap-x-2 px-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_4.5rem_4.5rem_4rem] sm:px-5";

/** Top 50 by points; the viewer's row is highlighted, or pinned underneath when outside the top. */
export function LeaderboardTab({ board, signedIn, onRequireAuth }: { board: PredictionLeaderboard; signedIn: boolean; onRequireAuth: () => void }) {
  const { t } = useI18n();
  const meInTop = board.top.some((r) => r.isMe);

  return (
    <Card>
      <CardHeader
        title={t("predictor.board.top")}
        icon={<Trophy size={17} />}
        action={board.total > 0 && <span className="text-xs font-semibold text-ink-3 tnum">{t("predictor.board.participants", { n: board.total })}</span>}
      />
      {board.top.length === 0 ? (
        <EmptyState icon={<Trophy size={22} />} title={t("predictor.board.empty.title")} text={t("predictor.board.empty.text")} />
      ) : (
        <>
          <div aria-hidden className={cn(COLS, "py-2 text-[11px] font-bold uppercase tracking-wide text-ink-3")}>
            <span className="text-center">#</span>
            <span>{t("predictor.board.player")}</span>
            <span className="text-center" title={t("predictor.col.exactFull")}>
              {t("predictor.col.exact")}
            </span>
            <span className="text-center" title={t("predictor.col.predictionsFull")}>
              {t("predictor.col.predictions")}
            </span>
            <span className="text-right">{t("predictor.col.points")}</span>
          </div>
          <ol aria-label={t("predictor.board.top")}>
            {board.top.map((row) => (
              <BoardRow key={`${row.rank}-${row.name}`} row={row} />
            ))}
            {board.me && !meInTop && (
              <>
                <li aria-hidden className="border-t border-line py-0.5 text-center text-ink-3">
                  ⋯
                </li>
                <BoardRow row={board.me} />
              </>
            )}
          </ol>
        </>
      )}
      {!signedIn && (
        <div className="flex flex-col items-center gap-2 border-t border-line px-4 py-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-sm text-ink-2">{t("predictor.signInText")}</p>
          <Button size="sm" onClick={onRequireAuth} className="shrink-0">
            <LogIn size={15} />
            {t("predictor.signInCta")}
          </Button>
        </div>
      )}
    </Card>
  );
}

function BoardRow({ row }: { row: LeaderboardRow }) {
  const { t } = useI18n();
  const label = t("predictor.board.rowAria", { rank: row.rank, name: row.name, points: row.points, exact: row.exact, predictions: row.predictions });
  return (
    <li aria-label={label} aria-current={row.isMe || undefined} className={cn(COLS, "border-t border-line py-2.5 text-sm", row.isMe && "bg-brand/10")}>
      <span aria-hidden className="flex justify-center">
        <span className={cn("inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1 text-xs font-bold tnum", MEDALS[row.rank] ?? "text-ink-2")}>
          {row.rank}
        </span>
      </span>
      <span aria-hidden className="flex min-w-0 items-center gap-2">
        <span className={cn("truncate font-semibold", row.isMe && "text-brand")}>{row.name}</span>
        {row.isMe && <span className="shrink-0 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand-fg">{t("predictor.board.you")}</span>}
      </span>
      <span aria-hidden className="text-center text-ink-2 tnum">
        {row.exact}
      </span>
      <span aria-hidden className="text-center text-ink-2 tnum">
        {row.predictions}
      </span>
      <span aria-hidden className="text-right text-[15px] font-extrabold tnum">
        {row.points}
      </span>
    </li>
  );
}
