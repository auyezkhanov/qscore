import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { useSearch } from "@/shared/api/queries";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { useDismiss } from "@/shared/hooks/useDismiss";
import { cn } from "@/shared/lib/utils";
import { TeamLogo } from "@/shared/ui/TeamLogo";
import { PlayerAvatar } from "@/shared/ui/PlayerAvatar";

type Option = { key: string; href: string };

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

/** Search over teams and players with keyboard navigation (↑/↓/Enter/Esc). */
export function SearchBox({ autoFocus = false, onNavigate, className }: { autoFocus?: boolean; onNavigate?: () => void; className?: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const term = useDebounced(query, 200);
  const { data, isFetching } = useSearch(term);

  const close = useCallback(() => setOpen(false), []);
  useDismiss(root, open, close);

  const teams = data?.teams ?? [];
  const players = data?.players ?? [];
  const options: Option[] = [
    ...teams.map((x) => ({ key: `t:${x.id}`, href: `/team/${x.slug}` })),
    ...players.map((x) => ({ key: `p:${x.id}`, href: `/player/${x.slug}` })),
  ];

  useEffect(() => setCursor(0), [term]);

  const go = (href: string) => {
    setQuery("");
    setOpen(false);
    input.current?.blur();
    navigate(href);
    onNavigate?.();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && options[cursor]) {
      e.preventDefault();
      go(options[cursor].href);
    } else if (e.key === "Escape") {
      setOpen(false);
      input.current?.blur();
    }
  };

  const showPanel = open && query.trim().length > 0;
  const tooShort = query.trim().length < 2;
  let index = -1;

  return (
    <div ref={root} className={cn("relative w-full", className)}>
      <label className="flex h-10 items-center gap-2 rounded-full bg-surface-2 px-3.5 ring-1 ring-transparent transition focus-within:bg-surface focus-within:ring-brand/50">
        <Search size={16} className="shrink-0 text-ink-3" />
        <input
          ref={input}
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t("search.placeholder")}
          aria-label={t("search.open")}
          role="combobox"
          aria-expanded={showPanel}
          aria-autocomplete="list"
          className="w-full bg-transparent text-sm outline-none placeholder:text-ink-3 [&::-webkit-search-cancel-button]:hidden"
          type="search"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label={t("search.clear")} className="shrink-0 rounded-full p-0.5 text-ink-3 hover:text-ink">
            <X size={15} />
          </button>
        )}
      </label>

      {showPanel && (
        <div role="listbox" className="absolute left-0 right-0 top-full z-40 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-line bg-surface py-1.5 shadow-pop animate-pop-in">
          {tooShort ? (
            <p className="px-4 py-3 text-sm text-ink-3">{t("search.hint")}</p>
          ) : options.length === 0 ? (
            <p className="px-4 py-3 text-sm text-ink-3">{isFetching || term !== query ? t("common.loading") : t("search.empty")}</p>
          ) : (
            <>
              {teams.length > 0 && <p className="px-4 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-ink-3">{t("search.teams")}</p>}
              {teams.map((team) => {
                index++;
                const i = index;
                return (
                  <button
                    key={team.id}
                    type="button"
                    role="option"
                    aria-selected={cursor === i}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => go(`/team/${team.slug}`)}
                    className={cn("flex w-full items-center gap-3 px-4 py-2 text-left", cursor === i && "bg-surface-2")}
                  >
                    <TeamLogo team={team} size="md" />
                    <span className="truncate text-sm font-semibold">{team.name}</span>
                  </button>
                );
              })}
              {players.length > 0 && <p className="px-4 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-ink-3">{t("search.players")}</p>}
              {players.map((p) => {
                index++;
                const i = index;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="option"
                    aria-selected={cursor === i}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => go(`/player/${p.slug}`)}
                    className={cn("flex w-full items-center gap-3 px-4 py-2 text-left", cursor === i && "bg-surface-2")}
                  >
                    <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{p.name}</span>
                      <span className="flex items-center gap-1.5 truncate text-xs text-ink-3">
                        <TeamLogo team={p.team} size="xs" />
                        {p.team.name} · {t(`position.${p.position}` as const)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
