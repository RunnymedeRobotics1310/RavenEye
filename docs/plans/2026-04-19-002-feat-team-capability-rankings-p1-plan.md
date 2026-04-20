---
title: "feat: Team Capability Rankings (P1) — Tournament Teams Card + Match Teams Table"
type: feat
status: active
date: 2026-04-19
origin: docs/brainstorms/2026-04-17-team-capability-rankings-requirements.md
---

# Team Capability Rankings (P1) — Tournament Teams Card + Match Teams Table

**Target repos:** `RavenBrain` (new `statboticsapi` package, TBA OPR extension, V35 migration, team-capability enricher + endpoint) and `RavenEye` (Tournament Teams card on `/report/schedule/:tournamentId`, Match Teams table on `/strategy/:tournamentId/:level/:match`). All file paths below are monorepo-relative, prefixed with `RavenBrain/` or `RavenEye/`.

**Builds on:**
- P0 TBA Data Foundation plan at `RavenEye/docs/plans/2026-04-18-001-feat-tba-data-foundation-plan.md` — the `tbaapi` package pattern (`fetch` / `service` / `model` sub-packages, TTL + ETag caching, `@Scheduled` sync, `AtomicBoolean`-gated force-sync endpoint, masked-key startup logging).
- TBA Match Videos plan at `RavenEye/docs/plans/2026-04-18-002-feat-tba-match-videos-plan.md` — the enricher pattern (`MatchVideoEnricher`), the additive-response shape with per-row `source` + `stale`, the alliance-composition identity join, and the schedule-report augmentation pattern.

## Overview

Fuse three data sources (TBA OPR, Statbotics EPA with per-phase breakdown, and our own scouting aggregates) into a single per-tournament capability view, and expose it on the two surfaces strat reaches for most during an event:

1. A **Tournament Teams card** at the bottom of the team-schedule page listing every team at the tournament, sortable by any column, default OPR desc.
2. A **Match Teams table** at the top of the match strategy page listing only the 6 (or 7–8) teams in the current match, grouped by alliance (red / blue), with within-alliance ranks (1–3) next to each numeric column.

Backend work adds a new `ca.team1310.ravenbrain.statboticsapi` package mirroring `tbaapi`, extends `tbaapi` with an OPR sync off TBA's `/event/{key}/oprs`, adds a `TeamCapabilityEnricher` that joins OPR × Statbotics × scouting aggregates in memory, and exposes `GET /api/team-capability/{tournamentId}`. Frontend adds two components, one endpoint wrapper, one IndexedDB store, and integration into the existing 3-minute auto-sync.

## Problem Frame

Team 1310's strat team currently jumps between RavenEye (schedule, scouting), thebluealliance.com (OPR, match metadata), and statbotics.io (EPA for pick lists) during every tournament. The split forces context-switching at the highest-pressure moments — alliance selection, pre-match opponent sizing, and in-match strategy prep. Scouting has deliberately stopped capturing data TBA/Statbotics already expose, so the solution is fusion: consume the public quantitative feeds, layer scouting on top, and surface the result inside RavenEye (see origin: `docs/brainstorms/2026-04-17-team-capability-rankings-requirements.md`).

P0 established the TBA plumbing. P1 lights up the view strat actually uses.

## Requirements Trace

From the origin document:

- **R6** — New "Tournament Teams" card on the existing team-schedule page (below the Schedule / Bracket / Rankings stack). [Units 6, 7]
- **R7** — Columns: overall OPR, Statbotics overall EPA, per-phase EPA (auto / teleop / endgame), scouting-derived signals. [Units 2, 3, 4, 5, 7, 8]
- **R8** — Sortable by any column; default OPR desc; row click → team-summary page. [Units 7, 8]
- **R9** — Works during active tournaments on the same 3-minute cadence as the schedule card; upstream Statbotics / TBA syncs run on a slower, cache-respecting schedule that respects external-API rate limits regardless of how many tablets are open. [Units 1, 2, 3, 6]
- **R10** — Graceful degrade for missing Statbotics data (Week 1 events) and thin scouting coverage; per-row `—` display with no rank, per-feed staleness flags computed server-side. [Units 5, 7, 8]
- **R11** — Match Teams table on `/strategy/{tournamentId}/{level}/{matchNumber}` above the strategy diagrams; 6 (or 7–8) teams; same columns as R7; grouped by alliance (red / blue) with CB-safe colour + redundant non-colour channel; within-alliance ranks (1–3) in the `.schedule-team-rank` style; missing data shows `—` and no rank; stats render as input above the diagrams. [Units 6, 8]
- **P1 success criterion** (origin) — Next in-person tournament, strat uses the Tournament Teams card as primary pick-list reference and consults the Match Teams table before each strategy session. Measurement is observational, per the "adoption-measure-then-cut" standing decision.

## Scope Boundaries

- **OPR comes from TBA, not FRC or Statbotics.** Statbotics does not expose OPR; FRC API exposes rankings only (no OPR). TBA's `/event/{key}/oprs` already fits the existing `tbaapi` plumbing. One new method on `TbaClientService`, one new table.
- **No phase concept in `strategyarea` / `eventtype` coupling.** Statbotics per-phase EPAs land in flat columns on the per-team-per-event row (`epa_auto`, `epa_teleop`, `epa_endgame`, `epa_total`) plus a `breakdown_json` TEXT column for season-specific drill-down. Coupling to `strategyarea` is deferred until P3 partner-fit scoring actually needs weighted phase aggregation.
- **No P2 / P3 work in scope.** Season-arc visualization (P2 / R12), partner-fit / synergy scoring (P3 / R13), pick-list annotations (R14), match win-probability (R15) are explicitly out.
- **No admin force-sync button in RavenEye.** Curl-only force sync for both Statbotics and TBA OPR, mirroring the P0 decision. Deferred to a follow-up if tournament-day lag becomes a real pain.
- **No new season-wide EPA endpoint.** `/v3/team_year` / `/v3/team_years` batching is out of scope — the card is tournament-scoped, and Statbotics per-event EPA already has what we need.
- **No scope for per-team Statbotics sync outside the watched / active tournament window.** Mirror P0 / P1 TBA scoping: sync runs only for tournaments with a non-blank `tba_event_key` in the watched ∪ team-owner set ∩ active-or-upcoming filter.
- **Practice matches excluded from match-teams alliance grouping.** The Match Teams table does not render for Practice rows (consistent with scouting-report convention).

### Deferred to Separate Tasks

- **Admin force-sync button** for Statbotics and TBA OPR — curl path works; UI button is a small follow-up.
- **Live-tournament cadence tuning** — `@Scheduled(fixedDelay = "1h")` default; a faster cadence during active tournaments is optimisation work if strat reports lag.
- **Bulk season-wide EPA** (`/v3/team_years`) — only needed for P2 season-arc.
- **Direct Statbotics OPR** (once / if Statbotics ever exposes it) — use TBA for now.
- **Admin rate limiting knob** — the 5-minute force-sync interval guard starts as a constant. Making it admin-configurable is deferred until it becomes a real pain.

## Context & Research

### Relevant Code and Patterns

All paths are **RavenBrain** unless stated otherwise.

**TBA pattern to mirror for Statbotics:**
- `src/main/java/ca/team1310/ravenbrain/tbaapi/fetch/TbaCachingClient.java` — TTL + ETag + Last-Modified caching. Statbotics has no conditional-request headers so the caching client is simpler (TTL-only) but follows the same interface shape.
- `src/main/java/ca/team1310/ravenbrain/tbaapi/fetch/TbaClient.java` — HTTP entry point.
- `src/main/java/ca/team1310/ravenbrain/tbaapi/fetch/TbaRawResponse.java` + `TbaRawResponseRepo.java` — raw response cache table entity + repo (`RB_TBA_RESPONSES`). Mirror exactly for `RB_STATBOTICS_RESPONSES`. **Primitive `boolean` / `int` fields on the record require NOT NULL columns** — P0 surfaced this; repeat the discipline.
- `src/main/java/ca/team1310/ravenbrain/tbaapi/service/TbaClientService.java` — parse boundary, outcome enum pattern, URL-encoded path segments. `getEvent(key)` is the canonical shape.
- `src/main/java/ca/team1310/ravenbrain/tbaapi/service/TbaEventSyncService.java` — `@Scheduled` iteration pattern over watched ∪ active tournaments with non-blank event keys; `persistSuccess` / `persistStatusOnly` failure-path separation that preserves prior data.
- `src/main/java/ca/team1310/ravenbrain/tbaapi/service/TbaSyncApi.java` — force-sync controller + `AtomicBoolean syncInProgress` gate; returns 202 on acquire, 409 on contention.
- `src/main/resources/application.yml` (existing `raven-eye.tba-api.*` block lines 55–76) — config shape to mirror for `raven-eye.statbotics-api.*`.
- `src/main/resources/db/migration/V30__tournament_tba_and_manual_webcasts.sql`, `V31__tba_responses.sql`, `V32__tba_event.sql`, `V33__tba_match_video.sql` — Flyway style + raw-cache column convention.

**Enricher pattern to mirror:**
- `src/main/java/ca/team1310/ravenbrain/matchvideo/MatchVideoEnricher.java` — one batched lookup per external source, join in memory, return the full row set with per-entry `source` + `stale`. `TeamCapabilityEnricher` follows the same shape: load team list once, load OPR once, load Statbotics rows once, load scouting aggregates once, join in memory.
- `src/main/java/ca/team1310/ravenbrain/tournament/TournamentEnricher.java` — P0 enricher that merges TBA + manual webcasts with staleness flags. Confirms the read-time merge + server-computed staleness convention.

**Schedule-page augmentation pattern:**
- `RavenEye/app/routes/report/team-schedule-page.tsx:849–971` — render order today: page-header → `QueueBanner` → webcast link row → `scheduleSections.map(...)` (Elim / Qual / Practice) → `RankingsTable` → nexus attribution. **Tournament Teams card inserts after `<RankingsTable>` and before the nexus attribution paragraph** per R6.
- `RavenEye/app/routes/report/team-schedule-page.tsx:381–422` (`RankingsTable`) — closest template for a read-only, sorted, highlight-owner-row card.
- `RavenEye/app/assets/css/components.css:2818` (`.schedule-team-rank`) — small parenthesised rank style. **Reuse the class, do not redefine.** R11 rank renderers use this class directly.
- `RavenEye/app/routes/strategy/strategy-plan-page.tsx:859–1254` — strategy page layout: page-header → `<div className="strategy-plan-grid">` wrapping left sidebar + right canvas cards. **Match Teams table inserts as a new `<section className="card">` between the page-header (line ~892) and the `strategy-plan-grid` open (line ~894).**
- `RavenEye/app/routes/strategy/strategy-plan-page.tsx:187` (`teamNumbersForMatch()`) — returns only R1–3 / B1–3. **Extend to include slot 4 when non-zero** to support 4-team playoff alliances and surrogates. The underlying `RBScheduleRecord.red4` / `blue4` columns are already populated (confirmed in `RavenEye/app/types/RBScheduleRecord.ts:6–13`).
- `RavenEye/app/routes/strategy/strategy-plan-page.tsx:214` (`ownerAllianceFromSchedule`) — existing helper for owner alliance detection; the Match Teams table reuses the same logic to label alliance membership on each row.

