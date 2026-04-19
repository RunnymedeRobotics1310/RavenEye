---
title: "feat: TBA Data Foundation and Webcast Sync (P0)"
type: feat
status: active
date: 2026-04-18
deepened: 2026-04-18
origin: RavenEye/docs/brainstorms/2026-04-17-team-capability-rankings-requirements.md
---

# TBA Data Foundation and Webcast Sync (P0)

> **2026-04-19 — Alignment note from network-communication-refinement (Unit 9).**
> The network-communication-refinement work
> (`RavenEye/docs/plans/2026-04-19-001-feat-network-communication-refinement-plan.md`)
> has landed and this plan is halted awaiting a resume. When it resumes, the following
> adjustments are already in place and should be reflected in the implementation rather
> than re-introduced:
>
> - `TbaEventSyncService` and `TbaMatchSyncService` no longer use hardcoded
>   `@Scheduled(fixedDelay = "1h")` literals. Both read from `raven-eye.sync.tba-event-poll`
>   and `raven-eye.sync.tba-match-poll` in the unified sync-config block.
> - `TournamentResponse` now carries `activeFrom` / `activeUntil` in addition to the
>   webcast fields this plan adds. No conflict — they're independent additive fields.
> - `TournamentEnricher` has a four-arg constructor (adds `windowLeadHours` and
>   `windowTailHours`). Tests construct it via reflection; the P0 plan's test scaffolding
>   should follow the same pattern.
> - `GET /api/tournament` emits a weak ETag and supports `If-None-Match`; the webcast
>   fields this plan adds are included inside that ETag naturally because the controller
>   is `@Transactional(readOnly = true)` and the version source is `MAX(updated_at)` over
>   `RB_TOURNAMENT` — writes by either FRC or TBA bump `updated_at` and the ETag changes.
> - `tournament-streams-page.tsx` relative-time display goes through
>   `minutesAgo()` from the skew-tolerance module instead of raw `Date.now()`. No
>   action needed by this plan; the staleness banner rendering already uses the helper.
> - "Server computes staleness booleans, client displays them" is the canonical
>   pattern — `webcastsStale` (this plan) is the exemplar. Continue this posture for any
>   new staleness indicator added in subsequent phases.
> - Flyway migrations: V34 landed with this refinement. Any new migration in subsequent
>   P-level phases should be V35 or later.

**Target repos:** `RavenBrain` (primary — new `tbaapi` package, migrations, sync service) and `RavenEye` (minimal UI change — admin-page source indicator + staleness banner). All file paths in this plan are monorepo-relative, prefixed with `RavenBrain/` or `RavenEye/`.

## Overview

Introduce a dedicated TBA (The Blue Alliance) data layer in RavenBrain that mirrors the existing `frcapi` package pattern. Sync tournament webcasts from TBA into a dedicated `RB_TBA_EVENT` table, rename the existing `RB_TOURNAMENT.webcasts` column to `manual_webcasts` so it is unambiguously admin-owned, stop the existing FRC sync from writing webcasts, and surface the union of TBA + manual webcasts through the existing `GET /api/tournament` endpoint. Manual entries are override-only — admins use them exclusively when a TBA-provided stream is wrong or missing. This scaffolding is the reusable plumbing for P1's Statbotics integration.

## Problem Frame

Team 1310's strat team juggles RavenEye, thebluealliance.com, and statbotics.io during tournaments. Step one toward consolidation is cheap and high-value: let webcasts flow into RavenEye from TBA so admins stop hand-entering them for every event. P0 also fixes a latent issue that surfaced during planning: today's FRC sync silently overwrites `RB_TOURNAMENT.webcasts` with whatever the FRC API returns, making the column neither reliably admin-owned nor reliably auto-populated. P0 clarifies ownership: TBA is the auto-source (via `RB_TBA_EVENT`), manual entries are the override layer (via renamed `RB_TOURNAMENT.manual_webcasts`), FRC is no longer a webcast writer. No UI redesign, no EPA math, no match-level data.

See origin: [RavenEye/docs/brainstorms/2026-04-17-team-capability-rankings-requirements.md](../brainstorms/2026-04-17-team-capability-rankings-requirements.md).

## Requirements Trace

- **R1** — Dedicated `RB_TBA_*` tables (`RB_TBA_RESPONSES`, `RB_TBA_EVENT`) separate from existing schema. [Unit 1, Unit 3]
- **R2** — TBA API client mirroring `FrcCachingClient` (caching, auth, error handling). [Unit 2]
- **R3** — Event-level sync only; match/team sync deferred to later phases. [Unit 4]
- **R4** — Read path presents the union of TBA webcasts and admin-owned manual webcasts, canonicalize-deduplicated so exact duplicates collapse to one entry. `RB_TOURNAMENT.manual_webcasts` (renamed from `webcasts` in V30) is admin-owned; `RB_TBA_EVENT.webcasts_json` is TBA-owned; FRC is no longer a webcast writer. No cross-table self-healing prune; admins own the override layer outright. [Unit 1, Unit 4, Unit 5]
- **R5** — Existing admin UI for manual webcasts retained (operates on the renamed `manual_webcasts` column); source indicator (`From TBA` vs `Manual override`) added; admin can set `tba_event_key` per tournament. [Unit 6, Unit 7]
- **R5a** — Last-known-good cached TBA webcasts served when TBA is unreachable; staleness indicator surfaced to UI. [Unit 4, Unit 5, Unit 6]

## Scope Boundaries

- No TBA match data, team data, team media, awards, districts, or event insights beyond the event record (webcasts subset). The full event payload is cached for debuggability but only `webcasts` is projected into `RB_TBA_EVENT` in P0.
- No Statbotics integration — the package pattern established here is the template P1 will follow, but no Statbotics client or tables are built in P0.
- No changes to the team-schedule page, team-summary page, or Tournament Teams card — those are P1/P2/P3 deliverables.
- No computation of per-phase metrics or EPA; Statbotics remains the source of truth for quantitative signals (re-stated here because it influences what the `RB_TBA_EVENT` schema deliberately does not hold).
- Suppressing individual TBA webcasts is out of scope — admins cannot hide a specific URL that TBA serves. If a TBA URL is broken, admins can add a working URL alongside via the manual-override layer; both will render, but at least one will work. Per-URL suppression is future work if it becomes a real pain point.

### Deferred to Separate Tasks

- **iframe / embed-only webcast types** — TBA supports `iframe`, `html5`, `rtmp`, `dacast`, `ustream`, `justin`, `stemtv`, `mms`. In P0 we expose only `youtube`, `twitch`, `livestream`, and `direct_link` (the four that reliably produce `https://` URLs the existing `safeHref()` validator will accept). Other types are logged and dropped. Expanding coverage is future work once the strat team reports a concrete missing stream.
- **Day-filtered webcasts** — TBA's `Webcast.date` field lets a stream apply to a single competition day. P0 treats all webcasts as "for this event", ignoring `date`. Day-filtering is future work.
- **TBA regression alerting** — detecting when a previously-synced webcast URL changes (see origin Future Work section). Out of scope.

## Context & Research

### Relevant Code and Patterns

All following paths are in the **RavenBrain** repo unless stated otherwise.

- `src/main/java/ca/team1310/ravenbrain/frcapi/fetch/FrcCachingClient.java` — caching HTTP client using `RB_FRC_RESPONSES`, `If-Modified-Since` conditional requests, TTL from `raven-eye.frc-api.ttl-seconds`. The TBA client mirrors this with two additions: (a) send `X-TBA-Auth-Key` header instead of Basic auth, (b) also persist and send `ETag` / `If-None-Match` since TBA documents ETag support explicitly.
- `src/main/java/ca/team1310/ravenbrain/frcapi/fetch/FrcRawResponse.java` + `FrcRawResponseRepo.java` — record entity + JDBC repo for `RB_FRC_RESPONSES`. `RB_TBA_RESPONSES` mirrors this shape with one extra `etag` column.
- `src/main/java/ca/team1310/ravenbrain/frcapi/service/FrcClientService.java` — singleton that wraps the caching client with JSON parsing (ObjectMapper) + `ServiceResponse<T>` wrapper record carrying `(responseId, payload)`. `TbaClientService` follows the same contract.
- `src/main/java/ca/team1310/ravenbrain/frcapi/service/EventSyncService.java` — `@Scheduled` orchestration: `cron = "0 22 * * 1"` for weekly event refresh, `fixedDelay = "3m"` for match sync, `fixedDelay = "30s"` for planned matches. TBA's equivalent uses a single hourly `fixedDelay = "1h"` for event-level webcasts because webcasts change infrequently. Active-tournament day can optionally run the same sync on a faster cadence — deferred to implementation decision.
- `src/main/java/ca/team1310/ravenbrain/frcapi/service/FrcSyncApi.java` — `/api/frc-sync` trigger endpoint for superusers. `TbaSyncApi` mirrors this at `/api/tba-sync` for manual refresh during tournament day.
- `src/main/java/ca/team1310/ravenbrain/tournament/TournamentApi.java` — `GET /api/tournament` returns `List<TournamentRecord>` with the existing `webcasts` JSON-array-string field. Webcast CRUD lives at `PUT /{id}/webcast` and `DELETE /{id}/webcast`. Read-time merge lands in the service layer behind this controller; the controller signature is unchanged.
- `src/main/java/ca/team1310/ravenbrain/tournament/TournamentRecord.java` — current fields (id, code, season, name, startTime, endTime, weekNumber, webcasts). New fields added in Unit 5: `tbaEventKey`, `webcastsFromTba`, `webcastsLastSync`, `webcastsStale`.
- `src/main/resources/db/migration/V21__tournament_webcasts.sql` — added `webcasts TEXT NULL` to `RB_TOURNAMENT`.
- `src/main/resources/db/migration/V2__ravenbrain_frc_responses.sql` — reference shape for `RB_TBA_RESPONSES`.
- `src/main/resources/application.yml` lines ~49–52 — config pattern for `raven-eye.frc-api.user` / `key` / `ttl-seconds` backed by env vars. TBA config follows the same shape.
- Latest migration is `V29__purge_corrupt_telemetry.sql`; P0 uses `V30`–`V32`. **Verify this is still the latest at implementation time** — if other work has landed intervening migrations, renumber accordingly.
- **RavenEye** — `RavenEye/app/routes/admin/tournament-streams-page.tsx` is the admin UI that adds/removes webcast URLs. `RavenEye/app/common/storage/rb.ts` has `addTournamentWebcast()` / `removeTournamentWebcast()`. `parseWebcasts()` + `safeHref()` helpers parse the JSON array and guard URL rendering. No schema change to the wire format for `webcasts` — additional fields are additive.

