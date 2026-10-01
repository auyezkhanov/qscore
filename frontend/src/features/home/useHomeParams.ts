import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { dayKey, isSameDay, parseDayKey, startOfDay } from "@/shared/lib/date";

/**
 * Home feed state that belongs in the URL: the selected local day (`?date=YYYY-MM-DD`,
 * absent = today, invalid = today) and the league filter (`?league=slug`).
 */
export function useHomeParams() {
  const [params, setParams] = useSearchParams();
  const dateParam = params.get("date");
  const league = params.get("league");
  const todayKey = dayKey(new Date());

  const day = useMemo(
    () => parseDayKey(dateParam) ?? parseDayKey(todayKey) ?? startOfDay(new Date()),
    [dateParam, todayKey],
  );

  const update = useCallback(
    (key: string, value: string | null) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set(key, value);
          else next.delete(key);
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  const setDay = useCallback((d: Date) => update("date", isSameDay(d, new Date()) ? null : dayKey(d)), [update]);
  const setLeague = useCallback((slug: string | null) => update("league", slug), [update]);

  return { day, setDay, league, setLeague };
}