**Data sources for team roster and scouting aggregates:**
- `src/main/java/ca/team1310/ravenbrain/tournament/TeamTournamentService.java` — `findTeamNumbersForTournament(tournamentId)` + `findTeamNamesForTournament(tournamentId)`. Authoritative team roster source; no HTTP endpoint today. (Sibling to `TournamentEnricher` and `TournamentApi` in the same `tournament` package.)
- `src/main/java/ca/team1310/ravenbrain/report/CustomTournamentStatsService.java` — per-(team, tournamentId) averages for `auto-number-shot`, `auto-number-missed`, `scoring-number-success`, `scoring-number-miss`, `pickup-number`. **Currently iterates one team at a time.** Unit 4 adds a batched `getAggregatesForAllTeams(tournamentId)` that hits the event-log + quick-comment + robot-alert repos once and returns per-team rows.
- `src/main/java/ca/team1310/ravenbrain/quickcomment/QuickCommentService.java` — per-team quick-comment repo.
- `src/main/java/ca/team1310/ravenbrain/robotalert/RobotAlertService.java` — per-team robot-alert repo with severity.

**Frontend fetch + sync infrastructure (all from the 2026-04-19 network-communication-refinement, now fully landed on main — see `RavenEye/docs/architecture.md` for the full posture):**
- `RavenEye/app/common/storage/rb.ts` — `rbfetch` + per-entity API wrappers. Unit 6 adds `getTeamCapability(tournamentId)` using **`cacheFetch`** (not raw `rbfetch`).
- `RavenEye/app/common/storage/cacheFetch.ts` — conditional-GET abstraction. Sends `If-None-Match` on the next call, returns cached body on 304 without re-parse. ETags persisted per-URL in the `apiEtags` IndexedDB store. Writes + anonymous endpoints bypass the cache layer.
- `RavenEye/app/common/storage/syncConfig.ts` — server-delivered sync cadences. Tournament-window and off-window cadences come from config, not hand-tuned in sync.ts.
- `RavenEye/app/common/storage/tournamentWindow.ts` — tournament-window membership via `serverNow()` against `activeFrom` / `activeUntil`. **Answers the "pre-tournament prep" concern**: the window includes lead-in time configured server-side, so Thursday-night prep for a Friday start is inside the window automatically.
- `RavenEye/app/common/storage/db.ts` — IndexedDB repository. Unit 6 adds a new `teamCapability` object store keyed by tournamentId.
- `RavenEye/app/common/storage/cacheClear.ts` — `clearDataCaches()` wipes read-only caches on logout / username change. Unit 6 adds the team-capability store to this wipe path.
- `RavenEye/app/common/sync/sync.ts` — **two-loop scheduler with inline `JOBS` array**. Adding team-capability is one new entry in the `JOBS` array declaring cadence + precondition + run. No hand-rolled interval.

### Institutional Learnings

No `docs/solutions/` directory exists in either repo. The closest knowledge base is the planning / design-doc corpus. Key learnings lifted from prior plans (TBA P0, TBA match videos, network-comm refinement):

- **Server computes staleness; client renders it.** `webcastsStale` / per-row `stale` is the established pattern — never compute from timestamps in React.
- **Disjoint writers invariant.** External-source sync services never write to admin-owned tables, and vice versa. `statboticsapi` and `tbaapi` own their `RB_STATBOTICS_*` / `RB_TBA_*` tables; the enricher only reads.
- **URL-encode admin-supplied path segments** (event keys) before concatenation — injection-prevention discipline established in P0.
- **Mask external keys at startup** — log "Statbotics: unauthenticated" / "TBA API key: configured" — never the value, prefix, or length. Statbotics has no key but keeping the logging posture consistent prevents drift.
- **CB-safe UI is a standing convention.** Paul Tol vibrant palette + redundant non-colour channel (text label, icon, or pattern). Existing `.badge-tba`, `.badge-manual`, `.banner-info` CSS in `RavenEye/app/assets/css/components.css` is the working prior art.
- **Flyway numbering trap.** V33 = TBA match videos; V34 = updated_at_columns (landed with network-comm refinement Unit 1). **P1 migrations start at V35.** Each prior plan has flagged this trap — verify at implementation time before writing migration files.
- **Adoption-measure-then-cut.** Success criterion is observational; if strat doesn't use it at the next real tournament, remove the code rather than prop it up.
- **`cacheFetch` is the default for GET.** The network-comm refinement made `rbfetch` the low-level primitive and `cacheFetch` the standard wrapper. Every offline-capable GET goes through `cacheFetch`; raw `fetch()` survives only on two documented anonymous endpoints. P1 capability reads go through `cacheFetch`.
- **Server owns the tournament window.** `TournamentResponse.activeFrom` / `activeUntil` are server-computed; `tournamentWindow.ts` helpers derive "in-window" locally via `serverNow()`. Sync preconditions and "upcoming" scope reuse this — no separate heuristic.
- **Two-loop sync scheduler with `JOBS` registry.** New syncs are one entry in the `JOBS` array in `sync.ts`. No more hand-rolled `setInterval` per feature.

### External References

- **Statbotics API docs:** https://www.statbotics.io/api/rest
- **Statbotics OpenAPI:** https://api.statbotics.io/openapi.json (v3.0.0 at time of planning)
- **Batch team-event endpoint:** `GET /v3/team_events?event={event_key}&limit=1000` — one HTTP call returns all ~80 teams for a single event with full `epa.breakdown` per team.
- **2026 per-phase EPA field names:** `epa.breakdown.auto_points`, `epa.breakdown.teleop_points`, `epa.breakdown.endgame_points`, `epa.breakdown.total_points` (verified live from `/v3/team_year/1310/2026` during planning research).
- **Cross-season fields:** `epa.unitless` (integer-scaled across years) and `epa.norm` (normalized EPA — the old `norm_epa`).
- **No auth, no ETag, no Last-Modified.** 405 on HEAD. TTL-only caching posture. Abhi's note in the OpenAPI description: "Please be nice to our servers!" No `X-RateLimit-*` headers. Informal courtesy: include a `User-Agent: StratApp/<version> (+https://raveneye.team1310.ca)` header.
- **Season-specific breakdown keys.** `breakdown` will contain 2026-specific fields (e.g. `auto_fuel`, `energized_rp`) in addition to the stable `*_points` fields. Store as JSON blob alongside named columns for cross-season durability.
- **TBA OPR endpoint:** `GET /event/{event_key}/oprs` — returns `{ oprs: {team_key: value}, dprs: {...}, ccwms: {...} }`. Reuse existing TBA caching client exactly.

## Key Technical Decisions