### Institutional Learnings

No entries in `docs/solutions/` (directory does not exist yet). No past solutions to cite.

### External References

- [TBA APIv3 official docs](https://www.thebluealliance.com/apidocs/v3) — base URL `https://www.thebluealliance.com/api/v3`, auth via `X-TBA-Auth-Key` header (preferred over query string for edge cache hit rates per TBA's 2017 "Efficient Querying" post).
- [Tech Talk: Efficiently Querying the TBA API (2017)](https://blog.thebluealliance.com/2017/11/10/tech-talk-efficiently-querying-the-tba-api/) — canonical TBA caching guidance: store ETag + Last-Modified per URL, send both on subsequent requests, honour `Cache-Control: max-age=61`, send `Accept-Encoding: gzip`.
- [TBA Webcast model (tba-api-client-python docs)](https://github.com/TBA-API/tba-api-client-python/blob/master/docs/Webcast.md) — webcast object shape: `{type, channel, date?, file?}`. `type` enum values: `youtube`, `twitch`, `ustream`, `iframe`, `html5`, `rtmp`, `livestream`, `direct_link`, `mms`, `justin`, `stemtv`, `dacast`.
- [TBA Event model (tba-api-client-python docs)](https://github.com/TBA-API/tba-api-client-python/blob/master/docs/Event.md) — `webcasts` field only exists on the full event response, not `/simple`. Event key format: `yyyy[EVENT_CODE]`, e.g. `2026onto`, `2026oncmp1`.
- **Rate limits**: TBA explicitly states no rate limit is in force, but recommends one backend syncing for a client fleet (matches RavenBrain's architecture). No `X-RateLimit-*` headers.
- **Terms**: API keys must not be shared or published. No formal attribution clause surfaced in public docs; community convention is a "Data from The Blue Alliance" footer. Re-verify on the apidocs page before launch.

### URL Reconstruction Decisions (from research)

TBA returns webcast `type` + `channel`, not ready-to-use URLs. RavenBrain reconstructs to `https://` strings so the existing `safeHref()` validator in RavenEye accepts them without changes:

- `youtube` → `https://www.youtube.com/watch?v={channel}`
- `twitch` → `https://www.twitch.tv/{channel}`
- `livestream` → `https://livestream.com/accounts/{channel}`
- `direct_link` → `{channel}` (already a URL)
- Any other type → logged, not exposed to UI (see "Deferred to Separate Tasks")

## Key Technical Decisions

- **Dedicated `tbaapi` package mirroring `frcapi/{fetch,service,model}`** — confirmed from origin doc's Key Decisions. Package structure is a first-class deliverable. Caveat on scaffolding claim: Statbotics (P1's likely consumer) appears to be keyless per its public docs at `statbotics.io/docs/rest`, so the auth/cached-body machinery from this layer will only be partially reused by P1. The directory layout and `{fetch, service, model}` separation are still worth establishing; do not over-justify the investment here on reuse hopes.
- **`RB_TBA_RESPONSES` as a peer of `RB_FRC_RESPONSES`** — same shape plus one `etag VARCHAR(127) NULL` column. Keeping response caches per source makes provenance obvious and allows different TTL/header strategies per API.
- **`RB_TBA_EVENT` keyed by TBA event key (string PK), not by `RB_TOURNAMENT.id`** — decouples TBA caching from our internal tournament IDs. If a tournament's `tba_event_key` is ever re-mapped or cleared, the cached TBA data stays valid and may be re-linked later without reingesting.
- **New nullable `tba_event_key` column on `RB_TOURNAMENT`** — **auto-derived on FRC sync** using the convention `tba_event_key = year + event.code().toLowerCase()` (e.g., FRC code `ONTO` in 2026 → `2026onto`). This is the canonical TBA format and holds for the ~90% of events where TBA and FRC share an event code. When the convention fails (district championships with divisions, odd edge cases), TBA returns 404 on sync, `webcastsStale = true` surfaces in the UI, and the admin corrects the key via Unit 7's endpoint. Admin-entered keys are never overwritten by auto-derivation on subsequent syncs. NULL remains a valid "skip TBA sync" state for tournaments that predate this change and have not yet been synced.
- **Rename `RB_TOURNAMENT.webcasts` to `manual_webcasts` in V30** — the existing column name is misleading: it has been mixed-source (FRC + admin) because `EventSyncService.saveEvents()` overwrites it on every weekly cron. The rename makes ownership explicit and forces the FRC write removal below.
- **Stop `EventSyncService.saveEvents()` from writing webcasts** — part of Unit 1. The method still creates/updates every other tournament field; it simply omits `webcasts`. After V30, the renamed `manual_webcasts` column is only written via the existing `PUT/DELETE /api/tournament/{id}/webcast` endpoints and is admin-owned end-to-end.
- **Manual entries are override-only** — admins add to `manual_webcasts` exclusively when a TBA-provided stream is wrong, missing, or needs supplementing. The default-state experience is "TBA populates, admin does nothing." Explicit "suppress this TBA URL" is not in scope; if a TBA URL is broken, admin can wait for TBA to fix it, or add a working URL alongside (both will show, but at least one is clickable). A future enhancement can add per-URL suppression if it becomes a real pain point.
- **Read-time merge: union + canonicalize-dedup** — `webcasts = distinct(canonicalize(manual_webcasts) ∪ canonicalize(tba_webcasts))`. One `WebcastUrlReconstructor.canonicalize()` helper (Unit 3) is the only URL-normalization logic anywhere. No cross-table pruning, no self-healing writes to `RB_TOURNAMENT`. TBA sync is a pure writer to `RB_TBA_EVENT`; admin CRUD is a pure writer to `RB_TOURNAMENT.manual_webcasts`. No race between the two.
- **API response shape: additive, not breaking** — `webcasts` continues to be a merged URL array in the response (computed server-side). Add sibling fields `webcastsFromTba` (typed `List<String>`), `webcastsLastSync`, `webcastsStale`. Existing RavenEye parse logic is unchanged. The renamed DB column is a server-internal concern — the wire contract stays stable.
- **Staleness threshold: 1.5× sync cadence (90 minutes given a 1-hour `fixedDelay`), OR last sync attempt failed, OR no `RB_TBA_EVENT` row exists while `tba_event_key` is set** — surfaces as `webcastsStale: true`. A 15-minute threshold over a 1-hour cadence would flip stale to true for 45 minutes out of every 60 during healthy operation, desensitizing admins to the signal. The invariant `threshold >= 1.5 × cadence` must hold if either value is tuned later. Configurable via `raven-eye.tba-api.stale-threshold-minutes` (default 90); a package-private constant is an acceptable alternative if the implementer judges the config knob unnecessary.
- **ETag in addition to `Last-Modified`** — TBA documents both. `FrcCachingClient` uses `Last-Modified` only; the TBA client adds ETag support because TBA explicitly recommends it. This is a small divergence from the frcapi pattern that's worth the bandwidth savings and aligns with TBA's published guidance.
- **Sync cadence: `@Scheduled(fixedDelay = "1h")` for event-level webcasts** — webcasts change rarely. A superuser trigger endpoint (`POST /api/tba-sync`) provides the fast path for tournament-day updates. Match the frcapi pattern of exposing a force-sync endpoint.
- **No FK between `RB_TOURNAMENT.tba_event_key` and `RB_TBA_EVENT.event_key`** — keeps the columns loosely coupled. A mismatch is logged but does not crash sync. A tournament can exist without a TBA key, and an `RB_TBA_EVENT` row can exist before a tournament is linked (useful for pre-sync during setup).

## Open Questions

### Resolved During Planning

- **`RB_TBA_*` schema shape** — Resolved. `RB_TBA_EVENT` (event_key PK, webcasts_json TEXT, raw_event_json LONGTEXT for debuggability, last_sync TIMESTAMP, last_status INT) + `RB_TBA_RESPONSES` (mirror of `RB_FRC_RESPONSES` plus `etag` column). See Unit 1.
- **Tournament-to-TBA mapping** — Resolved. Nullable `tba_event_key` column on `RB_TOURNAMENT`, manually populated by admin, NULL means skip.
- **TBA API v3 specifics** — Resolved via research. Base URL `https://www.thebluealliance.com/api/v3`, header auth, ETag + Last-Modified support, no rate limit, event key format `yyyy[EVENT_CODE]`, webcasts only on full event response.
- **Where manual webcasts live post-P0** — Resolved (revised during deepening). The existing `RB_TOURNAMENT.webcasts` column is renamed to `manual_webcasts` in V30 and FRC's `EventSyncService.saveEvents()` is modified to stop writing to it. Ownership becomes unambiguous: admin-only for `manual_webcasts`, TBA-only for `RB_TBA_EVENT.webcasts_json`. Read-time merge unions them with canonicalize-dedup. No cross-table writes; no self-healing prune.
- **Webcast URL reconstruction** — Resolved. Only four types (`youtube`, `twitch`, `livestream`, `direct_link`) are reconstructed in P0; others logged and dropped.

### Deferred to Implementation

- **Micronaut `@Client` vs. raw `java.net.http.HttpClient`** — The existing `FrcClient` uses raw `java.net.http.HttpClient`. Default to the same for consistency, but the implementer may switch to Micronaut `@Client` if it simplifies the caching layer without changing observable behavior.
- **Whether to sync only "active" tournaments** — origin doc says "RavenBrain syncs from FRC API" for tournaments RavenEye tracks. Implementation may choose to sync all tournaments with non-NULL `tba_event_key`, or only ones within an active-season window. Small optimization; defer.
- **Exact test-double strategy for the TBA client** — depends on how `FrcCachingClientTest` (and peers) are structured today. The plan requires "mirror the existing frcapi test pattern" and leaves the mechanism (WireMock, stub server, Testcontainers) to the implementer.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

### Component interaction (TBA sync + read path)

```
┌────────────────────────┐   1h fixedDelay    ┌────────────────────────┐
│ TbaEventSyncService    │───────────────────▶│ TbaClientService       │
│ (@Scheduled)           │                    │ (parses JSON,          │
│                        │                    │  reconstructs URLs,    │
│                        │                    │  canonicalize + dedup) │
└───────────┬────────────┘                    └───────────┬────────────┘
            │                                             │
            │ writes (only)                               │ uses
            ▼                                             ▼
┌────────────────────────┐                    ┌────────────────────────┐
│ RB_TBA_EVENT           │                    │ TbaCachingClient       │
│ (event_key PK,         │                    │ (ETag + If-Mod-Since)  │
│  webcasts_json,        │                    └───────────┬────────────┘
│  last_sync, last_status│                                │ HTTP
└───────────┬────────────┘              ┌──────────────────────────┐
            │ read (only)               │ TBA API v3               │
            │                           │ GET /event/{event_key}   │
            │                           └──────────────────────────┘
            │
            │         ┌──────────────────────┐    admin CRUD (only)
            │         │ RB_TOURNAMENT        │◀──────────────────────┐
            │         │ (manual_webcasts,    │                       │
            │         │  tba_event_key)      │                       │
            │         └──────────┬───────────┘                       │
            │ read               │ read                              │
            ▼                    ▼                                   │
┌────────────────────────────────────────┐     ┌──────────────────────────┐
│ TournamentService (LEFT JOIN read)     │────▶│ GET /api/tournament:     │
│ merge = distinct(canonicalize(manual)  │     │  webcasts (merged URLs), │
│         ∪ canonicalize(tba_webcasts))  │     │  webcastsFromTba,        │
│                                        │     │  webcastsLastSync,       │
│ No writes from this path.              │     │  webcastsStale           │
└────────────────────────────────────────┘     └──────────────┬───────────┘
                                                              │
                                                              ▼
                                              ┌──────────────────────────┐
                                              │ RavenEye admin UI        │
                                              │ PUT/DELETE /webcast ─────┘
                                              │ (From TBA / Manual       │
                                              │  badge + staleness)      │
                                              └──────────────────────────┘
```

Note the clean ownership: `TbaEventSyncService` only writes `RB_TBA_EVENT`; admin CRUD only writes `RB_TOURNAMENT.manual_webcasts`. The read path is the only place the two sources meet. There is no shared write surface and no race to mitigate.

### Read-time merge decision matrix

| `tba_event_key` | TBA sync status                    | Manual webcasts | `webcasts` (merged, canonicalized, deduped) | `webcastsFromTba`   | `webcastsStale` |
| --------------- | ---------------------------------- | --------------- | ------------------------------------------- | ------------------- | --------------- |
| NULL            | N/A                                | empty           | `[]`                                        | `[]`                | false           |
| NULL            | N/A                                | non-empty       | manual list                                 | `[]`                | false           |
| set             | fresh (< threshold) and 200        | empty           | TBA list                                    | TBA list            | false           |
| set             | fresh and 200                      | non-empty       | manual ∪ TBA                                | TBA list            | false           |
| set             | stale (> threshold) or last ≠ 200  | empty           | last-known TBA                              | last-known TBA      | true            |
| set             | stale or last ≠ 200                | non-empty       | manual ∪ last-known TBA                     | last-known TBA      | true            |
| set             | `RB_TBA_EVENT` row missing         | any             | manual only                                 | `[]`                | true            |

### Canonical URL dedup (used by both sync-side persistence and read-time merge)

```
canonicalize(url):
  u = url.trim()
  parsed = parse(u)
  return buildUrl(
    scheme  = parsed.scheme.toLowerCase(),
    host    = parsed.host.toLowerCase(),
    port    = isDefault(parsed.port) ? null : parsed.port,
    path    = stripTrailingSlash(parsed.path),
    query   = parsed.query                   # preserved exactly
  )

mergeWebcasts(manualUrls, tbaUrls):
  return distinct(
    canonicalize(x) for x in manualUrls,
    canonicalize(x) for x in tbaUrls
  )                                          # first-seen order preserved
```

This replaces the earlier self-healing de-dup pseudo-code. No sync-side writes to `RB_TOURNAMENT` are needed because ownership is now clean.

## Implementation Units

- [ ] **Unit 1: Schema migrations + remove FRC webcast writes**

**Goal:** Introduce the three schema changes that anchor the TBA data layer and the tournament mapping, rename `RB_TOURNAMENT.webcasts` to `manual_webcasts` so ownership is explicit, and stop `EventSyncService.saveEvents()` from silently overwriting that column on every weekly cron.

**Requirements:** R1, R3, R4 (column-ownership cleanup).

**Dependencies:** None.

**Files:**
- Create: `RavenBrain/src/main/resources/db/migration/V30__tournament_tba_and_manual_webcasts.sql`
- Create: `RavenBrain/src/main/resources/db/migration/V31__tba_responses.sql`
- Create: `RavenBrain/src/main/resources/db/migration/V32__tba_event.sql`
- Modify: `RavenBrain/src/main/java/ca/team1310/ravenbrain/frcapi/service/EventSyncService.java` — in `saveEvents()` (lines ~207-238): (a) drop the construction of the `webcasts` JSON string and pass `null` (or omit the argument) when building `TournamentRecord`; (b) auto-derive `tbaEventKey = year + event.code().toLowerCase()` and pass it into the `TournamentRecord` constructor on insert. On update, only set `tba_event_key` if the existing column is NULL — preserves any admin-entered correction from Unit 7. The FRC sync retains responsibility for every other field on the row.
- Modify: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tournament/TournamentRecord.java` — rename the `webcasts` field to `manualWebcasts`, update the `@MappedProperty` / column name to `manual_webcasts`.
- Modify: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tournament/TournamentApi.java` — the existing `addWebcast` / `removeWebcast` handlers read/write `tournament.webcasts()`; update them to read/write `manualWebcasts()`. The HTTP endpoint paths (`PUT /{id}/webcast`, `DELETE /{id}/webcast`) stay the same so RavenEye is unaffected. **Also add explicit method-level `@Secured({"ROLE_SUPERUSER", "ROLE_ADMIN"})` to both handlers** — today they inherit the class-level `@Secured(IS_AUTHENTICATED)`, which incorrectly grants webcast-edit rights to every authenticated role (MEMBER, DATASCOUT, EXPERTSCOUT, DRIVE_TEAM). This closes a pre-existing authorization gap while we are already in the file.
- Modify: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tournament/TournamentService.java` — any query referencing `webcasts` column is updated to `manual_webcasts`.
- Test: `RavenBrain/src/test/java/ca/team1310/ravenbrain/tournament/TournamentApiTest.java` (extend) to cover the renamed-column CRUD path.
- Test: `RavenBrain/src/test/java/ca/team1310/ravenbrain/frcapi/service/EventSyncServiceTest.java` (extend) to assert that `saveEvents()` (a) does not modify `manual_webcasts` even when the FRC response includes webcasts, (b) auto-sets `tba_event_key` to `{year}{code.toLowerCase()}` on insert, (c) preserves admin-edited `tba_event_key` on subsequent updates.

**Approach:**
- V30 does two things: (a) `ALTER TABLE RB_TOURNAMENT RENAME COLUMN webcasts TO manual_webcasts;`, (b) `ALTER TABLE RB_TOURNAMENT ADD COLUMN tba_event_key VARCHAR(31) NULL;`. Pre-existing data in the old `webcasts` column is preserved under the new name — since we cannot retroactively determine source, existing entries are treated as "manual" going forward. Any duplicates that surface on first TBA sync collapse via canonicalize-dedup at read time; admins can remove incorrect legacy entries through the existing UI.
- V31 creates `RB_TBA_RESPONSES` mirroring `RB_FRC_RESPONSES` exactly (so Micronaut Data records using primitive `boolean processed`, `int statuscode` don't blow up on NULL reads), plus one nullable `etag` column: `id BIGINT AUTO_INCREMENT PRIMARY KEY, lastcheck TIMESTAMP(3) NOT NULL, lastmodified TIMESTAMP(3) NOT NULL, etag VARCHAR(127) NULL, processed BIT NOT NULL, statuscode INT NOT NULL, url VARCHAR(255) NOT NULL, body LONGTEXT NULL`.
- V32 creates `RB_TBA_EVENT` with columns `event_key VARCHAR(31) PK, webcasts_json TEXT NULL, raw_event_json LONGTEXT NULL, last_sync TIMESTAMP(3) NULL, last_status INT NULL`. `event_key` is the PK so upserts are trivial.
- No FK from `RB_TOURNAMENT.tba_event_key` to `RB_TBA_EVENT.event_key` (see Key Decisions).
- The FRC-write removal and the column rename land together because the rename alone is insufficient — if V30 renames but FRC still writes to the new column, admin overrides continue to be overwritten. Both halves of the fix are needed; splitting across units risks shipping half of it.

**Patterns to follow:**
- Mirror `V2__ravenbrain_frc_responses.sql` for `RB_TBA_RESPONSES`.
- MySQL 8.x supports `ALTER TABLE ... RENAME COLUMN`; no data copy or downtime concern at tournament scale.

**Test scenarios:**
- Happy path: Flyway migrates from a V29 baseline to V32 without error; all three tables exist; `RB_TOURNAMENT.manual_webcasts` contains what `RB_TOURNAMENT.webcasts` used to contain.
- Happy path: after V30, `GET /api/tournament` continues to return tournaments with the same on-the-wire `webcasts` field (service layer computes it from `manual_webcasts` plus empty TBA list).
- Integration scenario: stub FRC API to return an event with webcasts populated, run `EventSyncService.saveEvents()`, assert `RB_TOURNAMENT.manual_webcasts` is unchanged.
- Integration scenario: admin PUT `/api/tournament/{id}/webcast` adds a URL; subsequent FRC sync does not overwrite it.
- Integration scenario: stub FRC returns event `{year: 2026, code: "ONTO"}` on first sync; after `saveEvents()`, `RB_TOURNAMENT.tba_event_key = "2026onto"`.
- Integration scenario (security): `PUT /api/tournament/{id}/webcast` and `DELETE /api/tournament/{id}/webcast` called as MEMBER / DATASCOUT / EXPERTSCOUT / DRIVE_TEAM → 403; ADMIN / SUPERUSER → 200.
- Integration scenario: admin corrects `tba_event_key` to `"2026onsci"` (a divergent divisional key); subsequent FRC sync for the same tournament leaves `tba_event_key` as `"2026onsci"` rather than resetting to the auto-derived value.
- Edge case: `RB_TOURNAMENT.tba_event_key` allows NULL and does not break existing tournament reads.
- Edge case: inserting an `RB_TBA_EVENT` row with NULL `webcasts_json` and NULL `last_sync` succeeds (represents the "row created but no successful sync yet" state).

**Verification:**
- `./gradlew test` passes, including the two new assertions in `EventSyncServiceTest` and `TournamentApiTest`.
- Grep confirms no remaining `tournament.webcasts()` or `webcasts` column references outside the read-time merge (Unit 5).

---

- [ ] **Unit 2: TBA HTTP client with caching (`tbaapi.fetch`)**

**Goal:** Build the TBA caching HTTP client, persistent response cache, and configuration wiring.

**Requirements:** R2, R5a.

**Dependencies:** Unit 1 (needs `RB_TBA_RESPONSES`).

**Files:**
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/fetch/TbaClient.java`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/fetch/TbaCachingClient.java`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/fetch/TbaRawResponse.java`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/fetch/TbaRawResponseRepo.java`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/fetch/TbaClientException.java`
- Modify: `RavenBrain/src/main/resources/application.yml` — a partial `raven-eye.tba-api` block already exists (`key: ${TBA_KEY:tba_api_key}`, `ttl-seconds: 59`). Reconcile: (a) keep the existing `key` line; (b) adjust `ttl-seconds` to `61` to match TBA's `Cache-Control: max-age=61` guidance; (c) add `base-url: ${TBA_BASE_URL:https://www.thebluealliance.com/api/v3}` and `stale-threshold-minutes` (see Key Decisions for the resolved value).
- Modify: `RavenBrain/.env.example` — add `TBA_KEY` placeholder.
- Test: `RavenBrain/src/test/java/ca/team1310/ravenbrain/tbaapi/fetch/TbaCachingClientTest.java`

**Approach:**
- `TbaClient` is a thin wrapper over `java.net.http.HttpClient`, constructing `GET` requests with `X-TBA-Auth-Key`, `Accept-Encoding: gzip`, and conditional headers when the caller provides them. The event-key path segment must be `URLEncoder.encode(eventKey, UTF_8)`'d before concatenation to prevent injection through the admin-supplied key (see Unit 7 validation).
- `TbaCachingClient` persists `url + body + statuscode + lastmodified + etag` in `RB_TBA_RESPONSES`. On each fetch: if cached and within TTL, return cached body; if cached and past TTL, issue a conditional request with both `If-None-Match: <etag>` and `If-Modified-Since: <lastmodified>` (per TBA's documented guidance); on 304, update `lastcheck` only; on 200, diff the body and mark `processed = false` only if changed.
- **304 safety rules** (explicit to avoid stale-cache corruption): (a) on 304, if `RB_TBA_RESPONSES.body` is NULL for the matched row, treat as a miss and re-request unconditionally; (b) only send conditional headers that were received together on the same 200 response — never mix an `etag` from one response with a `lastmodified` from another; (c) when only one of the two conditional headers is available, send only that one; (d) on 200, overwrite `body`, `etag`, `lastmodified`, and `statuscode` in the same `UPDATE` so the tuple stays coherent.
- **Startup logging must mask the key**: log only "TBA API key: configured" or "TBA API key: NOT configured" — never the key value, prefix, or length.
- `TbaRawResponse` and `TbaRawResponseRepo` mirror `FrcRawResponse` / `FrcRawResponseRepo` with the added `etag` field.
- Config keys: `TBA_KEY` env var → `raven-eye.tba-api.key` (no default, missing key disables sync with a startup log line). `TBA_BASE_URL` → `raven-eye.tba-api.base-url` (default `https://www.thebluealliance.com/api/v3`). `ttl-seconds` default 61 (matches TBA's `Cache-Control`).

**Patterns to follow:**
- `RavenBrain/src/main/java/ca/team1310/ravenbrain/frcapi/fetch/FrcCachingClient.java` — whole class structure, cache-hit/miss flow.
- `RavenBrain/src/main/java/ca/team1310/ravenbrain/frcapi/fetch/FrcClient.java` — HTTP construction, `HttpClient` reuse, error-wrapping into a typed exception.
- Test-pattern parity with whichever test class exists today for `FrcCachingClient` (implementation identifies this).

**Test scenarios:**
- Happy path: first fetch of a new URL stores the response in `RB_TBA_RESPONSES` and returns the body.
- Happy path: cached within TTL → returns cached body without an outbound HTTP call.
- Happy path: cached past TTL, server returns 304 → `lastcheck` updated, body reused.
- Happy path: cached past TTL, server returns 200 with different body → body replaced, `processed` reset to false.
- Happy path: `ETag` is stored and sent back as `If-None-Match` on the next conditional request.
- Edge case: TBA config missing (`raven-eye.tba-api.key` unset) → client refuses to construct requests and surfaces a clear error (so the sync service can log and skip).
- Error path: TBA returns 401 → `TbaClientException` thrown, cached response untouched.
- Error path: TBA returns 500 / times out → `TbaClientException` thrown, cached response untouched, `lastcheck` not updated on failure.
- Edge case: response body size > 1MB (unlikely but possible) stores intact in `LONGTEXT`.

**Verification:**
- `./gradlew test --tests "ca.team1310.ravenbrain.tbaapi.fetch.*"` passes.
- Log output on startup shows the base URL and whether the auth key is configured.

---

- [ ] **Unit 3: TBA service layer (`tbaapi.service` + `tbaapi.model`)**

**Goal:** Model TBA responses and expose a typed service API (`TbaClientService`) that reconstructs webcast URLs.

**Requirements:** R2, R4 (partially — URL reconstruction feeds the merge).

**Dependencies:** Unit 2.

**Files:**
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/model/TbaEvent.java`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/model/TbaWebcast.java`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/service/TbaClientService.java`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/service/WebcastUrlReconstructor.java`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/service/TbaClientServiceException.java`
- Test: `RavenBrain/src/test/java/ca/team1310/ravenbrain/tbaapi/service/TbaClientServiceTest.java`
- Test: `RavenBrain/src/test/java/ca/team1310/ravenbrain/tbaapi/service/WebcastUrlReconstructorTest.java`

**Approach:**
- `TbaEvent` and `TbaWebcast` are Java records matching the TBA JSON schema fields we actually consume (`key`, `name`, `year`, `event_code`, `webcasts[{type, channel, date?, file?}]`). Ignore unknown fields via Micronaut Serde.
- `WebcastUrlReconstructor` is a pure function (static method or singleton). Input: `TbaWebcast`. Output: `Optional<String>` URL. Only four types reconstruct; others return `Optional.empty()` and log a debug message with the type and channel for future visibility. It also exposes a `canonicalize(String url)` helper used by BOTH sync-time de-dup (Unit 4) AND read-time merge (Unit 5): lowercase scheme and host, strip default ports, strip trailing slash on path, preserve query exactly. This single function is the only normalization rule anywhere in the system.
- After reconstruction, `TbaClientService` (or its caller) runs `distinct()` on the canonicalized URL list to drop intra-payload duplicates (TBA sometimes returns the same channel twice with different `date` values; we dropped `date` per scope, so the duplicates must collapse).
- `TbaClientService` singleton wraps `TbaCachingClient` + ObjectMapper, returning a `ServiceResponse<TbaEvent>`-style record. Provides `getEvent(String eventKey)` for P0. `ServiceResponse` carries `(responseId, lastModified, etag, payload)` so downstream code knows which cache row backs the response (enabling "mark processed" semantics later).

**Patterns to follow:**
- `RavenBrain/src/main/java/ca/team1310/ravenbrain/frcapi/service/FrcClientService.java` — service contract and `ServiceResponse<T>` shape.
- `RavenBrain/src/main/java/ca/team1310/ravenbrain/frcapi/model/Event.java` — record style for API model.

**Test scenarios:**
- Happy path (`WebcastUrlReconstructor`): `{type=youtube, channel=abc123}` → `https://www.youtube.com/watch?v=abc123`.
- Happy path: `{type=twitch, channel=firstinspires}` → `https://www.twitch.tv/firstinspires`.
- Happy path: `{type=livestream, channel=12345}` → `https://livestream.com/accounts/12345`.
- Happy path: `{type=direct_link, channel=https://example.com/stream}` → `https://example.com/stream`.
- Edge case: unsupported types (`iframe`, `html5`, `rtmp`, `dacast`, `ustream`, `justin`, `stemtv`, `mms`) → `Optional.empty()`, one debug log line per invocation.
- Edge case: null or empty `channel` → `Optional.empty()`.
- Happy path (`TbaClientService`): parses a canned TBA event JSON fixture into `TbaEvent`, producing the expected webcast list.
- Edge case: TBA response missing the `webcasts` field or containing an empty array → `TbaEvent.webcasts()` is empty, no reconstruction errors.
- Integration scenario: `TbaClientService.getEvent(...)` → `TbaCachingClient.fetch(...)` is called with `GET /event/{key}` (not `/simple`, since `/simple` drops webcasts).

**Verification:**
- `./gradlew test --tests "ca.team1310.ravenbrain.tbaapi.service.*"` passes.
- A canned fixture test round-trips a known 2025 event JSON (e.g., `2025oncmp1`) and reconstructs the expected URL set.

---

- [ ] **Unit 4: TBA event sync orchestration + force-sync endpoint**

**Goal:** Run scheduled TBA syncs and persist reconstructed webcasts into `RB_TBA_EVENT`. TBA sync is a pure writer to `RB_TBA_EVENT` only — it never touches `RB_TOURNAMENT`.

**Requirements:** R3, R5a.

**Dependencies:** Unit 3 (uses `TbaClientService`), Unit 1 (writes `RB_TBA_EVENT`, reads `tba_event_key`).

**Files:**
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/service/TbaEventSyncService.java`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/service/TbaSyncApi.java`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/service/TbaEventRecord.java` (record for `RB_TBA_EVENT`)
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/service/TbaEventRepo.java` (JDBC repo for `RB_TBA_EVENT`)
- Test: `RavenBrain/src/test/java/ca/team1310/ravenbrain/tbaapi/service/TbaEventSyncServiceTest.java`
- Test: `RavenBrain/src/test/java/ca/team1310/ravenbrain/tbaapi/service/TbaSyncApiTest.java`

**Approach:**
- `TbaEventSyncService` has `@Scheduled(fixedDelay = "1h")` method `syncAllMappedTournaments()`. Iterates tournaments with non-NULL `tba_event_key`, calls `TbaClientService.getEvent(...)`, upserts into `RB_TBA_EVENT` with the canonicalized/deduplicated reconstructed URL list in `webcasts_json` (see Unit 3's intra-payload dedup) and the raw TBA JSON in `raw_event_json`. On success, also sets `last_sync = now()` and `last_status = 200`.
- On failure (HTTP error or parse failure), update `RB_TBA_EVENT.last_status` with the HTTP code or `-1`, do not touch `webcasts_json`. The previous successful `webcasts_json` is preserved and the read path (Unit 5) serves it with `webcastsStale = true` per R5a.
- `TbaSyncApi` exposes `POST /api/tba-sync` for ROLE_SUPERUSER, triggering `syncAllMappedTournaments()` asynchronously. Mirror `FrcSyncApi.forceSync()` **including its `AtomicBoolean syncInProgress` compareAndSet gate** — return 409 CONFLICT when a sync is already running rather than allowing a double-run.
- `TbaEventRecord` and `TbaEventRepo`: record = `(eventKey, webcastsJson, rawEventJson, lastSync, lastStatus)`; repo provides `findByEventKey`, `findByEventKeyIn`, `upsert`.
- **No writes to `RB_TOURNAMENT`** — ownership is clean: TBA sync owns `RB_TBA_EVENT`, admin CRUD owns `RB_TOURNAMENT.manual_webcasts`, merge happens at read time (Unit 5). There is no race to mitigate because there is no shared write surface.

**Patterns to follow:**
- `RavenBrain/src/main/java/ca/team1310/ravenbrain/frcapi/service/EventSyncService.java` — `@Scheduled` structure, error-capture pattern.
- `RavenBrain/src/main/java/ca/team1310/ravenbrain/frcapi/service/FrcSyncApi.java` — admin force-sync endpoint including the `AtomicBoolean` gate.

**Test scenarios:**
- Happy path: tournament with `tba_event_key = "2026onto"` and empty manual webcasts → sync populates `RB_TBA_EVENT` with the canonicalized reconstructed URL list, `RB_TOURNAMENT.manual_webcasts` is untouched.
- Happy path: tournament with existing admin-added manual webcasts → after sync, `RB_TOURNAMENT.manual_webcasts` is byte-identical to before sync. The sync service is not a writer to that table.
- Happy path: TBA returns the same channel twice with different `date` values → after intra-payload dedup in Unit 3, `RB_TBA_EVENT.webcasts_json` contains the URL once.
- Edge case: tournament has NULL `tba_event_key` → sync skips, no `RB_TBA_EVENT` row created or touched.
- Edge case: TBA returns an event with zero webcasts → `RB_TBA_EVENT.webcasts_json` is the empty-array string `"[]"`, `last_status = 200`.
- Edge case: only unsupported webcast types (`iframe`, `html5`, etc.) in TBA response → `webcasts_json` is `"[]"` (reconstruction drops them), `last_status = 200`.
- Error path: TBA returns 404 for the event key → `RB_TBA_EVENT.last_status = 404`, `webcasts_json` not modified from any prior value, error logged.
- Error path: TBA returns 500 / times out → same behaviour as 404 (status recorded, no data mutation), previous `webcasts_json` preserved for stale serving.
- Error path: TBA_KEY missing at startup → sync service logs a clear "disabled — no key" message on each scheduled tick and no-ops. `POST /api/tba-sync` returns 503 with a body explaining the missing key rather than returning 202.
- Integration scenario: `POST /api/tba-sync` as a non-SUPERUSER → 403. As SUPERUSER with key configured → 202 Accepted (mirror `FrcSyncApi`), triggering a sync that eventually updates `RB_TBA_EVENT`.
- Integration scenario: two back-to-back `POST /api/tba-sync` calls → second returns 409 CONFLICT while first is in progress.
- Integration scenario: running sync twice back-to-back (sequentially) does not create duplicate `RB_TBA_EVENT` rows (upsert works).

**Verification:**
- `./gradlew test --tests "ca.team1310.ravenbrain.tbaapi.service.TbaEventSyncService*"` passes.
- Manual verification with a real TBA key against a known event in staging produces expected `RB_TBA_EVENT` row content AND confirms `RB_TOURNAMENT.manual_webcasts` is unchanged for the same tournament.

---

- [ ] **Unit 5: Tournament read-time merge + API response shape**

**Goal:** Compute the merged webcasts list (manual ∪ TBA, canonicalize-deduplicated) at read time, and surface source + staleness metadata through `GET /api/tournament`. No writes to either source table from this unit.

**Requirements:** R4, R5, R5a.

**Dependencies:** Unit 1 (reads `RB_TOURNAMENT.manual_webcasts` and `RB_TBA_EVENT`), Unit 3 (uses `WebcastUrlReconstructor.canonicalize(...)`), Unit 4 (populates `RB_TBA_EVENT`).

**Files:**
- Modify: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tournament/TournamentRecord.java` — add fields: `tbaEventKey` (String, nullable), `webcasts` (`List<String>`, computed — never null, empty list if neither manual nor TBA has data), `webcastsFromTba` (`List<String>`, never null — empty list when no TBA data; typed rather than JSON-array-string), `webcastsLastSync` (Instant, nullable), `webcastsStale` (boolean). The existing `manualWebcasts` String (JSON-array-string, renamed in Unit 1) remains on the record but is a server-internal detail that need not be exposed on the wire — the `webcasts` field is the computed public representation.
- Modify: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tournament/TournamentService.java` — this class is both the `@JdbcRepository` and the service in this codebase. Load tournaments via a single SQL `LEFT JOIN` against `RB_TBA_EVENT` on `tba_event_key = event_key` in the `findAll`-style queries. Tournament count is tens per query, so the join is simpler than a separate-query merge.
- Modify: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tournament/TournamentApi.java` — the controller now returns `TournamentRecord` instances already enriched by the service layer; the on-the-wire `webcasts` field is the computed merged list.
- Test: `RavenBrain/src/test/java/ca/team1310/ravenbrain/tournament/TournamentServiceTest.java` (extend existing test file if present, otherwise create).

**Approach:**
- Merge rule: `webcasts = distinct(canonicalize(parseWebcasts(manual_webcasts)) ∪ canonicalize(parseWebcasts(RB_TBA_EVENT.webcasts_json)))`. Order: manual URLs first (admin-intentional), TBA URLs appended, `distinct()` preserves first-seen order so a duplicate URL is rendered as manual-sourced. Implementation detail — does not affect the wire contract.
- **Public invariant** on the response: for any URL `u` in `webcasts`, exactly one of these is true: (a) `u ∈ webcastsFromTba` → source is TBA, (b) `u ∉ webcastsFromTba` → source is Manual override. The admin UI (Unit 6) derives the badge from this membership check. The invariant holds because both lists are canonicalized with the same helper (Unit 3), and `webcastsFromTba` is always the canonicalized TBA list regardless of which is served (fresh or stale).
- `webcastsStale = true` when any of: (a) `last_sync` older than stale threshold, (b) `last_status != 200` (last attempt failed), (c) `tba_event_key` is set but no `RB_TBA_EVENT` row exists yet. `false` otherwise. If `tba_event_key` is NULL, `webcastsStale = false` (the tournament simply has no TBA linkage; staleness does not apply).
- Staleness threshold: `raven-eye.tba-api.stale-threshold-minutes` (default 90 — see Key Decisions for the 1.5× cadence rationale).
- If `tba_event_key` is NULL: `webcastsFromTba = []`, `webcastsLastSync = null`, `webcastsStale = false`, `webcasts` = canonicalized manual list only.
- **DELETE semantics for TBA-sourced URLs**: the existing `DELETE /api/tournament/{id}/webcast` endpoint only removes URLs from `RB_TOURNAMENT.manual_webcasts`. If the admin tries to remove a URL that is only present via TBA (not in the manual list), the endpoint returns 200 with no mutation. The admin UI (Unit 6) is responsible for either hiding the Remove button on TBA-only URLs or showing a disabled state with a tooltip.

**Patterns to follow:**
- `RavenBrain/src/main/java/ca/team1310/ravenbrain/tournament/TournamentApi.java` (existing `parseWebcasts()` helper) — JSON-array-string parsing already lives in this package; extend or reuse for parsing both `manual_webcasts` and `RB_TBA_EVENT.webcasts_json`.

**Test scenarios:**
- Happy path: tournament with `tba_event_key` set, fresh TBA row with `[https://twitch.tv/a, https://youtube.com/watch?v=b]`, empty manual → `webcasts = [https://twitch.tv/a, https://youtube.com/watch?v=b]`, `webcastsFromTba` identical, `webcastsStale = false`.
- Happy path: manual `[https://twitch.tv/manual]` + TBA `[https://twitch.tv/a]` (no overlap) → `webcasts = [https://twitch.tv/manual, https://twitch.tv/a]`, `webcastsFromTba = [https://twitch.tv/a]`, `webcastsStale = false`.
- Happy path: manual and TBA both contain `https://twitch.tv/shared` → `webcasts = [https://twitch.tv/shared]` (single entry, first-seen wins = manual), `webcastsFromTba = [https://twitch.tv/shared]`. Per the public invariant, membership lookup says "TBA" — see Unit 6's badge resolution rule below.
- Edge case: canonicalization collapses case/slash variants — manual has `https://Twitch.tv/shared/`, TBA has `https://twitch.tv/shared` → one entry in `webcasts` after canonicalize-dedup.
- Edge case: tournament with NULL `tba_event_key` → `webcasts = [canonicalized manual URLs]`, `webcastsFromTba = []`, `webcastsStale = false`, `webcastsLastSync = null`.
- Edge case: tournament with `tba_event_key` set but no `RB_TBA_EVENT` row (pre-first-sync) → `webcastsStale = true`, `webcasts = [manual URLs]`, `webcastsFromTba = []`.
- Edge case: `RB_TBA_EVENT` row exists, `last_sync` older than threshold → `webcastsStale = true`, last-known TBA list still merged into `webcasts` and echoed in `webcastsFromTba` (R5a: serve stale data with a staleness flag).
- Edge case: `last_status != 200` → `webcastsStale = true`, previous `webcasts_json` still merged.
- Error path: `manual_webcasts` contains malformed JSON → treat as empty list, log warning, do not fail the request.
- Integration scenario: `GET /api/tournament` response JSON round-trips through Micronaut serde, new fields serialize correctly, on-the-wire `webcasts` shape (array of strings) matches the existing contract RavenEye consumes.
- Edge case: both manual and TBA lists are empty → `webcasts = []`, not null.

**Verification:**
- `./gradlew test --tests "ca.team1310.ravenbrain.tournament.*"` passes.
- End-to-end smoke: hit `GET /api/tournament` against a running backend with a TBA key wired in; response includes new fields and existing RavenEye tournament pages continue to render without error.

---

- [ ] **Unit 6: RavenEye UI — source indicator + staleness banner**

**Goal:** Surface source provenance (TBA vs manual) in the admin UI and a staleness banner wherever webcasts render.

**Requirements:** R5, R5a.

**Dependencies:** Unit 5 (UI depends on new API fields).

**Files:**
- Modify: `RavenEye/app/routes/admin/tournament-streams-page.tsx` — render a badge next to each URL using the public invariant: `From TBA` if `url ∈ tournament.webcastsFromTba`, else `Manual override`. When `tournament.webcastsStale`, render a page-level `.banner-info` above the streams list with wording `"Webcast data last synced {relative-time-ago-of-webcastsLastSync} — may be out of date."` (if `webcastsLastSync` is null, render `"Webcast data has not yet synced — the TBA event key may be incorrect."`).
- Modify: `RavenEye/app/types/` (whichever file holds `RBTournament`) — add `tbaEventKey?: string`, `webcastsFromTba?: string[]` (typed array, not JSON-array-string — matches the new backend shape), `webcastsLastSync?: string`, `webcastsStale?: boolean`.
- Modify: `RavenEye/app/assets/css/components.css` — add two new style blocks:
  - `.banner-info` — CB-safe informational banner. Background: `var(--color-info, #33BBEE)` (Tol vibrant cyan) at 15% opacity; left border 4px solid `#33BBEE`; text colour inherits. Precede banner text with an `(i) ` literal prefix so the meaning does not depend on colour. Full-width like `.banner-warning`. Add a `prefers-color-scheme: dark` block that swaps to a dark-mode-compatible tint (e.g., `#55CCEE` at 20% opacity) so the banner stays legible on both themes.
  - `.badge-tba` / `.badge-manual` — two CB-safe pill styles used inline next to each webcast URL. `From TBA` = solid pill, background `#33BBEE` (Tol cyan), white text, no border. `Manual override` = outlined pill, transparent background, `#BBBBBB` (Tol grey) 1px border, default foreground text. Both pills ~4px padding, ~3px border-radius. Text labels are the primary channel — colour + shape are redundant. Add matching dark-mode overrides.
- Modify: `RavenEye/app/routes/admin/tournament-streams-page.tsx` — for TBA-sourced URLs, render the Remove button in a disabled state with tooltip `"Served by TBA — remove by clearing the TBA event key or contacting TBA."`. This prevents the no-op UX where Remove clicks appear to succeed but the URL reappears on next render (the backend DELETE only touches `manual_webcasts`).
- Modify or create (design doc): `RavenEye/docs/admin-tournament-streams.md` (or the matching existing design doc) — per CLAUDE.md standing convention "keep RavenEye/docs/ in sync with code".
- Scope of the banner and badges: the admin tournament-streams page only. If any non-admin page surfaces webcasts today (spot-check `schedule-page.tsx` and any tournament-summary render), surface the staleness banner there too; otherwise P0 keeps it scoped to the admin page.

**Patterns to follow:**
- `RavenEye/app/common/banners/` for any shared banner component (per CLAUDE.md "Notification Banners" section).
- Existing badge/label styles in `RavenEye/app/assets/css/components.css`.
- `parseWebcasts()` + `safeHref()` helpers in the admin page are unchanged.

**Test scenarios:**
<!-- No test runner in RavenEye; scenarios are manual verification checklist items right-sized to this project's conventions. Flagged explicitly because test-scenario specificity here means reproducible manual checks. -->
- Manual happy path: admin opens the page for a tournament with `tba_event_key` set, fresh TBA data, one TBA webcast + one manual webcast → badges read "From TBA" and "Manual override" respectively, visually distinct under CB-safe palette.
- Manual happy path: tournament with NULL `tba_event_key` → all URLs show "Manual override"; no TBA-related UI appears.
- Manual edge case: tournament with `webcastsStale = true` and a populated `webcastsLastSync` → `.banner-info` appears above the streams list with text `"(i) Webcast data last synced 2h ago — may be out of date."`
- Manual edge case: tournament with `webcastsStale = true` and null `webcastsLastSync` → banner reads `"(i) Webcast data has not yet synced — the TBA event key may be incorrect."`
- Manual edge case: TBA-sourced URL row → Remove button is disabled (greyed, not clickable) with tooltip `"Served by TBA — remove by clearing the TBA event key or contacting TBA."` on hover/focus.
- Manual edge case: tournament with zero webcasts → page renders the same empty-state it does today; no badge or banner noise.
- Manual integration: remove a manual URL via the existing "Remove" control → the URL disappears, and if it was a duplicate of a TBA URL, it stays removed (covers the interaction with the sync-time de-dup: manual list is now empty, next sync does nothing, round-trip consistent).
- Manual accessibility: the source badge does not rely on colour alone — a text label ("From TBA" / "Manual override") is present.

**Verification:**
- `cd RavenEye && npm run typecheck` passes.
- Manual smoke: pull the admin page with a staging backend; confirm badges render with CB-safe styling and screen readers announce the text label.
- If a design doc exists for this page, it is updated in the same PR.

---

- [ ] **Unit 7: Admin entry for `tba_event_key` mapping**

**Goal:** Give admins a clear way to set or clear `tba_event_key` per tournament, unblocking TBA sync for the tournaments the team cares about.

**Requirements:** R3, R5.

**Dependencies:** Unit 1 (column exists), Unit 5 (exposes `tbaEventKey` on `TournamentRecord`).

**Files:**
- Modify: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tournament/TournamentApi.java` — add `PUT /api/tournament/{id}/tba-event-key` with body `{ "tbaEventKey": "2026onto" }` or `{ "tbaEventKey": null }` to clear. Gate with explicit method-level `@Secured({"ROLE_SUPERUSER", "ROLE_ADMIN"})` rather than relying on class-level inheritance — same gating as the webcast CRUD endpoints (Unit 1).
- Modify: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tournament/TournamentService.java` — expose `updateTbaEventKey(tournamentId, tbaEventKey)` helper wrapping the existing update pattern.
- Test: `RavenBrain/src/test/java/ca/team1310/ravenbrain/tournament/TournamentApiTest.java` (extend if present, otherwise create).
- Modify: `RavenEye/app/routes/admin/tournament-streams-page.tsx` — add a labelled input beside the tournament picker for the TBA event key, with Save and Clear buttons. Validate format `/^20\d{2}[a-z][a-z0-9]{1,15}$/` client-side (identical to the server regex); surface a hint text beneath ("e.g., `2026onto` — matches the TBA event URL"). Mirror the existing `TournamentRow` state pattern: local `saving` boolean + `msg` string. While a PUT is in flight, disable both buttons and show `"..."` in the Save button. On success, clear `msg` and display `"Saved"` inline for ~1.5s then fade. On HTTP error, set `msg = "Failed: {response.statusText}"` and keep the input editable.
- Modify: `RavenEye/app/common/storage/rb.ts` — add `setTournamentTbaEventKey(tournamentId, tbaEventKey)` wrapper that PUTs via `rbfetch` and returns the (canonicalized) echoed key from the server response body. On 4xx/5xx, throw with `response.statusText` so the caller can surface the failure reason.
- Update: matching RavenEye design doc for the admin page (per CLAUDE.md "keep RavenEye/docs/ in sync with code" standing convention).

**Approach:**
- Because Unit 1 now auto-derives `tba_event_key` on FRC sync, the admin input is an *override* field, not the primary entry path. In the common case the field is pre-populated and the admin never touches it. Admins use Save/Clear only when auto-derivation produced the wrong key (divisional events, district championships with split codes, etc.) — the staleness banner is what prompts them to look.
- Key validation: identical regex on client and server — `/^20\d{2}[a-z][a-z0-9]{1,15}$/` (four-digit 20xx year, at least one alpha, bounded total length). The server lowercases input before matching so admins who type `2026ONTO` get normalized to `2026onto`; the server response body echoes the canonicalized value so the client input updates to the saved form. No attempt to verify the key actually exists in TBA — the next sync attempt records the result in `RB_TBA_EVENT.last_status` and the UI will show `webcastsStale = true` if the key is wrong.
- The admin input lives on the existing tournament-streams-page so the admin can see (a) the current key, (b) the current webcasts with source badges, (c) the staleness indicator, all in one place. Cause-and-effect loop is obvious: fix the key → click Save → wait for next sync (or trigger via `POST /api/tba-sync` if exposed) → staleness banner clears.

**Patterns to follow:**
- `RavenBrain/src/main/java/ca/team1310/ravenbrain/tournament/TournamentApi.java` — existing `PUT /api/tournament/{id}/webcast` endpoint as the template for authentication, body parsing, and update.
- `RavenEye/app/common/storage/rb.ts` — existing `addTournamentWebcast()` wrapper as the template for fetch + JSON handling.

**Test scenarios:**
- Happy path: PUT with a valid key updates `RB_TOURNAMENT.tba_event_key` and the next `GET /api/tournament` returns the new value.
- Happy path: PUT with `null` clears the column; subsequent sync skips the tournament.
- Edge case: PUT with an empty string is treated as clear (or rejected with 400 — implementation chooses, but must be consistent).
- Error path: non-authenticated caller → 401; authenticated MEMBER / DATASCOUT / EXPERTSCOUT / DRIVE_TEAM → 403 (proves the explicit role gate is active, not inherited IS_AUTHENTICATED); ADMIN → 200.
- Error path: malformed key (e.g., `"foo bar"`) → 400, no mutation.
- Error path: nonexistent tournament id → 404.
- Manual happy path (RavenEye): admin types `2026onto`, clicks Save; Save button shows `"..."` during the PUT, then `"Saved"` inline fades after 1.5s; the input value persists on refresh; source-indicator / staleness badges update after the next sync (or after clicking the force-sync control from Unit 4, if exposed in the UI).
- Manual error path (RavenEye): admin types `"foo bar"`; client-side regex blocks submit with an inline hint, Save button stays enabled but PUT is never sent. If submission somehow reaches the backend (stale client), server returns 400 and `msg` shows `"Failed: Bad Request"`.
- Manual happy path (RavenEye): admin loads the page for a newly-synced tournament — the input is pre-populated with the auto-derived key (`2026onto`), no admin action required. The admin only edits the field if they see `webcastsStale` and need to correct a mismapping.
- Manual edge case (RavenEye): admin clears the key; tournament-streams-page shows only manual overrides, `webcastsFromTba` is empty, staleness indicator is false (key is NULL, not "stale").

**Verification:**
- `./gradlew test --tests "ca.team1310.ravenbrain.tournament.*"` passes.
- `cd RavenEye && npm run typecheck` passes.
- Manual smoke: walk through the setup flow on a staging backend — add a key, trigger sync (via the Unit 4 endpoint or wait for the scheduled tick), confirm webcasts appear in the merged list with the "From TBA" badge.

## System-Wide Impact

- **Interaction graph:** `TournamentService.findAll*()` becomes responsible for enriching records with TBA data via a LEFT JOIN on `RB_TBA_EVENT`. Any caller that reads tournaments sees the new fields. The `PUT/DELETE /api/tournament/{id}/webcast` CRUD endpoints retain their paths but their implementations target the renamed `manual_webcasts` column. `TbaEventSyncService` writes only to `RB_TBA_EVENT` — it never touches `RB_TOURNAMENT`. Admin CRUD writes only to `RB_TOURNAMENT.manual_webcasts`. The two write paths are disjoint.
- **Ownership contract (new):** `RB_TBA_EVENT` is owned by `TbaEventSyncService`. `RB_TOURNAMENT.manual_webcasts` is owned by the admin via `TournamentApi`. `RB_TOURNAMENT.tba_event_key` is owned by the admin via Unit 7's endpoint. No other code path writes these columns.
- **Error propagation:** TBA client errors are caught inside `TbaEventSyncService`, logged, and recorded in `RB_TBA_EVENT.last_status`. They never cause a tournament read to fail — the read path falls back to last-known-good plus manual overrides.
- **State lifecycle risks (simplified by Option B):**
  - Admin edits `RB_TOURNAMENT.manual_webcasts` while a sync runs → no conflict; sync doesn't touch this column.
  - `RB_TBA_EVENT` upsert with concurrent syncs → the `AtomicBoolean syncInProgress` gate on `POST /api/tba-sync` prevents double-run (mirrors `FrcSyncApi`). The scheduled job itself is single-threaded per Micronaut's `@Scheduled` default.
  - Partial failure mid-loop (e.g., 5 of 20 tournaments processed before a transient failure) → already-processed tournaments stay updated in `RB_TBA_EVENT`; remaining ones wait for the next tick. Acceptable.
  - Legacy data in the renamed column at V30 migration: pre-existing values in `webcasts` are preserved as `manual_webcasts`. Some may be FRC-sourced URLs that a clean-slate admin would not re-enter. Admins can remove incorrect entries through the existing UI; read-time canonicalize-dedup collapses exact duplicates with TBA data automatically.
- **API surface parity:** `GET /api/tournament` is the only read surface whose response shape grows. If any other RavenBrain endpoint returns `TournamentRecord` (e.g., `/api/schedule` or report endpoints), the enrichment propagates via the shared record — implementation check confirms nothing breaks.
- **Integration coverage:** Two Testcontainers-backed integration tests carry this plan's correctness story: (a) "FRC sync does not overwrite manual_webcasts" (Unit 1), (b) "merged read returns canonicalized union of manual + TBA" (Unit 5). Both are flagged in their respective units.
- **Unchanged invariants:**
  - On-the-wire `webcasts` field remains an array of URL strings (RavenEye parse logic unchanged).
  - Existing `PUT/DELETE /api/tournament/{id}/webcast` endpoint paths unchanged (the admin UI's code does not change for the rename).
  - `RequireLogin` on admin endpoints is unchanged. Role gating is *tightened*: `addWebcast`, `removeWebcast`, and the new `setTbaEventKey` gain explicit method-level `@Secured({"ROLE_SUPERUSER", "ROLE_ADMIN"})` annotations in Units 1 and 7, closing a pre-existing IS_AUTHENTICATED inheritance gap.
  - CB-safe palette standing convention applies in Unit 6.

## Risks & Dependencies

| Risk                                                                                                                                              | Mitigation                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TBA returns a webcast `type` we dropped (e.g., `iframe` for an event whose only stream is iframe-embedded) and the admin cannot see the stream.   | P0 logs dropped types at debug level. If the strat team reports a missing stream, a follow-up adds the needed reconstruction type. Manual override remains the escape hatch.                                                                                                                                      |
| TBA auth key missing in production and sync silently no-ops.                                                                                      | Startup log line reports whether `raven-eye.tba-api.key` is configured. Admin UI staleness banner surfaces "never synced" state via the `webcastsStale` flag.                                                                                                                                                     |
| `tba_event_key` is mapped incorrectly (e.g., admin enters `2025onto` for a 2026 event); sync succeeds but data is wrong.                          | `RB_TBA_EVENT.raw_event_json` preserves the full TBA payload, so the mistake is easy to diagnose. The admin UI source indicator gives a visible signal when a mismapping would have unexpected webcast URLs. A validation helper (future work) could cross-check `season` against the TBA event year on mapping. |
| Column rename (V30) breaks any code that reads `tournament.webcasts()` directly.                                                                    | Grep the RavenBrain source tree for `.webcasts(` references as part of Unit 1; all should be updated to `.manualWebcasts()` (service-internal) or the new merged `.webcasts()` getter (API consumers). The wire contract is preserved so RavenEye is unaffected.                                                 |
| Legacy FRC-sourced URLs surviving in `manual_webcasts` after V30 create minor confusion for admins (they did not add them).                         | Read-time canonicalize-dedup collapses exact duplicates with fresh TBA data, so in practice these are invisible. If admins want a clean slate, the existing `DELETE /api/tournament/{id}/webcast` endpoint removes them.                                                                                           |
| Flyway migration fails mid-upgrade (e.g., V31 applies but V32 fails on a column name conflict).                                                   | Each migration is atomic; V32's failure leaves V31 applied. Normal Flyway recovery (fix the migration, redeploy) applies. Migrations are split per concern to minimize blast radius.                                                                                                                              |
| TBA API rate-limits RavenBrain in the future.                                                                                                     | Caching + ETag + 1h `fixedDelay` keep traffic low. `raven-eye.tba-api.ttl-seconds` is configurable if TBA tightens caching.                                                                                                                                                                                       |
| Adoption measurement per the origin-doc standing decision ("adoption-measure-then-cut").                                                          | P0 deliverable is invisible when it works (admins stop typing webcasts). Success is observational: after P0 ships, admins should not be opening the tournament-streams page for known-TBA events. If adoption fails, the code is removed per the standing decision.                                               |

## Documentation / Operational Notes

- `RavenBrain/README.md` — add a short "TBA Integration" section documenting the `TBA_KEY` env var, how to obtain a key (Account Dashboard → Read API Keys), and what happens when the key is missing.
- `RavenBrain/.env.example` — add the `TBA_KEY` placeholder (Unit 2).
- `RavenEye/docs/admin-tournament-streams.md` (or matching design doc) — update in Unit 6 per standing convention.
- **Deployment on Hydra** — `TBA_KEY` is added to Hydra's env var file. Existing plumbing holds another API key cleanly (established pattern).
- **Rollout** — safe to ship dark: with `TBA_KEY` unset, sync no-ops, read path behaves exactly as today. Setting the key after deploy is a separate, reversible step.
- **Attribution** — add a "Data from The Blue Alliance" footer to any page that renders TBA-sourced webcasts once sync is live. Community convention; not a contractual requirement, but cheap goodwill. Recommended for Unit 6's admin page at minimum.

## Sources & References

- **Origin document:** [RavenEye/docs/brainstorms/2026-04-17-team-capability-rankings-requirements.md](../brainstorms/2026-04-17-team-capability-rankings-requirements.md)
- Related code (RavenBrain):
  - `src/main/java/ca/team1310/ravenbrain/frcapi/` (template package)
  - `src/main/java/ca/team1310/ravenbrain/tournament/TournamentApi.java`
  - `src/main/resources/db/migration/V2__ravenbrain_frc_responses.sql`
  - `src/main/resources/db/migration/V21__tournament_webcasts.sql`
  - `src/main/resources/application.yml`
- Related code (RavenEye):
  - `app/routes/admin/tournament-streams-page.tsx`
  - `app/common/storage/rb.ts`
- External docs:
  - [TBA APIv3 official docs](https://www.thebluealliance.com/apidocs/v3)
  - [Tech Talk: Efficiently Querying the TBA API](https://blog.thebluealliance.com/2017/11/10/tech-talk-efficiently-querying-the-tba-api/)
  - [TBA Webcast model (generated client docs)](https://github.com/TBA-API/tba-api-client-python/blob/master/docs/Webcast.md)
  - [TBA Event model (generated client docs)](https://github.com/TBA-API/tba-api-client-python/blob/master/docs/Event.md)
