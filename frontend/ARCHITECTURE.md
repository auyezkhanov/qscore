# Frontend architecture

React 18 + TypeScript (strict) + Vite + Tailwind CSS 3 + TanStack Query 5 + React Router 6.

## Layout

```
src/
  app/          App shell, router (lazy routes), ErrorBoundary
  layout/       Header, SearchBox, SettingsMenu, MobileNav, Footer, SyncBanner
  pages/        One file per route, default export. Thin: compose feature components.
  features/     Domain UI grouped by feature (matches, standings, match, league, team,
                player, news, transfers, home, auth, favorites, theme)
  shared/
    api/        client.ts (fetch wrapper, ApiError), types.ts (DTOs), queries.ts (ALL React Query hooks)
    i18n/       ru.ts (source of keys), en.ts (must mirror every key), LanguageProvider (useI18n)
    lib/        date.ts (local-timezone calendar helpers), utils.ts (cn, signed, flagEmoji, resultFor, youtubeEmbedUrl)
    hooks/      useDismiss (click-outside/Escape), useDocumentTitle
    ui/         Design-system primitives (see below)
```

## Rules

- **Data**: only via hooks in `shared/api/queries.ts`. Every hook puts `lang` in the query key; the
  backend returns names already localized. Never fetch in components directly.
- **Loading / error / 404**: wrap query results in `<QueryState query={...} loading={...} notFound={<NotFoundState titleKey="notFound.team" />}>`.
  Never render a skeleton forever when a request failed.
- **Dates**: calendar days are the viewer's LOCAL days — use `shared/lib/date.ts`
  (`dayKey`, `dayRange`, `formatTime`, `formatDate`, `formatRelative`). Never `toISOString().slice(0, 10)`.
- **i18n**: `const { t, lang, locale } = useI18n()`. Keys are typed; add new keys to BOTH `ru.ts` and `en.ts`.
- **Styling**: Tailwind with semantic tokens only — `bg-bg`, `bg-surface`, `bg-surface-2/3`, `border-line`,
  `text-ink`, `text-ink-2`, `text-ink-3`, `text-brand`/`bg-brand`, `text-live`, `bg-win/draw/loss`.
  They switch automatically in dark mode; don't hand-write `dark:` grays. Use `.card` for cards,
  `.row-hover` for clickable rows, `.tnum` for numbers in columns.
- **Tabs** sync to `?tab=` via `useTabParam(keys, fallback)`.
- **Page title**: `useDocumentTitle(name)` on entity pages.
- Components are function components with named exports (pages: default export). No `any`.

## Primitives (`shared/ui`)

| Component | Purpose |
|---|---|
| `Card`, `CardHeader`, `CardLink`, `CardFooterLink`, `SectionLabel` | Card container and its parts |
| `Tabs`, `useTabParam` | Scrollable tab bar, URL-synced state |
| `QueryState`, `EmptyState`, `ErrorState`, `NotFoundState` | Async states |
| `Skeleton`, `SkeletonRows`, `SkeletonCard` | Loading placeholders |
| `TeamLogo`, `PlayerAvatar`, `LeagueBadge` | Crest / photo / league logo with fallbacks |
| `FormBadge` | W/D/L pill (optionally with a score label) |
| `Button`, `IconButton`, `ToggleChip`, `Segmented`, `Modal` | Controls |
| `Container`, `Page` | Page width + vertical rhythm |

Shared domain components: `features/matches/MatchRow` (`MatchRow`, `MatchList`),
`features/matches/MatchStatus` (`MatchStatusLabel`, `LiveDot`, `isLive`, `hasScore`),
`features/standings/StandingsTable`, `features/transfers/TransferRow`, `features/favorites/FavoriteButton`.

## Added in v2.1 (FotMob-style features)

Shared pieces — reuse, don't re-implement:

| Piece | Where | Notes |
|---|---|---|
| `RatingBadge`, `ratingTone` | `shared/ui/RatingBadge` | 3–10 player rating pill (FotMob colour bands); `star` = player of the match |
| `BroadcasterList` | `features/broadcast/BroadcasterList` | "Where to watch" chips (logo + name, links out) |
| `PushProvider` / `usePush`, `FollowButton` | `features/push/*` | Web push. `<FollowButton kind="team"|"match" id={…} />` toggles notifications |
| `formatMoney` | `shared/lib/utils` | Compact € amounts |
| Hooks | `shared/api/queries.ts` | `useMatchPreview`, `useMatchVotes` + `castVote`, `useTvSchedule`, `useTeamStats`, `useTopPlayers(slug, LeaderStat)`, `useSeasons`, `useArchivedStandings`, `useArchivedRounds`, `useMarketValueHistory`, `usePredictionFixtures`, `usePredictionLeaderboard`, `calendarUrl()` |

Mutations: use `useQueryClient()` + `request()` (or `castVote`) and then `setQueryData` /
`invalidateQueries` on the matching query key; show pending/error states on the control.