- **Mirror the P0 package structure in a new `ca.team1310.ravenbrain.statboticsapi` package.** Sub-packages `fetch` / `service` / `model` exactly match `tbaapi`. This is the motivation the origin brainstorm calls out: "avoiding duplicate API-client plumbing — by establishing the package pattern now, P1's Statbotics work reuses the same structure instead of re-inventing caching/auth/error handling."
- **TTL-only caching for Statbotics.** No conditional-request headers were observed during research. Keep the cache-response table shape identical to `RB_TBA_RESPONSES` (with `etag` and `lastmodified` columns) for structural parity, but expect them to stay `NULL` for every Statbotics row. One cache table per external source preserves provenance.
- **Batch endpoint, not per-team fetch.** `/v3/team_events?event={key}&limit=1000` collapses the Statbotics sync from ~80 HTTP calls per event to 1. Matches the batch posture TBA match-videos established.
- **OPR from TBA, not Statbotics.** Statbotics does not expose OPR. Extend `tbaapi` with `getEventOprs(key)` and a new `RB_TBA_EVENT_OPRS` table. Reuses every piece of existing TBA plumbing — one new method, one new record, one new repo, one sync line added to the existing TBA scheduled job.
- **Per-phase EPA storage: flat columns + `breakdown_json`.** First-class columns for `epa_total`, `epa_auto`, `epa_teleop`, `epa_endgame`, `epa_unitless`, `epa_norm` (stable across seasons). Full `epa.breakdown` stored as JSON TEXT for season-specific drill-down. Avoids yearly schema churn; lets the card render without JSON parsing at read time.
- **Server-computed staleness booleans.** `epaStale`, `oprStale` computed in the enricher (e.g. `last_status != 200` for the per-row status flag; a 24-hour time-window flag optional for "data present but stale"). Client renders; never computes.
- **Enricher does batched joins, never per-team fetches.** `TeamCapabilityEnricher.enrich(tournamentId)` loads: the team roster (one query), OPR rows for the tournament (one query), Statbotics rows for the tournament (one query), scouting aggregates for the tournament (one query via Unit 4's batched service). Joins in memory. Matches `MatchVideoEnricher` precisely.
- **Cadence: `fixedDelay = "1h"` for both Statbotics and TBA OPR syncs.** Tunable via `application.yml` (not hardcoded in annotation — use `@Scheduled(fixedDelay = "${raven-eye.sync.statbotics-team-event-poll}")` per the network-comm refinement plan's sync-config centralization.). Per-sync summary log ("Statbotics sync: X tournaments, Y team-event rows written, Z failures") for adoption-measure-then-cut.
- **Scope filter duplicated inline, not promoted.** Mirror P0 match-videos sync: `getActiveTournamentsToSync()` is private in the `frcapi` package and cannot be promoted without cross-package refactoring. Copy the 3-line filter into both `StatboticsTeamEventSyncService` and the TBA OPR sync (if it lives in its own service).
- **CB-safe palette for alliance colour.** Red / blue on the Match Teams table uses the Paul Tol vibrant palette + a redundant non-colour channel (alliance label column or icon). The existing `.badge-tba` / `.badge-manual` / `.banner-info` CSS demonstrates the pattern.
- **Ship atomically, not in phases.** Backend-first was explicitly rejected in the origin brainstorm (Approach C) — visible value ships with the data layer. One RB PR + one RE PR, opened together via `/kd-pr`. **Merge order**: RB first, RE second. Tournament season is ended so short-window breakage from reverse order is tolerable; the constraint matters when tournaments resume.
- **Within-alliance ranks, not within-match ranks.** R11 explicitly specifies per-alliance ranking (1–3 or 1–4) — not 1–6 across both alliances. Computed in the frontend from the response payload, once per numeric column.
- **Rank suppression rules**: (a) when an alliance has only one non-null value in a column, render the value with **no rank** (a "(1)" would imply best-of-three). (b) When all alliance values in a column are equal (spread = 0), render all values with **no rank** (`0 (1), 0 (1), 0 (1)` is noise on integer-count columns).
- **Withdrawn teams render with strikethrough.** Statbotics drops withdrawn teams mid-event; TBA keeps them in the event team list. The enricher detects "team in `RB_TEAM_TOURNAMENT` but absent from the latest Statbotics roster sync" and marks the row with a `withdrawn` flag; the UI renders the row with strikethrough and sorts it last regardless of column direction.
- **No admin force-sync UI.** Curl-only force sync for parity with P0. Deferred to a follow-up if tournament-day lag becomes a real pain.
- **Force-sync interval guard: 5 minutes.** `POST /api/statbotics-sync` rejects with 429 if a successful sync completed within the last 5 minutes. Stored as a `lastSuccessfulSyncAt` timestamp alongside the `AtomicBoolean`. Prevents accidental or compromised-token spam against Statbotics' "please be nice" posture.
- **Default sort OPR desc — arbitrary, strat adjusts.** Tony confirmed strat uses both OPR and EPA; the default is a placeholder to be revised after first-tournament feedback. Documented so the choice isn't over-interpreted as a premise claim.
- **IDOR posture: accept `IS_AUTHENTICATED`.** `GET /api/team-capability/{tournamentId}` is accessible to any authenticated user regardless of whether their team attends the tournament. The exposed data (aggregate scouting signals for opposing teams at other tournaments) is low-sensitivity for a student-team context; tournament-ownership scoping adds code without meaningful risk reduction. Decision recorded to prevent silent drift if this is revisited.
- **Coverage classifier uses event-log coverage only.** `scoutingCoverage = "full"` when all scoring averages are non-null; `"none"` when all averages are null AND counts are zero; `"thin"` otherwise. Comment count is rendered as its own column and no longer participates in the coverage classification — quantitative (event-log) and qualitative (comment) coverage are different signals and conflating them downgrades well-scouted teams with quiet scouts.
- **Scouting signals are an initial set, to be tuned.** Both scoring averages (auto accuracy, teleop success rate, pickup average) and summary counts (quick-comment count, robot-alert count) ship together. Strat may drop or add columns after real use; the plan treats the initial column set as a demonstration of the data fusion capability, not a final contract.
- **`breakdown_json` size cap: 8 KB.** ~1000 words of JSON is far more than any per-phase EPA breakdown in practice. Sync rejects (with `last_status = 422` and a log warning) any response where the `breakdown` blob exceeds the cap, preserving previous rows. Prevents a future Statbotics schema expansion or malicious proxy from ballooning the column.
- **Portrait-iPhone column priority** (R6 card is landscape-only anyway; portrait renders a **minimal three-column summary**: Team | Overall EPA | OPR). Landscape / tablet / desktop render all columns. Match Teams table keeps full columns in both orientations — with 6–8 rows it fits in landscape, and portrait strategy work is rare.
- **Loading and error states use the app's existing conventions.** Card / table render a lightweight placeholder (card with a skeleton row) while `cacheFetch` resolves; on error, a `.banner-warning` with "couldn't load team capability — try again in a moment" replaces the table body. No new loading-spinner infrastructure.

## Open Questions

### Resolved During Planning

- **Statbotics API shape for 2026** — `/v3/team_events?event={key}` is the batch endpoint; per-phase fields are `epa.breakdown.{auto,teleop,endgame,total}_points`; no auth; no conditional requests; no documented rate limits. Verified live.
- **OPR source (TBA vs Statbotics vs FRC)** — TBA. Statbotics has no OPR; FRC exposes rankings only; TBA plumbing already exists in the `tbaapi` package.
- **Phase mapping to `strategyarea` / `eventtype`** — flat columns on the Statbotics per-event row; no coupling. Revisit if P3 partner-fit scoring needs weighted phase aggregation.
- **Scouting signals in the capability table** — scoring averages (auto accuracy, teleop success rate, pickup average) from `CustomTournamentStatsService` + summary counts (quick-comment count, robot-alert count). Initial set intended as a demonstration of data fusion; strat will tune the column set after first-tournament feedback.
- **Flyway migration number** — V35. Verified V33 (TBA match videos) and V34 (updated_at_columns from network-comm refinement) are both landed.
- **Network-comm refinement: fully landed on main.** All 9 units of `docs/plans/2026-04-19-001-feat-network-communication-refinement-plan.md` shipped today. P1 integrates with `cacheFetch`, `syncConfig`, `tournamentWindow`, and the `JOBS` array from the new sync scheduler — not with the pre-refinement `rbfetch` + hand-rolled-interval patterns.
- **Empty-state / low-coverage UX** — per-cell `—` with no rank, per-row `scoutingCoverage: "full" | "thin" | "none"` flag computed from event-log coverage only (not comment count). Covers rookie teams + Week 1 events uniformly.
- **Force-sync UI affordance** — deferred; curl only for now, mirroring P0 decision.
- **Force-sync rate limit** — 5-minute minimum interval guard on `POST /api/statbotics-sync` (and the TBA OPR force-sync path), rejects with 429. Cheap protection against SUPERUSER-token spam against Statbotics' informal "please be nice" posture.
- **IDOR exposure on `GET /api/team-capability/{tournamentId}`** — accepted. Tournament-ownership scoping would add code without meaningful risk reduction for a student-team scouting system. Documented so the choice is durable.
- **Default sort** — OPR desc, but treated as an **arbitrary default**. Strat uses both OPR and EPA; the first-tournament feedback pass will revisit.
- **Cross-season durability of the Statbotics schema** — stable first-class columns for `*_points` + `unitless` + `norm`, plus `breakdown_json` TEXT for season-specific fields (with 8KB size cap). No yearly schema migration required.
- **R4 in Unit 5** — was a stray reference to the TBA match-videos plan's R4 "additive response shape" convention, not a requirement in this plan. Removed. Unit 5's real requirements are R7, R9, R10.

### Deferred to Implementation

- **Exact TTL value for `StatboticsCachingClient`** — check response `Cache-Control` header on first live fetch; default to `60` if absent (informal courtesy default). Statbotics has no documented TTL guidance.
- **Jackson polymorphism edge cases** — `traversal_rp` was observed as both scalar and one-element array during research. Restrict Jackson models to fields actually read; `@JsonIgnoreProperties(ignoreUnknown = true)` across all records.
- **Defensive `Thread.sleep()` between sync iterations** — add only if logs show hot-looping on Championship-sized syncs.
- **Owner-team row highlight style** — the existing `RankingsTable` already highlights 1310 via a row class; reuse when implementing Unit 7. Exact class lookup deferred to implementation.
- **IndexedDB migration for new `teamCapability` store** — confirm the repo's current migration cadence (`db.ts` version number) at implementation time; bumping the DB version is a trivial add.
- **Exact enricher cache invalidation trigger** — mirror `TeamScheduleCache` invalidation semantics. Confirm whether event-log writes should invalidate capability cache (they should, for scouting-aggregate freshness).
- **Which URL shape for the TBA OPR table** — `(tba_event_key VARCHAR, team_number INT)` composite PK vs auto-increment surrogate. P0 pattern used composite PK on cache tables; match that.

## Output Structure

New files (net additions — no repositioning of existing code):

    RavenBrain/src/main/java/ca/team1310/ravenbrain/statboticsapi/
        fetch/
            StatboticsCachingClient.java
            StatboticsClient.java
            StatboticsClientException.java
            StatboticsRawResponse.java
            StatboticsRawResponseRepo.java
        model/
            StatboticsTeamEvent.java
            StatboticsTeamEventEpa.java
            StatboticsTeamEventBreakdown.java
        service/
            StatboticsClientService.java
            StatboticsClientServiceException.java
            StatboticsTeamEventRecord.java
            StatboticsTeamEventRepo.java
            StatboticsTeamEventSyncService.java
            StatboticsSyncApi.java
    RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/model/
        TbaEventOprs.java
    RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/service/
        TbaEventOprsRecord.java
        TbaEventOprsRepo.java
    RavenBrain/src/main/java/ca/team1310/ravenbrain/teamcapability/
        TeamCapabilityApi.java
        TeamCapabilityEnricher.java
        TeamCapabilityResponse.java
        TeamCapabilityCache.java
    RavenBrain/src/main/resources/db/migration/
        V35__statbotics_and_tba_opr.sql
    RavenEye/app/components/
        TournamentTeamsCard.tsx
        MatchTeamsTable.tsx
    RavenEye/app/types/
        TeamCapability.ts
    RavenEye/docs/
        team-capability-p1.md

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

### Component interaction

```
┌────────────────────────────────┐  1h         ┌────────────────────────────┐
│ StatboticsTeamEventSyncService │────────────▶│ StatboticsClientService    │
│ @Scheduled                     │             │  .getTeamEventsByEvent(k)  │
│ scope: watched ∪ team-owner ∩  │             │  (parses JSON, @Ignore     │
│   active, with tba_event_key   │             │   unknown fields)          │
└──────────────┬─────────────────┘             └──────────────┬─────────────┘
               │ writes only                                  │ uses
               ▼                                              ▼
┌────────────────────────────────┐             ┌────────────────────────────┐
│ RB_STATBOTICS_TEAM_EVENT       │             │ StatboticsCachingClient    │
│ (event_key, team_number) PK    │             │  (TTL only, no ETag)       │
│ epa_total, epa_auto,           │             └──────────────┬─────────────┘
│ epa_teleop, epa_endgame,       │                            │ HTTP
│ epa_unitless, epa_norm,        │             ┌──────────────▼─────────────┐
│ breakdown_json, last_sync,     │             │ Statbotics v3 REST         │
│ last_status                    │             │ GET /v3/team_events?event={│
└──────────────┬─────────────────┘             │       event_key}&limit=1000│
               │ read only                     └────────────────────────────┘
               │
               │    ┌──────────────────────────────┐  1h          ┌──────────────┐
               │    │ TbaEventSyncService (P0)     │─────────────▶│ TbaClient    │
               │    │ + OPR sync (new in P1)       │              │  .getEvent   │
               │    │                              │              │  .getEventOprs│
               │    └──────────────┬───────────────┘              └──────┬───────┘
               │                   │ writes only                         │
               │                   ▼                                     │
               │    ┌──────────────────────────────┐                     │
               │    │ RB_TBA_EVENT_OPRS            │                     │
               │    │ (tba_event_key,              │                     │
               │    │  team_number) PK             │                     │
               │    │ opr, dpr, ccwm,              │                     │
               │    │ last_sync, last_status       │                     │
               │    └──────────────┬───────────────┘                     │
               │                   │ read only                           │
               │                   │                    ┌────────────────▼──────────────┐
               │                   │                    │ TBA v3 REST                   │
               │                   │                    │ GET /event/{key}/oprs         │
               │                   │                    └───────────────────────────────┘
               ▼                   ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ TeamCapabilityEnricher.enrich(tournamentId)                               │
│                                                                           │
│   teams         = TeamTournamentService.findTeamsForTournament(id)        │
│   opr_by_team   = TbaEventOprsRepo.findByTbaEventKey(t.tba_event_key)     │
│   sbx_by_team   = StatboticsTeamEventRepo.findByEventKey(t.tba_event_key) │
│   scout_by_team = TournamentAggregatesService.getAll(id)                  │
│                                                                           │
│   for each team in teams:                                                 │
│     emit TeamCapabilityResponse(                                          │
│       team, teamName,                                                     │
│       opr?, oprStale?,                                                    │
│       epaTotal?, epaAuto?, epaTeleop?, epaEndgame?, epaStale?,            │
│       autoAccuracy?, teleopSuccessRate?, pickupAverage?,                  │
│       quickCommentCount, robotAlertCount, robotAlertSeverity,             │
│       scoutingCoverage)                                                   │
│                                                                           │
│   return sorted_by_opr_desc(list)                                         │
└─────────────────────────────────┬─────────────────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ GET /api/team-capability/{tournamentId} (IS_AUTHENTICATED)                │
│ cached via TeamCapabilityCache (invalidate on event-log writes)           │
└─────────────────────────────────┬─────────────────────────────────────────┘
                                  │
                                  ▼ rbfetch → IndexedDB teamCapability store
┌───────────────────────────────────────────────────────────────────────────┐
│ RavenEye                                                                  │
│  /report/schedule/:tournamentId   → TournamentTeamsCard (all teams)       │
│  /strategy/:id/:level/:match      → MatchTeamsTable (6 / 7 / 8 teams,     │
│                                      alliance-grouped, within-alliance    │
│                                      rank parentheses, .schedule-team-    │
│                                      rank style, — for missing data)      │
└───────────────────────────────────────────────────────────────────────────┘
```

### Response shape (directional — final TypeScript / Java signatures in implementation)

```
TeamCapabilityResponse:
  teamNumber:           int
  teamName:             string
  opr:                  double | null
  oprStale:             boolean            // from TBA sync last_status / last_sync
  epaTotal:             double | null
  epaAuto:              double | null
  epaTeleop:            double | null
  epaEndgame:           double | null
  epaUnitless:          double | null      // included for cross-year cases, not rendered in v1
  epaNorm:              double | null      // same
  epaStale:             boolean            // from Statbotics sync last_status / last_sync
  autoAccuracy:         double | null      // auto-number-shot / (auto-number-shot + auto-number-missed)
  teleopSuccessRate:    double | null      // scoring-number-success / (success + miss)
  pickupAverage:        double | null      // avg pickup-number
  quickCommentCount:    int                // always >= 0
  robotAlertCount:      int                // always >= 0
  robotAlertMaxSeverity: string | null     // "info" | "warning" | "critical" (if any)
  scoutingCoverage:     string             // "full" | "thin" | "none" (event-log coverage only)
  withdrawn:            boolean            // true when team missing from latest Statbotics roster
```

### Match Teams within-alliance rank derivation (client side)

```
for each column c in numeric columns:
  for alliance a in [red, blue]:
    values = [row[c] for row in rows where row.alliance == a]
    ranks  = standardCompetitionRank(values)   // 1, 2, 2, 4 for ties; null for missing
    for row in rows where row.alliance == a:
      row.rankFor[c] = ranks[row.indexInAlliance]

render:
  numeric cell = value + (rankFor[c] != null ? " (" + rankFor[c] + ")" : "")
                                         // second span uses .schedule-team-rank CSS
```

## Implementation Units

- [ ] **Unit 1: `statboticsapi` client foundation — `StatboticsCachingClient`, `StatboticsClient`, raw response cache, config, startup logging**

**Goal:** Establish the Statbotics HTTP client, TTL cache, raw-response table, and config wiring that the sync service and client service depend on. Parallel-structured to the TBA client but TTL-only (no ETag / Last-Modified branches).

**Requirements:** R9.

**Dependencies:** None (V30–V34 already applied).

**Files:**
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/statboticsapi/fetch/StatboticsClient.java`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/statboticsapi/fetch/StatboticsCachingClient.java`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/statboticsapi/fetch/StatboticsClientException.java`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/statboticsapi/fetch/StatboticsRawResponse.java`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/statboticsapi/fetch/StatboticsRawResponseRepo.java`
- Modify: `RavenBrain/src/main/resources/application.yml` — new `raven-eye.statbotics-api.*` block (base-url, user-agent, ttl-seconds) and `raven-eye.sync.statbotics-team-event-poll` cadence.
- Test: `RavenBrain/src/test/java/ca/team1310/ravenbrain/statboticsapi/fetch/StatboticsFetchWiringTest.java`
- Test: `RavenBrain/src/test/java/ca/team1310/ravenbrain/statboticsapi/fetch/StatboticsCachingClientTest.java`

**Approach:**
- `StatboticsCachingClient.fetch(path)` — TTL-only cache lookup in `RB_STATBOTICS_RESPONSES`; on miss, issue unconditional GET with `User-Agent: StratApp/<version> (+https://raveneye.team1310.ca)` and `Accept-Encoding: gzip`. Store response body, status, lastcheck.
- Raw-cache table shape mirrors `RB_TBA_RESPONSES` exactly. Keep `etag` + `lastmodified` columns (NULL by default) for structural parity.
- Config defaults: base URL `https://api.statbotics.io`, ttl-seconds `60`, user-agent string built from `raven-eye.statbotics-api.user-agent`.
- Startup log masks provider identity even though there's no key: "Statbotics API: unauthenticated, base URL X, TTL Ys".

**Patterns to follow:**
- `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/fetch/TbaCachingClient.java` — method structure, cache-lookup-then-fetch pattern, NOT NULL primitive-column discipline.
- `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/fetch/TbaClient.java` — HTTP invocation shape.

**Test scenarios:**
- Happy path: first call for a given URL hits the network, caches body + status 200; second call within TTL returns cached body without HTTP.
- Happy path: second call after TTL expiry re-fetches and updates `lastcheck`.
- Edge case: response with `Cache-Control: max-age=N` header honours N over configured TTL (only if the client is designed to parse it — otherwise uses static TTL).
- Edge case: URL with unusual characters (e.g. event key with hyphens) round-trips through URL-encoding.
- Error path: 5xx response caches nothing, propagates `StatboticsClientException`.
- Error path: network failure (UnknownHostException) propagates wrapped exception; prior cache row is preserved.
- Integration: startup log line contains the mask-safe identifier (no key, since there isn't one).

**Verification:**
- `./gradlew test --tests "ca.team1310.ravenbrain.statboticsapi.fetch.*"` passes.
- Manual: `curl -sI https://api.statbotics.io/v3/team_events?event=2026onto&limit=1` returns 200 with a JSON payload through the cached client path (observed via logs).

---

- [ ] **Unit 2: Statbotics team-event sync — `StatboticsTeamEventRecord`, repo, sync service, force-sync endpoint, V35 migration**

**Goal:** Pull Statbotics per-team-per-event EPA + breakdown for watched / active tournaments with a non-blank `tba_event_key`, store in a dedicated table, expose force-sync + scheduled sync. Mirrors `TbaEventSyncService` precisely.

**Requirements:** R7, R9, R10.

**Dependencies:** Unit 1.

**Files:**
- Create: `RavenBrain/src/main/resources/db/migration/V35__statbotics_and_tba_opr.sql` — creates `RB_STATBOTICS_RESPONSES` (mirrors V31), `RB_STATBOTICS_TEAM_EVENT`, and `RB_TBA_EVENT_OPRS` (Unit 3 relies on the latter two). One migration bundles the three related table creations in one Flyway version. Note: MySQL 8.4 auto-commits each DDL statement individually, so use `CREATE TABLE IF NOT EXISTS` on all three (matching V32/V33 style) to make the migration re-runnable if a mid-migration failure leaves partial state.
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/statboticsapi/model/StatboticsTeamEvent.java`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/statboticsapi/model/StatboticsTeamEventEpa.java`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/statboticsapi/model/StatboticsTeamEventBreakdown.java`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/statboticsapi/service/StatboticsClientService.java`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/statboticsapi/service/StatboticsClientServiceException.java`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/statboticsapi/service/StatboticsTeamEventRecord.java`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/statboticsapi/service/StatboticsTeamEventRepo.java`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/statboticsapi/service/StatboticsTeamEventSyncService.java`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/statboticsapi/service/StatboticsSyncApi.java`
- Test: `RavenBrain/src/test/java/ca/team1310/ravenbrain/statboticsapi/service/StatboticsClientServiceTest.java`
- Test: `RavenBrain/src/test/java/ca/team1310/ravenbrain/statboticsapi/service/StatboticsTeamEventSyncServiceTest.java`
- Test: `RavenBrain/src/test/java/ca/team1310/ravenbrain/statboticsapi/service/StatboticsSyncApiTest.java`

**Approach:**
- Table columns on `RB_STATBOTICS_TEAM_EVENT`: `(tba_event_key VARCHAR(31) NOT NULL, team_number INT NOT NULL) PRIMARY KEY`, `tournament_id VARCHAR(15) NULL` (denormalized for convenient reads), `epa_total DOUBLE NULL`, `epa_auto DOUBLE NULL`, `epa_teleop DOUBLE NULL`, `epa_endgame DOUBLE NULL`, `epa_unitless DOUBLE NULL`, `epa_norm DOUBLE NULL`, `breakdown_json TEXT NULL`, `last_sync TIMESTAMP(3) NULL`, `last_status INT NULL`. Index on `(tba_event_key)` for the read-time enricher join.
- **`breakdown` size cap: 8 KB.** Before persisting `breakdown_json`, serialize the Statbotics `breakdown` sub-object to JSON and reject rows where the encoded length exceeds 8192 bytes. Record `last_status = 422` + a warning log; preserve any previous `breakdown_json` value. Protects against schema expansion or proxy-injected bloat from an unauthenticated upstream.
- `StatboticsTeamEventSyncService.syncAllActiveTournaments()` — `@Scheduled(fixedDelay = "${raven-eye.sync.statbotics-team-event-poll}")`. Filter: `(ownerTeamTournaments ∪ watchedTournaments) ∩ findUpcomingAndActiveTournaments()`, then require non-blank `tbaEventKey`.
- For each qualifying tournament: one call to `StatboticsClientService.getTeamEventsByEvent(tbaEventKey)` returning `List<StatboticsTeamEvent>`. For each team: extract flat EPA fields, preserve `breakdown` as JSON, upsert by `(tba_event_key, team_number)`. `last_sync = now()`, `last_status = 200`.
- Failure path: `persistStatusOnly(tbaEventKey, teamsFromPriorRun, status)` — preserves prior `breakdown_json` and flat EPA columns, bumps status.
- `StatboticsSyncApi.forceSync()` under `ROLE_SUPERUSER`, `AtomicBoolean syncInProgress` gate, returns 202 on acquire / 409 on contention. Calls `syncAllActiveTournaments()` inside a try/catch inside the async task.
- **5-minute force-sync interval guard**: alongside the `AtomicBoolean`, store `lastSuccessfulSyncAt` (Instant). `forceSync()` returns 429 `Too Many Requests` if `Instant.now() - lastSuccessfulSyncAt < Duration.ofMinutes(5)`. Prevents spam-induced Statbotics blocking. Update `lastSuccessfulSyncAt` only after a sync returns without throwing — failed syncs do not push the guard forward.

**Execution note:** Start Unit 2 with a failing wiring test that loads the sync service bean and verifies the `@Scheduled` cadence expression resolves from `application.yml`. Then implement the parser + sync logic against canned `/v3/team_events` JSON captured during research.

**Patterns to follow:**
- `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/service/TbaEventSyncService.java` — `syncAllMappedTournaments`, `syncOne`, `persistSuccess`, `persistStatusOnly`, per-tournament try/catch. Specialize for teams-under-an-event.
- `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/service/TbaSyncApi.java` — force-sync controller, async task, gate.
- `RavenBrain/src/main/resources/db/migration/V31__tba_responses.sql` + `V32__tba_event.sql` — column style for cache + entity tables.

**Test scenarios:**
- Happy path: watched tournament with `tba_event_key = "2026onto"` and 80 team records returned → 80 rows in `RB_STATBOTICS_TEAM_EVENT`, all with `last_status = 200`, flat EPA columns populated, `breakdown_json` non-empty, `RB_TBA_EVENT_OPRS` untouched.
- Happy path: unchanged Statbotics payload on a second sync → upsert produces same rows, no duplicates.
- Happy path: partial payload (team present in first sync, absent in second) → first row preserved (sync never deletes; `last_sync` does not advance; staleness will catch it at render time).
- Edge case: response includes a team with `null` `breakdown.auto_points` → flat column persisted as NULL, `breakdown_json` keeps raw shape.
- Edge case: response with unknown top-level field → Jackson ignores (`@JsonIgnoreProperties(ignoreUnknown = true)`), no parse failure.
- Edge case: response with polymorphic `traversal_rp` (scalar in one record, array in another) → model ignores (field not read in v1).
- Error path: Statbotics returns 404 → `persistStatusOnly` sets `last_status = 404` on previously-synced rows; no new rows.
- Error path: `StatboticsClientException` on one tournament → other tournaments continue.
- Error path: malformed JSON → logged, `last_status` recorded, prior rows preserved.
- Integration: `POST /api/statbotics-sync` as SUPERUSER acquires gate, returns 202; concurrent call returns 409; result visible via `GET /api/team-capability/{id}`.
- Integration: second `POST /api/statbotics-sync` within 5 minutes of a successful sync returns 429 (interval guard); after 5 minutes, returns 202 normally.
- Edge case: `breakdown` field larger than 8 KB → row rejected with `last_status = 422`, warning logged, previous `breakdown_json` preserved.
- Integration: tournament with `tbaEventKey = null` is skipped — no HTTP calls, no rows written.

**Verification:**
- `./gradlew test --tests "ca.team1310.ravenbrain.statboticsapi.*"` passes.
- Full suite passes — no regression in `TbaEventSyncService` or `TbaSyncApi` tests.
- Manual: `POST /api/statbotics-sync` with SUPERUSER token, then `SELECT * FROM RB_STATBOTICS_TEAM_EVENT WHERE tba_event_key = 'ACTIVE_EVENT' LIMIT 5;` shows populated EPA columns.

---

- [ ] **Unit 3: TBA OPR sync — `TbaClientService.getEventOprs`, `RB_TBA_EVENT_OPRS` repo/record, sync integration**

**Goal:** Add OPR sync to the existing `tbaapi` package. Reuses TBA's caching client, force-sync endpoint, and scheduled job — no new service class unless sync orchestration gets unwieldy.

**Requirements:** R7, R9.

**Dependencies:** Unit 2 (shares V35 migration for the `RB_TBA_EVENT_OPRS` table).

**Files:**
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/model/TbaEventOprs.java`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/service/TbaEventOprsRecord.java`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/service/TbaEventOprsRepo.java`
- Modify: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/service/TbaClientService.java` — add `getEventOprs(String eventKey)` returning `EventOprsFetch` wrapper.
- Modify: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/service/TbaEventSyncService.java` — add OPR pull to existing per-tournament sync loop (same try/catch boundary, preserves prior event-sync behavior).
- Modify: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/service/TbaSyncApi.java` — no code change required (the existing force-sync already invokes `TbaEventSyncService.syncAllMappedTournaments()`; OPR rides along).
- Test: `RavenBrain/src/test/java/ca/team1310/ravenbrain/tbaapi/service/TbaClientServiceOprsTest.java`
- Test: extend `RavenBrain/src/test/java/ca/team1310/ravenbrain/tbaapi/service/TbaEventSyncServiceTest.java` with OPR scenarios.

**Approach:**
- Table columns on `RB_TBA_EVENT_OPRS`: `(tba_event_key VARCHAR(31) NOT NULL, team_number INT NOT NULL) PRIMARY KEY`, `opr DOUBLE NULL`, `dpr DOUBLE NULL`, `ccwm DOUBLE NULL`, `last_sync TIMESTAMP(3) NULL`, `last_status INT NULL`. Index on `(tba_event_key)`.
- `TbaClientService.getEventOprs(key)` — mirrors `getEvent(key)`. URL-encoded path: `event/{encoded}/oprs`. Parses `{oprs: {frc1310: 42.5, ...}, dprs: {...}, ccwms: {...}}`. Transform the three maps into a list of per-team rows at parse time.
- `TbaEventSyncService` — inside the existing per-tournament loop, after the event-level sync, invoke OPR fetch. Upsert rows by composite PK. Failure preserves prior `opr / dpr / ccwm` values.

**Patterns to follow:**
- `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/service/TbaClientService.java` — `getEvent` / `getEventMatches` shape.
- `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/service/TbaEventSyncService.java` — per-tournament try/catch pattern, `persistStatusOnly` equivalent for OPR.

**Test scenarios:**
- Happy path: canned JSON response with `oprs / dprs / ccwms` populated for 6 teams → 6 rows written, all three columns populated.
- Happy path: second sync with unchanged values → no duplicates, `last_sync` advances.
- Edge case: response missing `dprs` block → `dpr` column NULL, others populated.
- Edge case: team key `frcABC` (malformed) → skipped with warning log, others persisted.
- Error path: 404 (event not yet in TBA) → previous rows preserved with `last_status = 404`.
- Error path: TBA OPR fetch throws → event-sync continues to next tournament (per-tournament try/catch isolation).
- Integration: `POST /api/tba-sync` as SUPERUSER triggers both event + match + OPR sync in a single async task under one gate; second concurrent call returns 409.

**Verification:**
- `./gradlew test --tests "ca.team1310.ravenbrain.tbaapi.service.*"` passes.
- Manual: after a sync, `SELECT * FROM RB_TBA_EVENT_OPRS WHERE tba_event_key = 'ACTIVE_EVENT' LIMIT 5;` shows populated values.

---

- [ ] **Unit 4: Batched tournament scouting aggregates service**

**Goal:** Expose a single per-tournament API that returns all scouting aggregates (scoring averages + quick-comment + robot-alert counts) for every team, in one batched call that avoids N+1 queries.

**Requirements:** R7, R10.

**Dependencies:** None (`CustomTournamentStatsService`, `QuickCommentService`, `RobotAlertService` already exist).

**Files:**
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/report/TournamentAggregatesService.java` — new service that exposes `Map<Integer, TournamentAggregates> getAggregatesForAllTeams(String tournamentId)`.
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/report/TournamentAggregates.java` — record shape for a single team's per-tournament aggregates.
- Modify: `RavenBrain/src/main/java/ca/team1310/ravenbrain/report/CustomTournamentStatsService.java` — expose a batched lookup (e.g. `findAveragesByTournament(tournamentId)`) if not already present; otherwise reuse the per-team method inside the new service's batched code path.
- Test: `RavenBrain/src/test/java/ca/team1310/ravenbrain/report/TournamentAggregatesServiceTest.java`

**Approach:**
- Batched SQL: one aggregate query per concern. Example: event-log sums grouped by `(team_number, event_type)` for all event-types in the `CustomTournamentStats` set, filtered by tournament. Quick-comment counts grouped by team. Robot-alert counts + max severity grouped by team.
- Compose results into a `Map<Integer, TournamentAggregates>` keyed by team number.
- Missing teams (no event logs) get rows with NULL averages / 0 counts; the enricher (Unit 5) interprets NULLs into the `"thin" | "none"` coverage flag.
- Cache with invalidation on event-log / quick-comment / robot-alert writes (mirror `CustomTournamentStatsService.invalidate(tournamentId)`).

**Patterns to follow:**
- `RavenBrain/src/main/java/ca/team1310/ravenbrain/report/CustomTournamentStatsService.java` — cache shape, invalidation hooks.
- `RavenBrain/src/main/java/ca/team1310/ravenbrain/matchvideo/MatchVideoEnricher.java` — batched-lookup posture.

**Test scenarios:**
- Happy path: tournament with 3 teams that each have full event-log coverage → all 3 teams returned with populated averages + counts.
- Happy path: one team has no event logs but has quick comments → team returned with NULL averages and quick-comment count > 0.
- Edge case: tournament with zero teams → empty map, no error.
- Edge case: event-log row with mixed event types → only the whitelisted types (auto-number-shot, auto-number-missed, scoring-number-success, scoring-number-miss, pickup-number) contribute to averages.
- Edge case: robot alert with severity `critical` → `robotAlertMaxSeverity` reflects it; another alert with `info` on the same team does not override.
- Integration: invalidation — after writing a new event-log row, a subsequent call reflects the change (not a stale cached result).

**Verification:**
- `./gradlew test --tests "ca.team1310.ravenbrain.report.TournamentAggregatesServiceTest"` passes.
- Manual: `curl /api/team-capability/ACTIVE_ID` (after Unit 5 lands) returns populated `autoAccuracy` / `teleopSuccessRate` / `pickupAverage` / `quickCommentCount` / `robotAlertCount` for the active tournament.

---

- [ ] **Unit 5: `TeamCapabilityEnricher` + `/api/team-capability/{tournamentId}` endpoint**

**Goal:** Join OPR × Statbotics EPA × scouting aggregates at read time. Return a single list of enriched team rows with server-computed staleness. One batched query per data source.

**Requirements:** R7, R9, R10. (Follows the additive-response-shape convention established by the TBA match-videos plan — per-entry `source` / `stale` fields — but no P1 requirement number applies.)

**Dependencies:** Units 1–4.

**Files:**
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/teamcapability/TeamCapabilityApi.java`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/teamcapability/TeamCapabilityEnricher.java`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/teamcapability/TeamCapabilityResponse.java`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/teamcapability/TeamCapabilityCache.java`
- Test: `RavenBrain/src/test/java/ca/team1310/ravenbrain/teamcapability/TeamCapabilityEnricherTest.java`
- Test: `RavenBrain/src/test/java/ca/team1310/ravenbrain/teamcapability/TeamCapabilityApiTest.java`

**Approach:**
- `TeamCapabilityEnricher.enrich(tournamentId)`:
  1. Load roster: `TeamTournamentService.findTeamNumbersForTournament(id)` + `findTeamNamesForTournament(id)` → `List<TeamInfo>`.
  2. Resolve tournament → `tba_event_key` via `TournamentService`.
  3. If `tba_event_key` null, skip steps 4–5 (set `opr / epa*` to null, set `oprStale = false`, `epaStale = false` — unmapped tournaments show scouting signals only).
  4. Load OPR: `TbaEventOprsRepo.findByTbaEventKey(key)` → `Map<Integer, TbaEventOprsRecord>`.
  5. Load Statbotics: `StatboticsTeamEventRepo.findByTbaEventKey(key)` → `Map<Integer, StatboticsTeamEventRecord>`.
  6. Load aggregates: `TournamentAggregatesService.getAggregatesForAllTeams(tournamentId)` → `Map<Integer, TournamentAggregates>`.
  7. For each team: compose `TeamCapabilityResponse`. Set `oprStale = (opr row last_status != 200 OR opr row null)`. `epaStale = (epa row last_status != 200 OR epa row null)`. `scoutingCoverage = classify(aggregates)` — **event-log-coverage only**: `"full"` when all scoring averages are non-null; `"none"` when all averages are null AND counts are zero; `"thin"` otherwise. Comment count and alert count are rendered as their own columns and do not influence coverage classification.
  8. Mark `withdrawn = true` for teams present in the stored roster / OPR but absent from the most recent Statbotics team-events response — strikethrough rendering on the client, sorted last regardless of column direction.
  9. Default sort: `opr desc` with nulls last and withdrawn rows after nulls. Client may re-sort; default happens server-side for caller convenience.
- Cache: `TeamCapabilityCache` wraps the enricher response per tournamentId. Invalidate on any event-log / quick-comment / robot-alert / Statbotics / TBA write via observer or explicit invalidation call. Mirror `TeamScheduleCache`.
- Endpoint: `GET /api/team-capability/{tournamentId}` under `IS_AUTHENTICATED`. No role gate — all authenticated users (including DRIVE_TEAM, MEMBER) can see it. No tournament-ownership scope check (documented IDOR acceptance — see Key Technical Decisions).
- Response emits weak ETag (`W/"..."`) from a content hash, so `cacheFetch` on the client can send `If-None-Match` and receive 304 when nothing has changed since the last request. Mirrors the pattern the network-comm refinement established for other GETs.

**Patterns to follow:**
- `RavenBrain/src/main/java/ca/team1310/ravenbrain/matchvideo/MatchVideoEnricher.java` — enricher structure.
- `RavenBrain/src/main/java/ca/team1310/ravenbrain/tournament/TournamentEnricher.java` — canonicalization + staleness semantics.
- `RavenBrain/src/main/java/ca/team1310/ravenbrain/schedule/TeamScheduleCache.java` — per-tournament cache + invalidation.

**Test scenarios:**
- Happy path: tournament with `tba_event_key` set, 3 teams with full OPR + Statbotics + scouting data → 3 `TeamCapabilityResponse` rows with all fields populated, `epaStale=false`, `oprStale=false`, `scoutingCoverage="full"`.
- Happy path: default-sort returns OPR desc with nulls at the end.
- Happy path: tournament with no `tba_event_key` → response returns scouting-only rows with `opr=null`, `epa*=null`, `oprStale=false`, `epaStale=false`, scouting fields populated.
- Happy path: team row with ongoing Statbotics coverage but no TBA OPR yet (rare; Week 1 before TBA publishes OPRs) → `opr=null`, `oprStale=true`, EPA + scouting rendered.
- Edge case: rookie team with zero event-log rows → `scoutingCoverage="none"`, counts 0, averages null, EPA from Statbotics still rendered if Statbotics seeded for rookies.
- Edge case: team present in TBA OPR but not in Statbotics → EPA columns null, EPA stale true, OPR rendered.
- Edge case: team present in Statbotics but not in TBA OPR → OPR column null, OPR stale true, EPA rendered.
- Edge case: team present in roster but missing from both OPR and Statbotics and scouting → row rendered with all numerics null, `scoutingCoverage="none"`, `oprStale=true`, `epaStale=true`.
- Edge case: tournament with 80 teams → one enricher call; under a reasonable time budget (e.g. < 500 ms) — use a profiling / sample count assertion where feasible.
- Error path: invalid tournamentId → 404.
- Integration: after Unit 2's sync runs, `GET /api/team-capability/{tournamentId}` reflects the new EPA data.
- Integration: adding a new event-log row invalidates the cache — next `GET` reflects the updated scouting aggregates.
- Integration: cache hit returns the same data on two consecutive calls within the cache window without re-running the enricher.

**Verification:**
- `./gradlew test --tests "ca.team1310.ravenbrain.teamcapability.*"` passes.
- Manual: `curl -H "Authorization: Bearer $TOKEN" https://ravenbrain.team1310.ca/api/team-capability/<active_tournament_id>` returns a well-formed list with non-null values for teams with coverage.

---

- [ ] **Unit 6: Frontend types, `cacheFetch` wrapper, IndexedDB store, `JOBS` registration, cache-clear wiring**

**Goal:** Wire the capability endpoint into the **newly-landed** RavenEye client architecture: `cacheFetch` (conditional GET with `If-None-Match`), the two-loop sync scheduler with inline `JOBS` array, `tournamentWindow` preconditions, and `clearDataCaches()` identity-boundary wipe. All later units read from IndexedDB to stay offline-capable.

**Requirements:** R9, R10.

**Dependencies:** Unit 5 (endpoint exists and emits a weak ETag).

**Files:**
- Create: `RavenEye/app/types/TeamCapability.ts`
- Modify: `RavenEye/app/common/storage/rb.ts` — add `getTeamCapability(tournamentId: string)` using **`cacheFetch`** (not raw `rbfetch`), returning parsed body from cache on 304.
- Modify: `RavenEye/app/common/storage/db.ts` — add `teamCapability` object store keyed by tournamentId; bump DB version + migration step.
- Modify: `RavenEye/app/common/storage/cacheClear.ts` — add the `teamCapability` store and its `apiEtags` entries to `clearDataCaches()` so logout / username-change wipes them.
- Modify: `RavenEye/app/common/sync/sync.ts` — add one entry to the `JOBS` array declaring cadence (from `syncConfig`), precondition (tournament-window + tournamentId known), and run (fetch-then-persist).

**Approach:**
- `TeamCapability.ts` mirrors `TeamCapabilityResponse` 1:1 (snake ↔ camel preserved per existing RB-type convention).
- `getTeamCapability(tournamentId)` calls `cacheFetch('/api/team-capability/' + tournamentId, { store: 'teamCapability', keyField: 'tournamentId' })`. `cacheFetch` handles the ETag round-trip and serves parsed body from cache on 304 without forcing the caller to manage the fallback.
- IndexedDB store: one array per tournamentId; overwrite-on-write by the sync job. Readers use a repository helper (`db.getTeamCapability(tournamentId)`) that returns the cached rows synchronously without touching the network.
- `JOBS` entry: `{ name: 'teamCapability', cadenceKey: 'teamCapabilityPoll', precondition: tournamentWindow.inWindow, run: () => fetchAndPersistTeamCapability(currentTournamentId) }`. Cadence defaults to 30s in-window and idle out-of-window via the precondition (mirrors other refinement-era JOBS entries).
- Tournament-window precondition reuses the server-computed `activeFrom`/`activeUntil` window, which includes the configured lead-in time — Thursday-night pre-tournament prep is inside the window automatically.
- Identity-boundary wipe: adding the store to `clearDataCaches()` ensures a logout / username change clears capability data from a shared device.

**Patterns to follow:**
- `RavenEye/app/common/storage/cacheFetch.ts` — the conditional-GET wrapper; study an existing migrated GET (e.g. match-videos or webcasts) as the model.
- `RavenEye/app/common/sync/sync.ts` — inline `JOBS` array; study an existing entry (e.g. the match-videos job from Unit 3 of the refinement plan) as the template.
- `RavenEye/app/common/storage/cacheClear.ts` — existing cache wipe helper.
- `RavenEye/app/types/MatchVideo.ts` — snake-to-camel type convention.

**Test scenarios:**
<!-- RavenEye has no test runner; manual scenarios only. -->
- Manual happy path: log in, navigate to `/report/schedule/:tournamentId` → network tab shows a 200 on the first `cacheFetch` to `/api/team-capability/...`; a subsequent sync tick shows a 304 (from the stored ETag).
- Manual happy path: after a successful sync, browser DevTools IndexedDB inspector → `teamCapability` object store contains rows for the current tournamentId, and `apiEtags` contains the corresponding ETag entry.
- Manual happy path: tournament in-window (Saturday of an event) → JOBS tick fires at 30s cadence; out-of-window (next Tuesday) → job skips via precondition.
- Manual happy path: pre-tournament prep (Thursday evening before a Friday-Saturday event) → the `activeFrom`/`activeUntil` window includes lead-in time; sync fires and capability data lands in IndexedDB before the event starts.
- Manual edge case: logout → `clearDataCaches()` removes the `teamCapability` store and `apiEtags` entries; next login re-fetches.
- Manual edge case: different user logs in on the same device → username-change path wipes capability caches.
- Manual edge case: switching tournament in the UI triggers a fresh fetch for the new tournamentId (new cache key).
- Typecheck: `cd RavenEye && npm run typecheck` passes.

**Verification:**
- `npm run typecheck` passes.
- Network tab confirms 304-on-unchanged, 200-on-first-fetch behavior against a running RavenBrain.
- `clearDataCaches()` confirmed to include the new store.

**Test scenarios:**
<!-- RavenEye has no test runner; manual scenarios only. -->
- Manual happy path: log in, navigate to `/report/schedule/:tournamentId`, observe network call to `/api/team-capability/...`; response cached in IndexedDB (`indexedDB.databases()` inspection).
- Manual happy path: after a successful sync, open browser DevTools IndexedDB inspector → `teamCapability` object store contains rows for the current tournamentId. (Unit 7 verifies the card renders from this cached data.)
- Manual happy path: 3 minutes elapse while active tournament is visible → auto-sync refreshes capability data (confirm via network tab or IndexedDB timestamp).
- Manual edge case: logout → IndexedDB capability rows preserved (session-scoped storage is not used); next login re-fetches.
- Manual edge case: switching tournament in the UI triggers a fresh fetch for the new tournamentId.
- Typecheck: `cd RavenEye && npm run typecheck` passes.

**Verification:**
- `npm run typecheck` passes.
- Manual smoke: network tab shows `/api/team-capability/...` fires on schedule-page load + every 3 minutes while active.

---

- [ ] **Unit 7: Tournament Teams card on team-schedule page**

**Goal:** Render a sortable, owner-highlighted capability card below the existing schedule / bracket / rankings stack on the team-schedule page.

**Requirements:** R6, R7, R8, R9, R10.

**Dependencies:** Unit 6.

**Files:**
- Create: `RavenEye/app/components/TournamentTeamsCard.tsx`
- Modify: `RavenEye/app/routes/report/team-schedule-page.tsx` — import `TournamentTeamsCard`, render it after `<RankingsTable>` and before the nexus attribution paragraph.
- Modify: `RavenEye/app/assets/css/components.css` — new `.tournament-teams-card` selector if card-specific styling is needed; reuse existing `.schedule-table` / `.schedule-table-wrapper` / `.schedule-rotate-hint` / `.schedule-team-rank` for per-cell styling.
- Modify: `RavenEye/app/types/TeamCapability.ts` — no change expected (shape defined in Unit 6).

**Approach:**
- `TournamentTeamsCard` reads from IndexedDB (via a hook that mirrors `useMatchSchedule` / `useRanking` shape). Render as `<section className="card">`.
- **Column set (landscape / tablet / desktop)**: Team Number + Name | Overall EPA | Auto EPA | Teleop EPA | Endgame EPA | OPR | Auto Accuracy | Teleop Success | Pickup Avg | Comments | Alerts | Coverage.
- **Portrait-iPhone column reduction**: detect via existing `isNarrow` hook and render a minimal three-column form: Team | Overall EPA | OPR. All other columns hidden in portrait; the rotate-hint directs users to rotate for the full view.
- Default sort: OPR desc (arbitrary placeholder per Key Technical Decisions). Click-header to sort any column. Nulls sort last regardless of direction. Withdrawn rows sort after nulls regardless of direction.
- Owner team row (1310) highlighted via the existing owner-highlight class (lookup existing convention in `RankingsTable`).
- **Withdrawn rows** render with CSS `text-decoration: line-through` on the whole row. Values remain visible for historical reference; sort position is always last.
- Row click → `navigate("/report/team/<tournamentId>/<teamNumber>")` (or whatever the existing team-summary route pattern is — confirm at implementation time).
- Missing data: render `—` (em dash); ignored by sort; no rank needed on this surface (within-alliance rank is R11 only).
- Mobile: wrap in `.schedule-table-wrapper` + `.schedule-rotate-hint` for landscape-iPhone parity.
- CB-safe palette: status pills / badges use `.badge-tba` / new `.badge-scouting` patterns (text + colour redundancy).
- Per-row staleness banner (`.banner-info`) rendered once at the top of the card when any row has `oprStale` or `epaStale = true` (mirrors P0 webcast UX).
- **Loading state**: render the card skeleton (header + one empty row with "Loading team capability…") while the initial `cacheFetch` resolves on cold-IndexedDB first visits.
- **Error state**: replace the table body with a `.banner-warning` reading "Couldn't load team capability — try again in a moment." Do not hide the card entirely; the placeholder signals presence.

**Patterns to follow:**
- `RavenEye/app/routes/report/team-schedule-page.tsx:381–422` (`RankingsTable`) — sort / highlight shape.
- `RavenEye/app/routes/admin/match-videos-page.tsx` (Unit 7 of match-videos plan) — source badges + staleness banner.
- `RavenEye/app/assets/css/components.css:2818` (`.schedule-team-rank`) — reuse.

**Test scenarios:**
<!-- Manual. -->
- Manual happy path: schedule page for an active tournament → card renders below rankings with all teams; default sort is OPR desc.
- Manual happy path: click a column header → rows re-sort; click again → reverse direction; nulls stay last.
- Manual happy path: owner team (1310) row is highlighted.
- Manual happy path: click a row → navigates to team-summary page.
- Manual happy path: staleness banner appears when any row has `epaStale` or `oprStale = true`.
- Manual edge case: rookie team renders with `—` in all numeric columns + `Coverage: none`; sort moves to bottom.
- Manual edge case: portrait iPhone renders the narrow form (existing rotate-hint triggers).
- Manual edge case: dark mode renders with adequate contrast on staleness banner + coverage pills.
- Manual accessibility: column headers have `aria-sort` to announce sort direction.
- Typecheck: `npm run typecheck` passes.

**Verification:**
- `npm run typecheck` passes.
- Visual verification on a local dev server against an active tournament.

---

- [ ] **Unit 8: Match Teams table on match strategy page**

**Goal:** Render the Match Teams input table above the strategy diagrams, alliance-grouped with within-alliance ranks in the `.schedule-team-rank` style.

**Requirements:** R11.

**Dependencies:** Unit 6; Unit 7 for shared data shape understanding (not strict code dependency).

**Files:**
- Create: `RavenEye/app/components/MatchTeamsTable.tsx`
- Modify: `RavenEye/app/routes/strategy/strategy-plan-page.tsx` — import `MatchTeamsTable`, render between page-header and `<div className="strategy-plan-grid">` opening; extend `teamNumbersForMatch()` to include slot 4 when non-zero.
- Modify: `RavenEye/app/assets/css/components.css` — new `.match-teams-table` selector with alliance-color styling. Red / blue must pass CB-safe (label column + palette).

**Approach:**
- Reads capability data from IndexedDB via the same hook as Unit 7, then filters to the 6 (or 7–8) teams in the current match from `RBScheduleRecord.red1-4` + `blue1-4`.
- Groups by alliance. Red alliance block first, blue alliance block second — visually separated (CB-safe colour on the row background + an "Alliance: Red / Blue" label column).
- Within-alliance rank computed client-side per numeric column using standard competition ranking (1, 2, 2, 4). Rendered as `<span className="schedule-team-rank">({rank})</span>` after the numeric value (`.schedule-team-rank` is already 0.7em + secondary text colour).
- **Rank suppression rules** (apply both):
  1. If the alliance has fewer than 2 non-null values in the column, render the value(s) with **no rank span** — "(1)" on a single-value alliance would misleadingly imply "best of three".
  2. If all non-null values in the alliance are equal (spread = 0), render with **no rank span** — `0 (1), 0 (1), 0 (1)` is noise, especially on integer-count columns.
- Missing data: `—` with no rank span; excluded from rank computation.
- Withdrawn teams (flag from server) render with strikethrough row styling, inside their alliance group. Rank computation ignores withdrawn rows.
- Row click → team-summary page (match Unit 7 behavior).
- No expand-collapse; no sort controls on this surface (the six rows are pre-grouped; strat sees them at a glance).
- Staleness: reuse `.banner-info` at the top of the table when any team's OPR or EPA is stale.
- **Placement rationale**: table renders above the `strategy-plan-grid` per R11. Match teams are input data consulted before the diagrams are used, so pushing diagrams below the fold on mobile is the accepted trade (strategy sessions are typically tablet or desktop anyway; match-prep glance on iPhone reads the table and rotates for the canvas).
- **Loading / error states**: same conventions as Unit 7 — skeleton row while `cacheFetch` resolves; `.banner-warning` replacement on fetch error.

**Patterns to follow:**
- `RavenEye/app/routes/report/team-schedule-page.tsx:56` (`<span className="schedule-team-rank">`) — rank-rendering idiom.
- `RavenEye/app/routes/strategy/strategy-plan-page.tsx:214` (`ownerAllianceFromSchedule`) — alliance-detection helper.

**Test scenarios:**
<!-- Manual. -->
- Manual happy path: open `/strategy/2026oncmp2/Qualification/1` → Match Teams table renders above the strategy diagrams; 6 rows grouped as Red (3) / Blue (3); OPR desc within each alliance; ranks `(1)`, `(2)`, `(3)` parenthesised.
- Manual happy path: 4-team alliance playoff match (7 or 8 teams) → within-alliance rank goes 1–4 instead of 1–3.
- Manual happy path: rookie team in a match with full EPA → rookie row shows `—` in all numeric columns; ranks are computed only over the non-`—` teammates.
- Manual edge case: only one teammate has data in a column (other two are `—`) → the single value renders with **no rank** (suppression rule 1).
- Manual edge case: all three teammates have `0` in Comments column (spread = 0) → values render without rank parens (suppression rule 2).
- Manual edge case: a team flagged withdrawn (Statbotics dropped them mid-event) → row renders strikethrough within its alliance; rank computation for that column ignores their values.
- Manual happy path: owner team (1310) row is highlighted within its alliance.
- Manual happy path: click a row → navigates to team-summary page.
- Manual edge case: practice match (level=Practice) → table does not render (scope boundary).
- Manual edge case: dark mode red/blue distinction remains CB-safe (label column always visible).
- Manual edge case: offline — table still renders from IndexedDB data cached by Unit 6.
- Manual edge case: staleness banner renders when any team's OPR or EPA is stale.
- Manual accessibility: alliance colour has an adjacent text label so screen readers announce "Red alliance: 1310, 2056, 4917" / "Blue alliance: 1114, 2713, 5406".
- Typecheck: `npm run typecheck` passes.

**Verification:**
- `npm run typecheck` passes.
- Visual verification on a local dev server navigating to a strategy page for a real match.

---

- [ ] **Unit 9: Documentation — team-capability design doc**

**Goal:** Mirror the P0 / match-video pattern of a short design doc companion to the plan.

**Requirements:** Documentation / operational standing convention (not a plan requirement).

**Dependencies:** Units 1–8.

**Files:**
- Create: `RavenEye/docs/team-capability-p1.md` — short design doc mirroring the plan's Overview, Key Decisions, and a simple deployment note.
- Modify: `RavenEye/docs/brainstorms/2026-04-17-team-capability-rankings-requirements.md` — append a "Next Steps" update pointing to this plan and the delivered feature (optional; or skip and keep the brainstorm frozen).

**Approach:** Short prose doc. Copy the implementation-facing sections that are durable (component graph, response shape, data-flow diagram). Skip per-unit test scenarios; those live in the plan.

**Test scenarios:** Test expectation: none — documentation unit.

**Verification:** File exists; cross-linked from `RavenEye/docs/plans/2026-04-19-002-feat-team-capability-rankings-p1-plan.md` (this file).

## System-Wide Impact

- **Interaction graph:** `StatboticsTeamEventSyncService` writes only to `RB_STATBOTICS_TEAM_EVENT` (+ raw response cache). `TbaEventSyncService` extended to additionally write `RB_TBA_EVENT_OPRS`. `TeamCapabilityEnricher` is pure read — never writes. Admin CRUD surfaces (quick-comment, robot-alert, event-log) are unchanged.
- **Error propagation:** per-tournament failures in Statbotics sync logged + `last_status` recorded; loop continues. TBA OPR failures isolated per-tournament in the same way. Enricher never throws out of `GET /api/team-capability/{id}`; missing external data produces `null` + `stale = true` on the response.
- **State lifecycle risks:** concurrent Statbotics + TBA OPR sync + admin event-log write — disjoint tables, no conflict. Concurrent `POST /api/statbotics-sync` → gate returns 409. Clearing a tournament's `tba_event_key` leaves orphan EPA + OPR rows; cheap in storage, read path filters by current key so no user visibility.
- **API surface parity:** `GET /api/team-capability/{tournamentId}` is net-new. `GET /api/match-video/...` and `GET /api/schedule/...` unchanged. `POST /api/tba-sync` extended to also pull OPR — response shape unchanged (still 202 / 409).
- **Integration coverage:** scenarios unit tests alone don't prove — (a) end-to-end offline flow: sync-then-offline-then-strategy-page-render; (b) event-log write invalidates capability cache and next `GET` reflects new scouting aggregates; (c) Statbotics sync + TBA OPR sync + admin add-quick-comment all succeed concurrently.
- **Unchanged invariants:**
  - `RB_MATCH_VIDEO` / `RB_TBA_*` / `RB_TOURNAMENT` / scouting-data schemas untouched (only new tables created).
  - `POST /api/match-video` gating unchanged (pre-existing `IS_AUTHENTICATED`).
  - `rbfetch` / token-refresh behavior unchanged.
  - Track-page offline-first contract unchanged (track pages do not consume capability data).
  - DRIVE_TEAM role visibility unchanged — they see strategy plans + Match Teams table as read-only.
  - CB-safe palette convention maintained throughout new UI.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Statbotics API is unauthenticated and has no documented rate limit. | Conservative 1h cadence × 2–6 events = < 7 requests/hour. Identify via User-Agent. Add defensive `Thread.sleep()` between iterations only if logs show hot-looping during Championship-sized syncs. |
| Statbotics 2026 breakdown schema evolves mid-season. | Flat columns for stable fields; `breakdown_json` TEXT for season-specific fields. `@JsonIgnoreProperties(ignoreUnknown = true)` everywhere. |
| TBA publishes OPRs late for new events (Week 1). | `oprStale = true` flag renders; UI shows `—` gracefully. Users understand "no OPR yet" from the coverage state. |
| Card width on desktop is acceptable but mobile becomes unwieldy (10 columns). | Reuse existing `.schedule-table-wrapper` + `.schedule-rotate-hint` pattern. Explicitly documented in the origin brainstorm's Mobile UX Pattern section. |
| Enricher performance on 80-team events. | Four queries + in-memory join; cached per tournament with invalidation. Profile with a 100-team fixture before prod. |
| Network-comm refinement fully landed on main since initial planning. | P1 adopts the new scaffolding (`cacheFetch`, `JOBS` array, `tournamentWindow`, `clearDataCaches`) directly. Unit 6 rewritten around these primitives; no parallel-plan coordination concern remains. |
| Cross-repo merge order (RE before RB) could break production mid-tournament. | Tournament season is ended; off-season traffic is low and brief downtime is tolerable. When tournament season resumes, enforce RB-before-RE at merge time via a checklist in the PR description. |
| Cache invalidation thundering herd during active matches. | Report usage is rare during matches and primarily between matches. Observable once live; add a brief monitoring note to `team-capability-p1.md` and revisit if logs show load-related failures. No code change for v1. |
| Statbotics policy change (IP block, new auth) breaks sync. | Conservative 1h cadence + 5-minute force-sync guard + User-Agent identification. If Statbotics returns 429 or 403, the sync service records `last_status` and the enricher falls back to scouting-only rendering with `epaStale = true`. |
| Withdrawn teams persist on the card with stale data. | Enricher marks them `withdrawn = true` (via roster-vs-Statbotics diff); UI renders strikethrough and sorts last. Surfaces the state without deleting historical rows. |
| Orphan `RB_STATBOTICS_TEAM_EVENT` / `RB_TBA_EVENT_OPRS` rows when `tba_event_key` is cleared. | Low storage cost; read path filters by current key. Cleanup job is future work. |
| Within-alliance rank is computed client-side — drift risk if a column is added. | Encode the ranking in one helper with a column-metadata list; every numeric column with `rankable: true` gets the treatment. Adding a column = adding a metadata entry. |
| Scouting-coverage classification ("full" / "thin" / "none") is a judgment call. | Start with a conservative rule (all averages non-null AND comment count >= 3). Document in `team-capability-p1.md`. Adjust after real tournament feedback. |
| Force-sync endpoint for Statbotics + TBA OPR lives behind curl (no UI). | Pattern parity with P0. Admin can run curl during an event if needed. Deferred UI follow-up tracked. |

## Documentation / Operational Notes

- `RavenEye/docs/team-capability-p1.md` — Unit 9 creates this (mirroring the P0 pattern).
- No new environment variables. Statbotics uses no auth key. TBA auth key from P0 is reused.
- Migration V35 applies automatically on startup.
- Observability: per-sync summary log (`"Statbotics sync: X tournaments, Y team-event rows written, Z failures"` and `"TBA OPR sync: X tournaments, Y team rows written, Z failures"`) to support adoption-measure-then-cut.
- **Monitoring watch**: during active tournaments, keep an eye out for enricher performance degradation correlated with event-log write bursts. Report pages are consulted mostly between matches, not during them, so the thundering-herd concern is theoretical for current usage patterns; revisit if load signals appear (slow capability responses, timeouts during sync cycles). Captured in `team-capability-p1.md` as an observability followup.
- Rollout posture: safe to ship dark. No watched tournament with `tba_event_key` → no external sync. Unmapped tournaments render the card with scouting-only rows. Enabling per-tournament is an admin action (set `tba_event_key` via the P0 admin UI).
- Deployment: release via `/kd-pr` — RavenBrain PR (V35 + statboticsapi + tbaapi OPR + teamcapability) + RavenEye PR (types + rb.ts + sync + components + page insertions). Semantic-release bumps both repos on merge.

## Sources & References

- **Origin document:** [docs/brainstorms/2026-04-17-team-capability-rankings-requirements.md](../brainstorms/2026-04-17-team-capability-rankings-requirements.md)
- **P0 TBA Data Foundation plan:** [docs/plans/2026-04-18-001-feat-tba-data-foundation-plan.md](2026-04-18-001-feat-tba-data-foundation-plan.md) — package pattern to mirror.
- **TBA Match Videos plan:** [docs/plans/2026-04-18-002-feat-tba-match-videos-plan.md](2026-04-18-002-feat-tba-match-videos-plan.md) — enricher pattern + schedule-page augmentation.
- **Network Communication Refinement plan (in-flight):** [docs/plans/2026-04-19-001-feat-network-communication-refinement-plan.md](2026-04-19-001-feat-network-communication-refinement-plan.md) — sequencing reference; independent.
- Related code (RavenBrain): `tbaapi/` (mirror template), `matchvideo/MatchVideoEnricher.java` (enricher template), `report/CustomTournamentStatsService.java` (aggregation reuse), `tournament/TeamTournamentService.java` (team roster), `V33__tba_match_video.sql` (Flyway style).
- Related code (RavenEye): `app/routes/report/team-schedule-page.tsx` (insert point + rank-rendering idiom), `app/routes/strategy/strategy-plan-page.tsx` (insert point + alliance helpers), `app/common/storage/cacheFetch.ts` (wrapper to use), `app/common/storage/syncConfig.ts` + `tournamentWindow.ts` (sync cadence + window helpers), `app/common/storage/cacheClear.ts` (identity-boundary wipe), `app/common/sync/sync.ts` (`JOBS` array registration), `app/assets/css/components.css:2818` (`.schedule-team-rank`).
- **Architecture companion:** [RavenEye/docs/architecture.md](../architecture.md) — client-side design posture established by the network-comm refinement; P1 follows its `cacheFetch` / `JOBS` / `tournamentWindow` / `clearDataCaches` conventions.
- **External docs:**
  - Statbotics REST: https://www.statbotics.io/api/rest
  - Statbotics OpenAPI: https://api.statbotics.io/openapi.json
  - TBA API v3 (OPR): https://www.thebluealliance.com/apidocs/v3

