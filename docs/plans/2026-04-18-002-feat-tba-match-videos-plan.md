---
title: "feat: TBA Match Video Sync"
type: feat
status: active
date: 2026-04-18
deepened: 2026-04-18
---

# TBA Match Video Sync

**Target repos:** `RavenBrain` (primary — new sync service, migration, enriched endpoint) and `RavenEye` (schedule-report video link + admin-page badges). File paths are monorepo-relative, prefixed with `RavenBrain/` or `RavenEye/`.

**Builds on:** the P0 TBA Data Foundation plan at `RavenEye/docs/plans/2026-04-18-001-feat-tba-data-foundation-plan.md` and the code it shipped (`tbaapi.fetch`, `tbaapi.service`, `tbaapi.model` packages; `WebcastUrlReconstructor.canonicalize()` helper; `TbaEventSyncService` sync pattern; `TbaSyncApi.forceSync()` trigger; `RB_TOURNAMENT.tba_event_key` auto-derivation).

**Prerequisite:** This plan assumes P0 has been implemented, reviewed, and merged to `main`. The migrations `V30`–`V32`, the `tbaapi` package, the `RB_TOURNAMENT.tba_event_key` column, and `WebcastUrlReconstructor.canonicalize()` must all exist before Unit 1 begins.

**Sequencing:** The origin doc's roadmap reserves "P1" for Statbotics EPA + the Tournament Teams pick-list card. This plan is a separate TBA-data extension that ships **ahead of** origin-P1 in execution order. Treat the phase label as file-number `002` rather than a roadmap P-number, and do not interpret "Unit N" here as a dependency on Statbotics work.

## Overview

Add a second TBA data surface beside webcasts: match replay videos. Sync TBA's per-match video references into a dedicated `RB_TBA_MATCH_VIDEO` table using TBA's batch `/event/{key}/matches` endpoint (one API call per event covers every match), reconstruct each match's videos into `https://` URLs, and merge them with the existing admin-owned `RB_MATCH_VIDEO` table at read time. **Match identity is established by alliance composition** — RB_SCHEDULE and TBA both know the 6 team numbers on the field for every match, so joining sorted team tuples is drift-proof across mid-event rescheduling and covers both qualification and playoff matches without bracket-position decoding.

The primary consumer surface is the existing **schedule report** (`/report/schedule` and `/report/schedule/active`) — a small `📺` icon beside each match row links to the match's video (manual URLs first, then TBA URLs, canonicalize-deduped). The admin match-videos page retains CRUD of manual overrides and gains source badges + a staleness banner that mirror the P0 webcast UX.

## Problem Frame

Team 1310's strat team wants match replays one click away during and after tournaments — scouts validating event-log notes, drive-team coaches reviewing endgame approaches, alliance captains prepping picks. Today they leave RavenEye, hit thebluealliance.com, find the event, find the match, open the video. The P0 foundation established the sync pattern at the event level; this plan extends it per-match and renders the result on the page scouts already live in (schedule report), not just the admin page.

## Requirements Trace

- **R1** — Sync TBA match videos for watched/active tournaments only (per Tony's scope decision). Tournaments not in the active set are not queried. [Unit 4]
- **R2** — **All match levels** (qualification + playoff, excluding practice). Playoffs are in scope; TBA's bracket-position keys are resolved via alliance composition, not via bracket decoding. [Unit 1, Unit 4, Unit 5]
- **R3** — TBA videos stored in a dedicated table (`RB_TBA_MATCH_VIDEO`) separate from admin-owned `RB_MATCH_VIDEO`. Disjoint write surfaces — the P0 ownership invariant applies. [Unit 1, Unit 4]
- **R4** — Match-video read endpoint returns the union of admin and TBA URLs, canonicalize-deduplicated, with a per-entry `source` marker (`manual` | `tba`) and a `stale` flag. [Unit 5]
- **R5** — **Match identity by alliance composition.** Sort red and blue team-number 3-tuples from RB_SCHEDULE and TBA's Match response; join on equality. Robust to FRC/TBA match-number drift from mid-event rescheduling and to all playoff bracket formats. Qualification-match-number is used only as a tiebreaker when two matches at the same event have identical alliances (rare; same-event replays). [Unit 4, Unit 5]
- **R6** — Expose both TBA video types in the reconstructed URL set: `youtube` → `https://www.youtube.com/watch?v={key}`, `tba` → `https://www.thebluealliance.com/match/{match_key}`. Other types dropped with a debug log. [Unit 3]
- **R7** — Manual overrides remain first-class: existing `POST /api/match-video` / `DELETE /api/match-video/{id}` behavior, gating, schema, and response shape are unchanged. Admin UI retains the add form and the Remove button for manual entries. [Unit 5, Unit 7]
- **R8** — Force-sync trigger covers match sync as well as event sync: the existing `POST /api/tba-sync` (ROLE_SUPERUSER) runs both services sequentially under a single AtomicBoolean gate. [Unit 4]
- **R9** — Schedule-report rows (`/report/schedule` and `/report/schedule/active`) show a `📺` icon for every match that has at least one video (manual or TBA). Click opens the first available video in a new tab; if a match has both manual and TBA URLs the manual one wins first position (admin-curated preference). The icon is absent for matches with no videos. [Unit 6]
- **R10** — Staleness flips `stale = true` **only** when `last_status != 200` on a TBA match row, or when a schedule row has a tba_event_key set but no corresponding `RB_TBA_MATCH_VIDEO` row at all. Time-based staleness (P0's 90-minute threshold) does not apply to match videos because TBA volunteers routinely upload replays days or weeks after an event — a time threshold fires false positives in the normal case. [Unit 4, Unit 5]

## Scope Boundaries

- **Practice matches excluded** — TBA does not store practice-match videos meaningfully, and the strat team does not review them.
- **No per-match admin override column on `RB_SCHEDULE`.** Admin override lives at the tournament level (`RB_TOURNAMENT.tba_event_key`, established in P0). If a specific TBA match is wrong, admin adds the correct URL to `RB_MATCH_VIDEO` (which takes precedence in the merge via first-seen ordering, distinct canonicalization, and source=manual).
- **No change to `RB_MATCH_VIDEO` schema.** V22 stays as-is. New `source` column would require a migration that affects every existing row and pollutes the admin-owned surface.
- **No change to `POST /api/match-video` / `DELETE /api/match-video/{id}` behavior, gating, or response shape.** Role-gating tightening (currently `POST` is `IS_AUTHENTICATED`, allowing any authenticated user to write) is pre-existing and flagged; tightening stays out of this plan's scope.
- **No TBA match metadata beyond videos and alliances** (no scores, breakdowns, broadcast state). Scores + alliance data come from FRC API via `EventSyncService`; TBA's alliance data is consumed only to compute identity joins, not to overwrite RB's authoritative record.

### Deferred to Separate Tasks

- **Force-sync button in the admin UI** — explicitly deferred in P0. Admin still uses curl path. If tournament-day lag becomes a real pain, add a button in a small follow-up.
- **Cadence tuning during active tournaments** — P1 uses `fixedDelay = "1h"`. A live-tournament faster cadence (e.g. 15 minutes when an active tournament is detected) is optimization work if the strat team reports lag on match videos appearing.
- **Per-URL admin suppression** (hide a specific TBA URL without removing `tba_event_key`) — if strat team hits this, it's a small add later.

## Context & Research

### Relevant Code and Patterns

All paths are **RavenBrain** unless stated otherwise.

- `src/main/java/ca/team1310/ravenbrain/matchvideo/MatchVideoRecord.java` — existing entity mapping `RB_MATCH_VIDEO`. Fields: `id`, `tournamentId`, `matchLevel`, `matchNumber`, `label`, `videoUrl`. Unique key on `(tournament_id, match_level, match_number, label)` — allows multiple videos per match (e.g. "Full Field" + "Driver Station").
- `src/main/java/ca/team1310/ravenbrain/matchvideo/MatchVideoService.java` — `CrudRepository<MatchVideoRecord, Long>`, provides `findAllByTournamentId` and `findByMatch`.
- `src/main/java/ca/team1310/ravenbrain/matchvideo/MatchVideoApi.java` — `GET /api/match-video/{tournamentId}`, `GET /api/match-video/{tournamentId}/{level}/{match}`, `POST` (IS_AUTHENTICATED), `DELETE /{id}` (ROLE_ADMIN).
- `src/main/resources/db/migration/V22__match_video.sql` — the existing schema this plan does not touch.
- `src/main/java/ca/team1310/ravenbrain/schedule/ScheduleService.java` — `findAllByTournamentIdOrderByMatch(id)` is the read side; `findAllByTournamentIdInListOrderByTournamentId(ids)` batches across tournaments.
- `src/main/java/ca/team1310/ravenbrain/schedule/ScheduleRecord.java` — fields `tournamentId`, `level` (TournamentLevel), `match` (int), plus alliance fields `red1, red2, red3, red4` and `blue1, blue2, blue3, blue4` (int, NOT NULL in schema). `red4` / `blue4` are 0 when a match has three-team alliances. The 6- or 8-team alliance tuple is the identity key this plan relies on.
- `src/main/java/ca/team1310/ravenbrain/frcapi/model/TournamentLevel.java` — enum `None, Practice, Qualification, Playoff`. Identity via alliance composition means this plan does not need TBA's finer `qf/sf/f/ef` breakdown at all — we match by team tuples.
- `src/main/java/ca/team1310/ravenbrain/tournament/WatchedTournamentService.java` — `getWatchedTournamentIds()` returns the watched set; `isWatched(id)` is O(1).
- `src/main/java/ca/team1310/ravenbrain/frcapi/service/EventSyncService.java` — `getActiveTournamentsToSync()` (private, different package from `tbaapi`). This plan does NOT promote it; the 3-line filter is duplicated inline in `TbaMatchSyncService` (see Unit 4).
- `src/main/java/ca/team1310/ravenbrain/tbaapi/fetch/TbaCachingClient.java` — HTTP + TTL cache with ETag/Last-Modified. `fetch(uri)` is the single entry point.
- `src/main/java/ca/team1310/ravenbrain/tbaapi/service/TbaClientService.java` — existing `getEvent(key)` pattern (URL-encode path segment, parse JSON into typed record, return an `EventFetch` wrapper). The new `getEventMatches(key)` method mirrors this shape.
- `src/main/java/ca/team1310/ravenbrain/tbaapi/service/WebcastUrlReconstructor.java` — owns `canonicalize(url)` (system-wide URL normalization). Reused verbatim for match-video URLs.
- `src/main/java/ca/team1310/ravenbrain/tbaapi/service/TbaEventSyncService.java` — the pattern Unit 4 replicates for matches.
- `src/main/java/ca/team1310/ravenbrain/tbaapi/service/TbaSyncApi.java` — force-sync controller + `AtomicBoolean syncInProgress` gate. Unit 4 extends `forceSync()` to also trigger match sync.
- **RavenEye** `app/routes/report/team-schedule-page.tsx` — the viewer surface for `/report/schedule`. This is where Unit 6 adds the per-row `📺` icon.
- **RavenEye** `app/routes/report/team-schedule-active-page.tsx` — sibling page at `/report/schedule/active` (same icon treatment).
- **RavenEye** `app/routes/admin/match-videos-page.tsx` — admin CRUD page. Unit 7 adds source badges, staleness banner, and disabled Remove for TBA entries.
- **RavenEye** `app/types/MatchVideo.ts` — existing type. Unit 5/6 widens with optional `source`, `stale`, nullable `id`.
- **RavenEye** `app/common/storage/rb.ts` — `getMatchVideos`, `getMatchVideosByMatch`, `addMatchVideo`, `deleteMatchVideo`. Unit 6 adds no new wrapper — the existing `getMatchVideos(tournamentId)` returns the enriched shape.
- **RavenEye** `app/assets/css/components.css` — `.badge-tba`, `.badge-manual`, `.banner-info` already exist from P0 and are reused as-is.

### External References

- [TBA `/event/{event_key}/matches` endpoint](https://www.thebluealliance.com/apidocs/v3) — returns `List<Match>` for an event. Simple form (`/matches/simple`) drops `videos`, so the full endpoint is required.
- [TBA `Match` model](https://github.com/TBA-API/tba-api-client-python/blob/master/docs/Match.md) — includes `videos` array, `alliances.red.team_keys` / `alliances.blue.team_keys` (FRC team keys like `"frc1310"`), `comp_level`, `match_number`, `set_number`.
- TBA caching/auth/rate-limit guidance — inherited from P0 research; no new external references.

## Key Technical Decisions

- **Batch fetch via `/event/{key}/matches`, not per-match fetches.** One API call per event covers every match's videos — an 80×-reduction in TBA calls vs `/match/{key}` per schedule row. Same batch call also returns the alliance team keys we need for identity joins.
- **Match identity by alliance composition, not by match key.** RB_SCHEDULE stores alliance team numbers (`red1-4`, `blue1-4`) from FRC at schedule-publish time; TBA's Match response includes the same team numbers under `alliances.red.team_keys` / `alliances.blue.team_keys` (as `"frc1310"` keys). Identity = `sorted(red_teams) = sorted(red_teams) AND sorted(blue_teams) = sorted(blue_teams)` within the same event. This is robust across:
  - Mid-event qual rescheduling (match numbers drift; alliances don't)
  - All playoff bracket formats (no need to decode `qf1m2` → RB Playoff #4)
  - Surrogate/replay matches (alliances identify the specific pairing)
- **Same-event tiebreaker.** In rare cases two matches at the same event have identical alliance composition (qualification with a surrogate team, or a literal replay). In that case the tiebreaker is `comp_level_match_number` proximity — if RB has two qm matches with the same alliances, we prefer the one whose `matchNumber` is closest to TBA's `match_number`. This is edge-case enough that it lives as a comment in the join logic, not as a schema concern.
- **Store alliance composition alongside videos.** `RB_TBA_MATCH_VIDEO` columns include `red_teams` and `blue_teams` as canonical sorted comma-separated team-number strings (e.g. `"1310,2056,4917"`). This pre-computes the sort for read-time joins. Could also be a JSON array, but the CSV form is smaller, indexable, and fits a `VARCHAR(63)` comfortably (3-4 team numbers max).
- **`RB_TBA_MATCH_VIDEO` keyed by the full TBA match key (string PK).** Survives re-mapping of `tba_event_key` without orphaning existing data. The PK is informational (for upsert idempotency and debugging); actual reads join via `(tba_event_key, red_teams, blue_teams)`.
- **TBA sync is the only writer to `RB_TBA_MATCH_VIDEO`; admin CRUD is the only writer to `RB_MATCH_VIDEO`.** Disjoint write surfaces (P0 ownership invariant).
- **Videos stored as a canonicalized JSON array of URL strings**, not as `{type, key}` objects. Canonicalization + dedup happens at sync time.
- **Read-time merge via `MatchVideoEnricher`** (mirrors `TournamentEnricher` from P0). One batched `RB_TBA_MATCH_VIDEO` lookup per `getMatchVideos(tournamentId)` call regardless of match count.
- **Enriched API response, additive.** Existing callers see the old fields plus optional `source` and `stale`. For each TBA-sourced URL we emit one synthetic response row with `id: null`, `source: "tba"`, `label: "TBA"`. Admin entries keep their existing labels ("Full Field", "Driver Station", etc.) with `source: "manual"`.
- **Schedule-report surface: minimum-viable icon.** A `📺` icon beside each match row links directly to the first available video (manual takes priority over TBA to honor admin curation). Zero additional vertical space in the table; no expand-collapse complexity; no source-attribution UX on the viewer page (attribution lives on the admin page where it matters for editing). If strat team reports wanting to pick between multiple URLs per match, follow-up work adds a popover.
- **Sync cadence: `@Scheduled(fixedDelay = "1h")`** — same as event sync. Tunable later.
- **Scope asymmetry vs. event sync is intentional.** P0's `TbaEventSyncService` syncs every tournament with a non-blank `tba_event_key`. Match sync narrows to watched/active only per Tony's directive — match payloads are larger (~80 qm + ~14 playoff rows per event) and past-event match videos are low-value for an active strat team while past-event webcasts stay useful as TV-guide reference.
- **No per-row raw JSON cached.** The full `/event/{key}/matches` response payload is already preserved in `RB_TBA_RESPONSES.body` via `TbaCachingClient`; forensic lookup goes through the response cache, not a per-match duplicate.
- **Staleness: status-only, no time threshold.** TBA volunteers upload match videos days to weeks after an event. A time threshold (P0 used 90 min for webcasts) fires false positives during healthy operation. `stale = true` only when `last_status != 200` or when a schedule row's tournament has `tba_event_key` set but no matching `RB_TBA_MATCH_VIDEO` row exists at all.
- **Force-sync extension**: `POST /api/tba-sync` runs event sync then match sync inside the same `AtomicBoolean` gate, sequentially. Each sync has its own try/catch inside the single async task, so one failing does not prevent the other from running. The response is always 202 if the gate was acquired.

## Open Questions

### Resolved During Planning

- **Sync scope** — watched/active tournaments only.
- **Match-level scope** — all levels except Practice.
- **Match identity algorithm** — alliance-composition join, not match-number derivation.
- **Playoff scope** — included (alliance matching handles it automatically).
- **Rendering surface** — schedule report (primary viewer) + admin page (source badges for CRUD cleanup).
- **Icon vs expanded UX** — icon per row; no expansion in this phase.
- **Staleness semantics** — status-only, time threshold dropped.
- **Cadence** — 1h default; tunable.
- **`getActiveTournamentsToSync()` visibility** — duplicated inline (cross-package private cannot be promoted).
- **Response shape for POST/DELETE** — unchanged (no enrichment on write paths).

### Deferred to Implementation

- **Edge case: TBA returns a match with only 2 team keys per alliance** (shouldn't happen but the protocol permits it). Implementer decides: skip that match with a warning, or pad with zero and still attempt the join.
- **Tiebreaker for identical-alliance matches at the same event** — same-alliance surrogate matches are rare. A simple fallback ordering (prefer lower-matchNumber-delta) is enough; implementer confirms on first run against real data.
- **Rate-limit defensive `Thread.sleep()` between event fetches** — add only if logs show hot-looping on championship-sized syncs.
- **Force-sync error-handling semantics** — one task, two sub-syncs, each wrapped in try/catch. The return status is 202 if the gate was acquired; HTTP response does not depend on sub-sync success.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

### Component interaction

```
┌──────────────────────────┐  1h fixedDelay   ┌────────────────────────────┐
│ TbaMatchSyncService      │────────────────▶ │ TbaClientService           │
│ (@Scheduled)             │                   │   .getEventMatches(key)    │
│ scope: watched ∪ team    │                   │ (parses JSON, canonicalize │
│ (duplicated filter)      │                   │  URLs + alliance keys)     │
└─────────────┬────────────┘                   └─────────────┬──────────────┘
              │ writes (only)                                 │ uses
              ▼                                               ▼
┌──────────────────────────┐                   ┌────────────────────────────┐
│ RB_TBA_MATCH_VIDEO       │                   │ TbaCachingClient           │
│ (tba_match_key PK,       │                   │ (ETag + If-Mod-Since)      │
│  tba_event_key,          │                   └─────────────┬──────────────┘
│  comp_level,             │                                 │ HTTP
│  red_teams, blue_teams,  │                   ┌─────────────▼──────────────┐
│  videos_json,            │                   │ TBA API v3                 │
│  last_sync, last_status) │                   │ GET /event/{key}/matches   │
└─────────────┬────────────┘                   └────────────────────────────┘
              │ read (only)
              │           ┌──────────────────────┐   admin CRUD (only)
              │           │ RB_MATCH_VIDEO       │ ◀────────────────────┐
              │           │ (admin-owned rows)   │                      │
              │           └──────────┬───────────┘                      │
              │ read                 │ read                             │
              ▼                      ▼                                  │
┌──────────────────────────────────────────────────┐    ┌──────────────────────────┐
│ MatchVideoEnricher                               │───▶│ GET /api/match-video/{id}│
│ join RB_SCHEDULE ⋈ RB_TBA_MATCH_VIDEO on         │    │ per entry: source, stale,│
│   (tba_event_key, sorted(red), sorted(blue))     │    │ label, videoUrl, id?     │
│ merge = canonicalize(manual) ∪                   │    └─────────────┬────────────┘
│         canonicalize(tba_videos_json)            │                  │
└──────────────────────────────────────────────────┘                  ▼
                                                       ┌──────────────────────────────┐
                                                       │ RavenEye                     │
                                                       │ • /report/schedule           │
                                                       │   📺 icon per match row      │
                                                       │ • /admin/match-videos        │
                                                       │   From TBA / Manual badges,  │
                                                       │   stale banner when status≠200│
                                                       │   disabled Remove on TBA rows│
                                                       └──────────────────────────────┘
```

### Match-identity join, directional pseudo-code

```
// Sync time (one row per TBA match):
for each match m in /event/{eventKey}/matches:
  red  = canonicalSort(extractTeamNumbers(m.alliances.red.team_keys))   // "1310,2056,4917"
  blue = canonicalSort(extractTeamNumbers(m.alliances.blue.team_keys))
  videos = reconstructAndDedup(m.videos, m.key)  // from Unit 3
  upsert RB_TBA_MATCH_VIDEO(
    tba_match_key = m.key,
    tba_event_key = eventKey,
    comp_level    = m.comp_level,          // stored for debugging, not used in join
    red_teams     = red,
    blue_teams    = blue,
    videos_json   = toJsonArray(videos),
    last_sync     = now(),
    last_status   = 200
  )

// Read time (enricher, per tournament):
tbaRows      = find RB_TBA_MATCH_VIDEO where tba_event_key = tournament.tba_event_key
tbaByTuple   = tbaRows groupBy (red_teams, blue_teams)

for each RB_SCHEDULE row s in the tournament:
  key = (canonicalSort(s.red1..4), canonicalSort(s.blue1..4))
  matching = tbaByTuple[key]
  if matching.isEmpty: continue (no TBA videos for this match)
  tbaRow = matching.size == 1
           ? matching.first
           : matching.minBy(candidate -> abs(candidate.match_number - s.matchNumber))
  for url in parseWebcasts(tbaRow.videos_json):
    emit MatchVideoResponse(id=null, tournamentId=s.tournamentId,
                            matchLevel=s.level, matchNumber=s.matchNumber,
                            label="TBA", videoUrl=url,
                            source="tba", stale=isStale(tbaRow))
```

## Implementation Units

- [ ] **Unit 1: V33 `RB_TBA_MATCH_VIDEO` migration + entity + repo**

**Goal:** Introduce the schema and JDBC entity/repo for the TBA-sourced match video data, including the alliance-composition columns that power the read-time join.

**Requirements:** R1, R2, R3, R5.

**Dependencies:** None (V30–V32 from P0 are already applied).

**Files:**
- Create: `RavenBrain/src/main/resources/db/migration/V33__tba_match_video.sql`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/service/TbaMatchVideoRecord.java`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/service/TbaMatchVideoRepo.java`

**Approach:**
- Columns: `tba_match_key VARCHAR(63) PRIMARY KEY`, `tba_event_key VARCHAR(31) NOT NULL`, `comp_level VARCHAR(4) NOT NULL`, `red_teams VARCHAR(63) NOT NULL`, `blue_teams VARCHAR(63) NOT NULL`, `videos_json TEXT NULL`, `last_sync TIMESTAMP(3) NULL`, `last_status INT NULL`. Index on `(tba_event_key, red_teams, blue_teams)` for the read-time join.
- `red_teams` / `blue_teams` stored as comma-separated sorted team-number strings (e.g. `"1310,2056,4917"`). Pre-sorted at write time so reads are pure string equality.
- Repo methods: `findById(tbaMatchKey)`, `findByTbaEventKey(key)`, standard `save` / `update` / `deleteById`.

**Patterns to follow:**
- `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/service/TbaEventRecord.java` — record shape + column annotations.
- `RavenBrain/src/main/resources/db/migration/V32__tba_event.sql` — migration file style.

**Test scenarios:**
- Happy path: Flyway migrates cleanly from V32 baseline; inserting a row with all required columns succeeds; `findById("2026onto_qm1")` round-trips the alliance strings.
- Edge case: inserting with `videos_json = NULL` and `last_sync = NULL` succeeds (pre-first-sync / failed-fetch state).
- Edge case: index on `(tba_event_key, red_teams, blue_teams)` speeds a `findByTbaEventKey` + Java-side filter (implementer spot-checks EXPLAIN on a populated table).

**Verification:**
- `./gradlew test` passes; repo wiring smoke test (see Unit 4) loads the table without schema errors.

---

- [ ] **Unit 2: TBA `/event/{key}/matches` models + service method**

**Goal:** Model the TBA Match response (including alliances) and expose `TbaClientService.getEventMatches(key)` that returns the full list in one batch call.

**Requirements:** R1, R2, R5, R6.

**Dependencies:** Unit 1 not strictly required; this unit's data shape feeds Units 3/4.

**Files:**
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/model/TbaMatch.java`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/model/TbaMatchVideo.java`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/model/TbaMatchAlliance.java`
- Modify: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/service/TbaClientService.java` — add `getEventMatches(String eventKey)` + matching `EventMatchesFetch` wrapper.
- Test: `RavenBrain/src/test/java/ca/team1310/ravenbrain/tbaapi/service/TbaClientServiceMatchesTest.java`

**Approach:**
- `TbaMatch` record: `key` (String), `compLevel` (`@JsonProperty("comp_level")`), `matchNumber` (`@JsonProperty("match_number")`), `setNumber` (`@JsonProperty("set_number")`, default 1 for qm), `alliances` (`TbaMatchAlliances` nested record or a map), `videos` (`List<TbaMatchVideo>`, `@Nullable`). Ignore all other fields.
- `TbaMatchAlliances` (or equivalent): `red` (`TbaMatchAlliance`), `blue` (`TbaMatchAlliance`). Alternatively model as `Map<String, TbaMatchAlliance>` keyed by `"red"` / `"blue"`.
- `TbaMatchAlliance` record: `teamKeys` (`@JsonProperty("team_keys")` List<String>). Team-key format is `"frc1310"` — Unit 4 strips the `"frc"` prefix to get the integer team number.
- `TbaMatchVideo` record: `type` (String), `key` (String).
- `getEventMatches` mirrors `getEvent`: URL-encode path segment, fetch `event/{encoded}/matches`, parse JSON array, wrap in `EventMatchesFetch(responseId, rawBody, matches)`.

**Patterns to follow:**
- `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/model/TbaEvent.java` + `TbaWebcast.java` — record style, `@Serdeable`, snake-case annotations.
- `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/service/TbaClientService.java` `getEvent(...)` — entire pattern for URL-encode + outcome enum + parse.

**Test scenarios:**
- Happy path: canned JSON with a mix of `qm`, `qf`, `sf`, `f` matches parses into `List<TbaMatch>`; each match's `videos` parses correctly; each match's `alliances.red.team_keys` parses into a list of `"frc..."` strings.
- Happy path: match with empty `videos: []` array parses to empty list, not null.
- Happy path: match with a 3-team alliance (e.g., `["frc1310", "frc2056", "frc4917"]`) AND a match with a 4-team alliance (older seasons) both parse.
- Edge case: unknown TBA fields (alliance score breakdown, match time, post_result_time, etc.) are ignored without failing deserialization.
- Edge case: match with no `videos` field (field missing entirely) parses with `videos == null`; Unit 3's reconstructor tolerates null.
- Edge case: match with malformed team_key (e.g., `"frcABC"`) — parser does not throw; Unit 4 filters/logs when parseInt fails.
- Integration scenario: `TbaClientService.getEventMatches("2026onto")` constructs a `GET /event/2026onto/matches` request path, using the same cache TTL + ETag semantics as `getEvent`.

**Verification:**
- `./gradlew test --tests "ca.team1310.ravenbrain.tbaapi.service.TbaClientServiceMatchesTest"` passes.

---

- [ ] **Unit 3: Match-video URL reconstruction**

**Goal:** Add match-video-specific URL reconstruction (youtube + tba types) as a peer of `WebcastUrlReconstructor`, reusing the existing `canonicalize()` helper.

**Requirements:** R6.

**Dependencies:** Unit 2.

**Files:**
- Modify: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/service/WebcastUrlReconstructor.java` — add `reconstructMatchVideo(TbaMatchVideo, String tbaMatchKey)` + `reconstructAndDedupMatchVideos(List<TbaMatchVideo>, String tbaMatchKey)`. (Or create a sibling `MatchVideoUrlReconstructor` class — implementer's judgment; deciding factor is whether `canonicalize()` stays the single entry point.)
- Test: `RavenBrain/src/test/java/ca/team1310/ravenbrain/tbaapi/service/MatchVideoUrlReconstructorTest.java` (or extend `WebcastUrlReconstructorTest.java`).

**Approach:**
- `type = "youtube"` → `https://www.youtube.com/watch?v={video.key}`
- `type = "tba"` → `https://www.thebluealliance.com/match/{tbaMatchKey}` (enclosing match key, not the video's `key` field)
- Other types → `Optional.empty()` + debug log
- Batch helper canonicalizes each result + drops duplicates with a `LinkedHashSet` (preserves first-seen order).

**Patterns to follow:**
- `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/service/WebcastUrlReconstructor.java` — full shape for `reconstruct()`, `reconstructAndDedup()`, `canonicalize()`.

**Test scenarios:**
- Happy path: `{type: "youtube", key: "abc123"}` → `https://www.youtube.com/watch?v=abc123`.
- Happy path: `{type: "tba", key: "ignored"}` with `tbaMatchKey = "2026onto_qm12"` → `https://www.thebluealliance.com/match/2026onto_qm12`. Video's `key` field is ignored.
- Edge case: unsupported types (`iframe`, `html5`, `rtmp`, `dacast`, `ustream`, `justin`, `stemtv`, `mms`) → `Optional.empty()` + one debug log each.
- Edge case: `{type: "youtube", key: null}` / `""` / `"   "` → `Optional.empty()`.
- Edge case: `reconstructAndDedupMatchVideos` on a payload with two identical `youtube` keys returns one entry.
- Edge case: mixed-type payload produces distinct URLs in first-seen order.

**Verification:**
- `./gradlew test --tests "ca.team1310.ravenbrain.tbaapi.service.*Reconstructor*"` passes.

---

- [ ] **Unit 4: `TbaMatchSyncService` + force-sync extension**

**Goal:** Run scheduled + on-demand TBA match-video sync for watched/active tournaments. Writes to `RB_TBA_MATCH_VIDEO` and nothing else.

**Requirements:** R1, R2, R3, R5, R8, R10.

**Dependencies:** Units 1, 2, 3.

**Files:**
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/service/TbaMatchSyncService.java`
- Modify: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/service/TbaSyncApi.java` — `forceSync()` also triggers `tbaMatchSyncService.syncAllActiveTournaments()` under the same `AtomicBoolean` gate.
- Test: `RavenBrain/src/test/java/ca/team1310/ravenbrain/tbaapi/service/TbaMatchSyncServiceTest.java`

**Approach:**
- `TbaMatchSyncService` has `@Scheduled(fixedDelay = "1h")` method `syncAllActiveTournaments()`. Filter logic duplicated inline: `(ownerTeamTournaments ∪ watchedTournaments) ∩ findUpcomingAndActiveTournaments()`, then filter to non-blank `tbaEventKey`.
- For each qualifying tournament: validate `tbaEventKey` against regex `/^20\d{2}[a-z][a-z0-9]{1,15}$/` (defensive in case invalid data is already stored); call `TbaClientService.getEventMatches(tbaEventKey)`.
- Success path: for each TBA match:
  - Extract team numbers from `alliances.red.team_keys` / `alliances.blue.team_keys` (strip `"frc"` prefix, parseInt; skip match with warning if any fail).
  - Skip matches with `comp_level == "ef"` **or** where Practice would apply (TBA doesn't expose Practice). Keep all `qm` / `qf` / `sf` / `f` (R2: playoffs included).
  - Sort red + blue team tuples to canonical comma-separated strings.
  - Reconstruct + canonicalize + dedup videos via Unit 3's helper.
  - Upsert `TbaMatchVideoRecord` by PK.
  - Set `last_sync = Instant.now()`, `last_status = 200`.
- Failure path (non-200, parse failure, transport failure): log + `persistStatusOnly(tbaMatchKey, status)` for previously-synced rows where possible. Previous `videos_json` preserved.
- Never touches `RB_MATCH_VIDEO` or `RB_TOURNAMENT`.
- `TbaSyncApi.forceSync()` extends: event sync in its own try/catch → match sync in its own try/catch, both under the same `AtomicBoolean`. Response is 202 if the gate was acquired.

**Execution note:** Characterization-first. Before wiring the new sync, write a test that exercises the existing admin `POST /api/match-video` path end-to-end and asserts `RB_MATCH_VIDEO` state is preserved after. Then introduce the sync service so regression coverage on admin CRUD exists independent of the TBA path.

**Patterns to follow:**
- `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/service/TbaEventSyncService.java` — `syncAllMappedTournaments`, `syncOne`, `persistSuccess`, `persistStatusOnly`. Specialize for matches.
- `RavenBrain/src/main/java/ca/team1310/ravenbrain/frcapi/service/FrcSyncApi.java` — `AtomicBoolean` gate + async executor.

**Test scenarios:**
- Happy path: watched tournament with `tba_event_key = "2026onto"` and two qm matches in TBA → two `RB_TBA_MATCH_VIDEO` rows persisted with correct `red_teams`/`blue_teams` sorted tuples, `last_status = 200`, `videos_json` canonicalized, `RB_MATCH_VIDEO` untouched.
- Happy path: same tournament on a second sync with unchanged TBA payload → upsert produces the same rows (PK dedup); no duplicates.
- Happy path: TBA response includes a `qf1m2` match with alliance `[frc1310, frc2056, frc4917]` / `[frc1114, frc2713, frc5406]` → row persisted with comp_level="qf", red_teams="1310,2056,4917", blue_teams="1114,2713,5406".
- Happy path: alliance order in TBA payload doesn't match RB — sorting produces equal tuples (test with red teams `[frc4917, frc1310, frc2056]` from TBA vs `[frc1310, frc2056, frc4917]` from RB).
- Edge case: match with empty `videos: []` → row persisted with `videos_json = "[]"`, `last_status = 200`.
- Edge case: match with all unsupported video types (e.g., only `iframe`) → `videos_json = "[]"`, `last_status = 200`.
- Edge case: watched tournament with `tbaEventKey = null` → skipped, no row written.
- Edge case: watched tournament with malformed `tbaEventKey` (regex fails) → skipped with warning log.
- Edge case: match with malformed alliance team key (`"frcABC"`) → match skipped with warning, other matches processed.
- Edge case: match with `comp_level == "ef"` (eighthfinal, eligible per R2 but uncommon) → persisted; not skipped.
- Error path: TBA returns 404 for the event → `last_status = 404` on previously-synced rows; no new rows written; logs warning.
- Error path: `TbaClientException` on one tournament doesn't abort the loop.
- Integration: `POST /api/tba-sync` as SUPERUSER triggers both event + match sync; second concurrent call returns 409 CONFLICT.
- Integration: existing admin `POST /api/match-video` after a TBA sync does not mutate `RB_TBA_MATCH_VIDEO` rows.

**Verification:**
- `./gradlew test --tests "ca.team1310.ravenbrain.tbaapi.service.TbaMatchSyncServiceTest"` passes.
- Full suite passes — no regression in `MatchVideoApi` or `TbaSyncApi` tests.

---

- [ ] **Unit 5: `MatchVideoEnricher` + alliance-join read path**

**Goal:** Merge TBA and admin match videos at read time by joining on alliance composition. Return the enriched response shape with per-entry source and staleness markers.

**Requirements:** R2, R4, R5, R7, R10.

**Dependencies:** Units 1, 3, 4.

**Files:**
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/matchvideo/MatchVideoResponse.java`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/matchvideo/MatchVideoEnricher.java`
- Modify: `RavenBrain/src/main/java/ca/team1310/ravenbrain/matchvideo/MatchVideoApi.java` — `GET /api/match-video/{tournamentId}` and `GET /api/match-video/{tournamentId}/{level}/{match}` return `List<MatchVideoResponse>`. `POST` / `DELETE` response shapes unchanged.
- Test: `RavenBrain/src/test/java/ca/team1310/ravenbrain/matchvideo/MatchVideoEnricherTest.java`

**Approach:**
- `MatchVideoResponse` fields: `@Nullable Long id`, `String tournamentId`, `String matchLevel`, `int matchNumber`, `String label`, `String videoUrl`, `String source` (`"manual"` | `"tba"`), `boolean stale`.
- `MatchVideoEnricher.enrich(tournamentId)`:
  1. Load admin rows via `matchVideoService.findAllByTournamentId`.
  2. Load tournament's `tba_event_key` from `tournamentService`.
  3. If key non-null: load all `RB_TBA_MATCH_VIDEO` rows for that event key via `tbaMatchVideoRepo.findByTbaEventKey(key)`.
  4. Load `RB_SCHEDULE` rows for the tournament via `scheduleService.findAllByTournamentIdOrderByMatch`.
  5. Build `Map<String, TbaMatchVideoRecord>` keyed by `"red_teams|blue_teams"` concatenation from TBA rows (cross-alliance symmetry: also insert under `"blue_teams|red_teams"` to tolerate swapped-alliance-color edge cases at playoffs).
  6. For each schedule row: sort red1-4, blue1-4 (skipping zeros) into canonical CSV, look up the map, match if present. On collision (multiple TBA matches for same alliance tuple), pick the one with minimum `|tba.matchNumber - schedule.matchNumber|`.
  7. For each TBA-sourced URL: emit `MatchVideoResponse(id=null, ..., label="TBA", source="tba", stale=isStale(tbaRow))`.
  8. For each admin row: emit `MatchVideoResponse(id=row.id, ..., source="manual", stale=false)`. Admin entries get listed first per match (admin-curated preference).
  9. Canonicalize-dedup URLs within each `(tournamentId, matchLevel, matchNumber)` group: if the same canonicalized URL appears as both admin and TBA, the admin entry wins (keeps its meaningful label).
- `isStale(tbaRow)`: `last_status != 200` → stale. Time-based logic removed.
- One batched DB lookup per `getMatchVideos(tournamentId)` — no per-match round trips.
- `getMatchVideosByMatch(tournamentId, level, match)` uses the same enricher but filters the output to a single match.

**Patterns to follow:**
- `RavenBrain/src/main/java/ca/team1310/ravenbrain/tournament/TournamentEnricher.java` — structure, batch lookup, canonicalize + dedup helpers.
- `RavenBrain/src/main/java/ca/team1310/ravenbrain/tournament/TournamentResponse.java` — response record shape.

**Test scenarios:**
- Happy path: tournament with `tba_event_key` set, one qm TBA video, no admin videos → single `MatchVideoResponse` with `source="tba"`, `label="TBA"`, alliance join matches the correct schedule row.
- Happy path: tournament with two admin videos + one TBA video on the same match → three entries, admin two first (labels preserved), then TBA.
- Happy path: canonicalization collapses admin+TBA duplicate URLs to one entry with `source="manual"` (admin wins tie).
- Happy path: a qf playoff match has 3 red / 3 blue team keys from TBA that match the RB_SCHEDULE playoff row by alliance composition — join succeeds even though RB's matchNumber is sequential (1..14) and TBA's `comp_level+set+match_number` are totally different.
- Happy path: mid-event rescheduling — RB_SCHEDULE has matchNumber=14 with alliances `[A,B,C]/[D,E,F]`; TBA has `qm15` with the same alliances → join succeeds on alliance composition, video correctly attributed to RB's match 14.
- Edge case: two different matches at the same event share alliance composition (possible in practice for surrogate placeholders) → collision tiebreaker picks closest match number.
- Edge case: tournament with `tba_event_key` but no `RB_TBA_MATCH_VIDEO` rows (pre-first-sync) → returns admin rows only; no TBA entries; no staleness surfaced at row level (see R10: missing row at schedule-row level surfaces as "no TBA badge appears" rather than a noisy flag).
- Edge case: TBA row with `last_status = 404` → TBA URLs from last successful sync still appear, each with `stale=true`.
- Edge case: admin videoUrl is a valid https URL but TBA row has a canonicalized version that differs only in trailing slash — dedup collapses to one.
- Edge case: Practice-level schedule rows → no TBA videos merged (Practice is out of scope).
- Edge case: schedule row has all-zero alliance teams (malformed/test data) → skipped for TBA lookup; only admin rows (if any) appear.
- Integration: `GET /api/match-video/{tournamentId}` returns enriched shape; serde round-trips correctly.
- Integration: `POST /api/match-video` adds a URL; next `GET` includes it as `source="manual"` alongside existing TBA entries.
- Integration: a TBA sync run between two `GET` calls changes the TBA URL set; second `GET` reflects the new set without admin action.

**Verification:**
- `./gradlew test --tests "ca.team1310.ravenbrain.matchvideo.*"` passes.
- End-to-end smoke: `GET /api/match-video/<tournamentId>` for a real tournament returns the merged list with correct join behavior.

---

- [ ] **Unit 6: Schedule-report video icon (primary viewer surface)**

**Goal:** Render a small `📺` icon beside each match row on `/report/schedule` and `/report/schedule/active` when the match has at least one video. Click opens the first video in a new tab. Primary consumer surface for this feature.

**Requirements:** R9.

**Dependencies:** Unit 5 (the enricher populates the data source).

**Files:**
- Modify: `RavenEye/app/routes/report/team-schedule-page.tsx` — add the icon column / inline element.
- Modify: `RavenEye/app/routes/report/team-schedule-active-page.tsx` — same change.
- Modify: `RavenEye/app/types/MatchVideo.ts` — add optional `source?: "manual" | "tba"`, `stale?: boolean`; widen `id` to `number | null`.
- Modify: `RavenEye/app/common/storage/rb.ts` — `getMatchVideos` / `getMatchVideosByMatch` TypeScript return type widens to include the new fields (runtime unchanged; additive).
- Modify: `RavenEye/app/assets/css/components.css` — add a `.schedule-video-icon` style (small font, no underline, hover darkens slightly; dark-mode variant).

**Approach:**
- On schedule-report mount: call `getMatchVideos(tournamentId)` (or `getMatchVideosByMatch` for the active-page subset), cache by `(tournamentId, matchLevel, matchNumber)` → `MatchVideoResponse[]`.
- Per row: if the cached entry list is non-empty, render `<a className="schedule-video-icon" href={videos[0].videoUrl} target="_blank" rel="noopener noreferrer" title="Watch match video (opens in new tab)">📺</a>` in a dedicated column or inline next to the match number.
- If the list is empty, render nothing (no placeholder — absence of icon is the signal).
- `videos[0]` is the first entry, which per Unit 5 is the admin entry if one exists, otherwise the first TBA URL. Admin curation respected automatically.
- No badge or staleness treatment on the report page — this is a viewer surface, not an editor. Attribution + staleness live on the admin page (Unit 7).

**Patterns to follow:**
- Existing `team-schedule-page.tsx` for its row render pattern.
- `safeHref()` pattern used in P0's admin streams page — if the URL validator isn't already shared, reuse it defensively to avoid rendering a `javascript:` href (see Security pre-existing gap note).

**Test scenarios:**
<!-- RavenEye has no test runner per RavenEye/CLAUDE.md. Manual verification scenarios. -->
- Manual happy path: schedule report for a tournament with synced TBA data → most/all rows show `📺`; clicking opens the correct YouTube/TBA video in a new tab.
- Manual happy path: schedule report for a tournament with no TBA sync and one admin-added video → only that one row shows `📺`, pointing to the admin URL.
- Manual happy path: admin adds a video on the admin page → after a page refresh the icon appears on the corresponding row of the schedule report.
- Manual edge case: a match row with both an admin URL and a TBA URL → icon opens the admin URL (first-entry priority).
- Manual edge case: schedule report for a tournament with `tbaEventKey` unset → no icons unless admin has added URLs.
- Manual edge case: dark mode renders the icon with adequate contrast.
- Manual accessibility: the icon has a `title` attribute so screen-reader users hear "Watch match video (opens in new tab)" on focus.
- Typecheck: `npm run typecheck` passes.

**Verification:**
- `cd RavenEye && npm run typecheck` passes.
- Manual verification against a running RavenBrain with at least one watched tournament that has `RB_TBA_MATCH_VIDEO` rows populated.

---

- [ ] **Unit 7: Admin page badges + staleness banner + disabled Remove for TBA**

**Goal:** Bring the admin match-videos page into the source-attribution + staleness UX established by P0's webcast page. Lower-priority than Unit 6 (admin-only surface), but closes the CRUD UX story.

**Requirements:** R7.

**Dependencies:** Unit 5.

**Files:**
- Modify: `RavenEye/app/routes/admin/match-videos-page.tsx` — render `.badge-tba` / `.badge-manual` beside each URL; `.banner-info` at top when any displayed row has `stale: true`; disabled Remove with tooltip for `source === "tba"`.
- Do NOT modify `RavenEye/app/routes/admin/match-videos-detail-page.tsx` (3-line re-export).

**Approach:**
- Badge placement: inline, immediately after the URL, before the Remove button. Matches P0 streams-page positioning.
- Staleness banner: rendered once per selected tournament, above the match table, when any row has `stale: true`. Copy: `"(i) TBA match video sync last failed — some links may be stale or missing."` No time component since R10 dropped time-based staleness.
- Disabled Remove: `disabled` prop + `title="Served by TBA — remove by clearing the TBA event key or contacting TBA."` on the button. Matches P0 pattern.
- The `isAdmin` gate on Remove is pre-existing; TBA-disabling applies *inside* the admin-visible rendering.

**Patterns to follow:**
- `RavenEye/app/routes/admin/tournament-streams-page.tsx` from P0 — 1:1 reusable pattern for badges + banner + disabled-Remove.

**Test scenarios:**
<!-- Manual. -->
- Manual happy path: admin opens the page for a tournament with both manual and TBA entries → each URL shows the correct pill; Remove is enabled for manual, disabled with tooltip for TBA.
- Manual happy path: admin clicks Remove on a manual entry → row disappears; DB confirms.
- Manual edge case: TBA sync has failed (`last_status != 200` on the TBA rows) → `.banner-info` appears at the top of the tournament's section.
- Manual edge case: tournament with no TBA entries → no badges on admin rows (all manual); banner never fires.
- Typecheck: `npm run typecheck` passes.

**Verification:**
- `cd RavenEye && npm run typecheck` passes.
- Manual verification alongside Unit 6.

## System-Wide Impact

- **Interaction graph:** `TbaMatchSyncService` writes only to `RB_TBA_MATCH_VIDEO`. Admin CRUD writes only to `RB_MATCH_VIDEO`. `MatchVideoEnricher` reads `RB_MATCH_VIDEO`, `RB_TBA_MATCH_VIDEO`, `RB_SCHEDULE`, and `RB_TOURNAMENT` — it is pure read. Force-sync controller orchestrates both TBA syncs under the single `AtomicBoolean`.
- **Ownership contract** (carried from P0): TBA sync owns `RB_TBA_*` tables; admin CRUD owns `RB_MATCH_VIDEO` and `RB_TOURNAMENT.manual_webcasts`.
- **Error propagation:** TBA match-sync failures are caught per-tournament, recorded in `last_status`, never thrown out of the scheduled tick. A failed sync for one tournament does not abort the rest of the loop. Read path never fails; staleness is informational.
- **State lifecycle risks:**
  - Admin adds a video while sync runs → no conflict; disjoint tables.
  - Concurrent `POST /api/tba-sync` → `AtomicBoolean` gate rejects second call with 409.
  - Partial failure mid-loop → already-written rows persist; remaining tournaments wait for the next hourly tick.
  - Clearing a tournament's `tba_event_key` leaves orphan `RB_TBA_MATCH_VIDEO` rows. Low-impact (read path filters by current `tba_event_key`); periodic cleanup is future work.
  - Alliance-composition collisions (same teams on two different matches at the same event) exist in theory but are rare; tiebreaker by match-number proximity covers the realistic case.
- **API surface parity:**
  - `GET /api/match-video/{tournamentId}` grows additively (`source`, `stale`, nullable `id`). Callers ignoring unknown fields unaffected.
  - `GET /api/match-video/{tournamentId}/{level}/{match}` same shape change.
  - `POST /api/match-video` and `DELETE /api/match-video/{id}` response shapes unchanged.
  - `GET /report/schedule` now fetches match videos on mount (new network call). Offline-first expectation: the page gracefully renders with no icons if the videos fetch fails or returns nothing.
- **Integration coverage:** Key scenarios covered by Unit 4 and Unit 5 integration tests: (a) admin add + TBA sync + read returns merged list; (b) TBA sync does not touch `RB_MATCH_VIDEO`; (c) alliance-composition join correctly matches across reschedules and playoffs.
- **Unchanged invariants:**
  - `RB_MATCH_VIDEO` schema (V22) untouched.
  - `POST /api/match-video` gating stays at `IS_AUTHENTICATED` (pre-existing; documented as future tightening).
  - `DELETE /api/match-video/{id}` gating stays at `ROLE_ADMIN`.
  - `RequireLogin` on admin endpoints unchanged.
  - CB-safe palette convention holds.

### Pre-existing gap noted (not fixed here)

`POST /api/match-video` remains `@Secured(IS_AUTHENTICATED)` — any authenticated role can add a match video. Pre-existing before this plan; closing it is a follow-up (same shape as the P0 webcast role-gating fix).

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Alliance-composition collisions (two matches at same event with identical teams) | Tiebreaker by match-number proximity. If collisions prove common in practice, follow-up adds a secondary tiebreaker by start time. |
| TBA `team_keys` array order differs from RB's red1-4/blue1-4 order | Canonical sort at both write and read side; no order dependence. |
| TBA returns `"frc"` prefix we can't parseInt (malformed data) | Per-match skip with warning log; does not abort loop. |
| Orphan `RB_TBA_MATCH_VIDEO` rows when admins clear `tba_event_key` | Low storage cost; read path filters by current key so users don't see orphans. Cleanup job is future work. |
| 1-hour cadence vs. live-tournament real-time needs | Explicitly deferred to future cadence-tuning work. Force-sync endpoint available for manual refresh. |
| Combined force-sync gate holds both syncs | P0 risk carried forward; split into per-service gates is future work. Each sub-sync has its own try/catch so one failing doesn't block the other. |
| Schedule report makes a new network call on mount (the videos fetch) | Graceful degradation: no icons rendered if the fetch fails. Existing schedule data is cached in IndexedDB; the videos overlay is additive. |
| TBA uploads match videos days/weeks after events | Handled by R10: status-only staleness; no time-based false positives. Users who open a past-event schedule report see TBA videos that were not there before automatically as sync catches up. |

## Documentation / Operational Notes

- `RavenEye/docs/match-video-tba-sync.md` — create a short design doc (or copy the plan, as done for P0).
- No new environment variables. `TBA_KEY`, `TBA_BASE_URL` from P0 carry over.
- Migration V33 applies automatically on startup.
- Observability: log the per-sync summary (`"TBA match sync: X tournaments, Y match rows written, Z failures"`) to support the adoption-measure-then-cut principle.
- Rollout posture: safe to ship dark. No watched tournament → no sync activity → schedule report renders exactly as today. Enabling the feature per-tournament is an admin action (set `tba_event_key` via the P0 UI).

## Sources & References

- **Upstream plan:** [RavenEye/docs/plans/2026-04-18-001-feat-tba-data-foundation-plan.md](2026-04-18-001-feat-tba-data-foundation-plan.md) — P0 TBA Data Foundation.
- Related code (RavenBrain): `tbaapi/` package (pattern to replicate); `matchvideo/` package (existing CRUD surface); `schedule/ScheduleService.java` (alliance identity source); `V22__match_video.sql` (unchanged).
- Related code (RavenEye): `app/routes/report/team-schedule-page.tsx` (primary viewer surface); `app/routes/admin/match-videos-page.tsx` (admin CRUD); `app/routes/admin/tournament-streams-page.tsx` (pattern reference).
- External docs:
  - [TBA `/event/{event_key}/matches`](https://www.thebluealliance.com/apidocs/v3)
  - [TBA Match model (generated client docs)](https://github.com/TBA-API/tba-api-client-python/blob/master/docs/Match.md)
