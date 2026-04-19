---
title: "feat: Network Communication Refinement"
type: feat
status: active
date: 2026-04-19
origin: RavenEye/docs/brainstorms/2026-04-18-network-communication-refinement-requirements.md
deepened: 2026-04-19
---

# Network Communication Refinement

**Target repos:** `RavenBrain` (server-side HTTP hygiene, config consolidation, tournament window, report-metadata endpoint, role-fingerprint) and `RavenEye` (client cache wrapping, skew-tolerance module, sync refactor, reports-in-IndexedDB, online indicator rework, cache clear + logout button). All paths are monorepo-relative.

## Overview

Refine the RavenEye↔RavenBrain network layer without adding server-push. Add weak ETags to cacheable RavenBrain GETs so routine polls become near-free 304s (verified end-to-end through Cloudflare — see Context & Research); consolidate every sync cadence into one `raven-eye.sync.*` block in `application.yml` that the client fetches from a dedicated endpoint; introduce a centralized clock-skew tolerance module (server emits a time header, client computes a bounded offset); wrap `rbfetch` in a flexible client cache abstraction that stores ETags **inline with each entity's IndexedDB record** and writes only on 200; split sync into two `setInterval` loops — an upload queue on its own 15s cadence (offline-first priority) and a reference-data loop on a 5s tick walking an inline JOBS array; unify "active tournament" with server-owned `activeFrom`/`activeUntil` (client computes `active` locally); pull reports into IndexedDB via a single season-wide metadata endpoint, lazy body pull on open, opportunistic pre-warm, 60-day TTL; clear caches only on explicit logout or username change; role-change detection via a short **role fingerprint** (not the full role list); online indicator derived from a qualifying-response `lastOk` tightened against captive portals via `X-RavenBrain-Version` header presence; wake up a halted TBA plan at the end to re-align on the new standards.

## Problem Frame

StratApp operates at FRC competitions where venue WiFi is unreliable. The architecture is offline-first in principle but four problems are eroding that premise:

1. **Initial app load is heavy** (mostly an API-payload-caching problem; Vite-hashed assets already have long-lived immutable headers end-to-end through Cloudflare).
2. **Some API payloads are re-sent in full on every sync** because RavenBrain does not emit ETag/304.
3. **Scores, schedules, and match times can be up to ~3.5 minutes stale** (RavenBrain polls FRC every 30s; RavenEye polls RavenBrain only every 3 min).
4. **The sync layer is accumulating complexity.** `sync.ts` is ~916 lines with three independent `setInterval` loops. Pages `/programming/nt-keys` and `/kiosk-pit` already bypass IndexedDB (`strategy-plan-page.tsx` already conforms; no migration needed there).

A fifth forward-looking concern: reports should become as readily accessible as any other app data as drive-team workflow grows.

Origin: `RavenEye/docs/brainstorms/2026-04-18-network-communication-refinement-requirements.md`.

## Read-path model (before vs. after)

| Data category | Read path today | Read path after this work |
|---|---|---|
| Scouting reference (tournaments, strategy areas, event types, sequence types, team tournament IDs) | IndexedDB, background-synced | IndexedDB, background-synced (per-endpoint weak-ETag + 304) |
| Match schedules & scores | IndexedDB, 3-min poll | IndexedDB, conditional poll on configurable cadence (default 30s) during tournament window; idle outside |
| Strategy plans & drawings | IndexedDB, 3-min poll | IndexedDB, same cadence as schedules/scores during tournament window; idle outside |
| Robot alerts | IndexedDB, 3-min poll | IndexedDB, same cadence during tournament window; idle outside |
| Reports | Direct fetch each page load, no client cache | IndexedDB; season-wide metadata synced on cadence; bodies on open + opportunistic pre-warm; evicted on TTL, explicit logout, or username change |
| Active-team-tournaments (public endpoint, consumed by `/kiosk-pit`) | Direct raw `fetch()` each page load | IndexedDB, background-synced via a new anonymous sync job that writes to a kiosk-accessible store |
| Admin screens | Direct fetch | Direct fetch (unchanged — the sole "non-offline" exception) |
| Online indicator | `/api/ping` every 30s | Derived from `lastOk` timestamp; piggybacks qualifying successful responses (≥15s cadence during tournament window) |

## Requirements Trace

- **R1, R2** (Offline-First Unification) → Unit 5
- **R3–R9** (Reports in IndexedDB) → Unit 6
- **R10, R11** (Client cache abstraction) → Unit 3
- **R12** (Clear-caches-and-log-out button) → Unit 7
- **R13, R14, R15** (Sync Architecture Simplification) → Unit 5
- **R16, R17, R18** (Tournament Window) → Unit 4
- **R19** (Unified sync config block) → Unit 1; **R20** (client receives cadences) → Unit 3
- **R21** (Freshness) → Unit 5
- **R22, R23** (Clock Skew Tolerance) → Unit 1 (server header emission), Unit 2 (client skew module)
- **R24** (Role refresh + cache eviction on logout/username change) → Unit 7
- **R25, R27, R28, R29** (HTTP Hygiene) → Unit 1 (R25, R27, R29); R28 already satisfied by existing Vite+edge config (verified in Context & Research)
- **R26** (End-to-end ETag verification) → already verified for weak-ETag passthrough; Unit 9 re-verifies once RavenBrain emits them
- **R30, R31, R32** (Online Indicator) → Unit 8
- **R33, R34** (Documentation) → Unit 9
- **R35–R41** (TBA Plan Alignment) → Unit 9 (coordinates with TBA plan on resume)

## Scope Boundaries

- **WebSockets / SSE / server-push** rejected (Unit 9 records the decision).
- **Image optimization** out; tracked as separate future work.
- **Consolidated `/api/bootstrap` endpoint** out; per-endpoint conditional GETs make it unnecessary.
- **Statbotics integration** out.
- **Core TBA architecture** stays owned by the TBA Data Foundation plan. Unit 9 applies the alignment adjustments only.
- **Admin screens** remain direct-fetch.
- **Authentication flow** (JWT issuance, refresh tokens, role-guard components) not redesigned. Role-fingerprint detection (Unit 7) and skew tolerance (Unit 2) sit alongside it.
- **Telemetry feature work** out. (But the existing `GET /api/telemetry/nt-keys` endpoint picks up weak-ETag support as part of Unit 1's universal coverage — it's consumed by a migrated non-telemetry page and is a cacheable GET.)
- **Match video playback/ingestion** out.
- **Report computation changes** out; only delivery, caching, and eviction change.
- **Lint/architectural guard for the admin carve-out** out; stays a discipline boundary.

### Deferred to Separate Tasks

- **Image optimization workstream** — future improvement, no doc yet.
- **Statbotics integration** — anticipated after TBA resumes.

## Context & Research

### Cloudflare ETag passthrough — verified 2026-04-19

Tested against `https://raveneye.team1310.ca/assets/manifest-4263897a.js` (the Vite asset server emits weak ETags + immutable cache headers natively):

```
GET  <asset url>
→ HTTP/2 200, etag: W/"69e45a73-82a7", cache-control: public, max-age=31536000, immutable

GET  <asset url>  If-None-Match: W/"69e45a73-82a7"
→ HTTP/2 304, etag echoed, no body
```

**Weak ETags pass through Cloudflare end-to-end. 304 honored.** The plan's foundational assumption is valid. Gzip is also terminating at Cloudflare (`content-encoding: gzip` observed), so R17 (compression) is already delivered at the edge.

**Implication for R28:** already done on RavenEye via the Vite asset server — no work needed beyond verification.

### Relevant Code and Patterns

**RavenBrain**
- `RavenBrain/src/main/resources/application.yml` — config under `raven-eye.*`. No `sync:` block exists. CORS exposes `X-RavenBrain-Version` (line 25) — precedent for additional CORS-exposed headers.
- **No `@ServerFilter` / `HttpServerFilter` exists anywhere in `RavenBrain/src/main/java`.** Greenfield addition for ETag inbound-header stash and server-time/role-fingerprint emission.
- `RavenBrain/src/main/java/ca/team1310/ravenbrain/tournament/TournamentService.java:28-30, 36-38` — `findActiveTournaments()` and `findUpcomingAndActiveTournaments()` have hardcoded `-24h`/`+4h` inline SQL. Both need parameterized lead/tail.
- Six callers of `findUpcomingAndActiveTournaments()`: `frcapi/service/EventSyncService.java:87,134,253,266`, `tbaapi/service/TbaMatchSyncService.java:124`, `tournament/TournamentApi.java:104`. All inherit the new thresholds automatically via config.
- `RavenBrain/src/main/java/ca/team1310/ravenbrain/report/cache/ReportCacheService.java` + `RB_REPORT_CACHE` (V18): schema `id, cachekey VARCHAR(255) UNIQUE, body LONGTEXT, created TIMESTAMP(3)`. `created` is the last-rebuild timestamp per key. **Every row is enumerable for a season-wide metadata endpoint** without schema changes.
- `ReportApi.java` cache keys: `team-summary:<teamId>` (line 138), `pmva:v5:<tournamentId>` (364), `robot-perf:v4:<ownerTeam>:<season>` (395), `custom-stats:<team>` (322).
- Hardcoded `@Scheduled` strings: `EventSyncService.java:275` (`3m`), `:293` (`30s`); `TbaEventSyncService.java:45` (`1h`); `TbaMatchSyncService.java:79` (`1h`). All migrate to `raven-eye.sync.*` config references.
- `TournamentEnricher.java:42` reads `raven-eye.tba-api.stale-threshold-minutes` via `@Property`. Template for all new config consumers.
- **Latest Flyway migration is V33.** This plan uses V34+ (see Key Technical Decisions).
- **Admin-table `updated_at` columns don't exist** for `RB_STRATEGY_AREA`, `RB_EVENTTYPE`, `RB_SEQUENCE_TYPE`. Unit 1 adds them via Flyway.

**RavenEye**
- `RavenEye/app/common/storage/rbauth.ts:254-296` — `rbfetch()` (public, 401-retry) and `doRbFetch()` (private). The cache layer wraps `rbfetch` on the outside.
- `rb.ts:46-63` — `ping()` already reads `X-RavenBrain-Version` from the response header (line 53). This is **the only universal response-header read today**; adding `X-RavenBrain-Time` and the role-fingerprint here (and in `rbauth.ts`'s response path) extends the pattern.
- `rb.ts` exposes ~72 `rbfetch`-based wrappers; two additional call sites (lines 1094 and 1121) use raw `fetch()` for unauthenticated public endpoints — these **must not** be rerouted through the authenticated cache wrapper.
- `RavenEye/app/common/sync/sync.ts` (916 lines): three `setInterval`s at 117-119; constants `SCHEDULE_SYNC_INTERVAL` (3m), `TRACKING_DATA_SYNC_INTERVAL` (15s), `ACTIVE_TOURNAMENT_CUTOFF` (36h); tick guards `autoSync*`; ~19 exported symbols. `ACTIVE_TOURNAMENT_CUTOFF` referenced at 167, 258, 574, 738 — all move to server-driven `activeFrom`/`activeUntil`.
- `RavenEye/app/common/storage/networkHealth.ts` — current 30s `/api/ping` poll; replaced by `lastOk`-piggyback behavior.
- `RavenEye/app/routes/strategy/strategy-plan-page.tsx` — already reads from `repository.*` (IndexedDB). **No page-migration work needed here.**
- `RavenEye/app/routes/programming/nt-keys-page.tsx:5,14` — calls `getTelemetryNtKeys()` directly. Migrate to IndexedDB read.
- `RavenEye/app/routes/report/pit-kiosk-page.tsx:644, 654` — calls `getTournamentList()` (authenticated, easy migration) AND `getActiveTeamTournaments()` (unauthenticated, `rb.ts:1094`). The public endpoint needs a new background sync job that writes to IndexedDB (see Unit 5).

**Conventions to preserve**
- No state management libraries, no CSS frameworks, plain TS + vanilla CSS.
- iPhone 5 compat for track pages (report pages desktop/tablet).
- CB-safe palette with redundant non-colour channels.
- All RavenBrain calls through `rb.ts` / `rbfetch`.
- Ship via `/kd-pr`; no direct push, no Claude attribution.

### Institutional Learnings

`docs/solutions/` does not exist. No prior institutional knowledge base to consult.

### External References

- Micronaut 4.x HTTP filters — annotation-based `@ServerFilter` / `@RequestFilter` / `@ResponseFilter`. The deprecated `HttpServerFilter` interface is not used in new work.
- RFC 7232 §2.3 — weak vs. strong validators.
- MDN `If-None-Match` / `304 Not Modified` — semantics.
- Cloudflare weak-ETag passthrough confirmed via verification above.

## Key Technical Decisions

- **Weak ETags from controllers, not a global body-hash filter.** Controllers emit `W/"<version>"` from a cheap version source (e.g., `RB_REPORT_CACHE.created`, `max(updated_at)`, etc.). A small `@ServerFilter` stashes inbound `If-None-Match` on the request attribute; a `ResponseUtils.withETag(response, tag, ifNoneMatch)` helper short-circuits to `HttpResponse.notModified()` when they match. No serialization double-pass.
- **ETag and response body must come from the same snapshot.** Controller methods that emit ETags run inside `@Transactional(isolation = REPEATABLE_READ)`, so the `max(updated_at)` or equivalent version source is consistent with the body contents. No explicit locks needed; traffic is low.
- **Server returns timestamps, client computes boolean.** `/api/tournament` returns `activeFrom` and `activeUntil` but **not** an `active` boolean. Client computes `active = serverNow() >= activeFrom && serverNow() <= activeUntil` locally at render time. Eliminates the ETag/time-derived-field mismatch where a tournament window boundary doesn't bump the ETag.
- **Compression stays at the edge.** Cloudflare already terminates gzip/brotli end-to-end (verified). Origin does not compress. Unit 1 verifies; no origin-compression code.
- **Weak ETags everywhere, no Last-Modified.** `cacheFetch` only tracks ETag. Drops the Last-Modified/If-Modified-Since branch — weak ETags pass through Cloudflare (verified), cover the cases we need, simpler code.
- **`RB_REPORT_CACHE.created` is the content version** for reports. `GET /api/report/metadata` (no tournament param) returns `[{key, created}]` across the whole table; response ETag = `max(created)`. No schema change for reports.
- **Flyway migration V34 adds `updated_at` to admin reference tables.** `RB_STRATEGY_AREA`, `RB_EVENTTYPE`, `RB_SEQUENCE_TYPE` get an `updated_at TIMESTAMP(3)` column. Default on insert + auto-update on update. This is the ETag version source for these rarely-changed tables and avoids the boot-time-timestamp staleness failure mode after restarts.
- **Tournament window computed at query time.** `activeFrom = starttime − lead`, `activeUntil = endtime + tail`. No migration; existing `starttime`/`endtime` columns suffice.
- **Two `setInterval` loops, not one.**
  - **Upload loop** (`setInterval(uploadTick, 15_000)`): drains the outbound queue (events, quick comments, robot alerts, strategy plans, strategy drawings). Runs independent of everything else — offline-first priority. Strategy drawings get debounced: skip upload if `modifiedAt` within last 3s (avoid POSTing mid-stroke).
  - **Sync loop** (`setInterval(syncTick, 5_000)` — 0.2 Hz): walks an inline JOBS array in order, runs each descriptor whose `precondition` holds and whose `lastRunAt` is overdue. Array order is load-bearing (tournament list first, then dependents; pre-warm last among sync jobs).
- **Role fingerprint, not full role list.** Server emits `X-RavenBrain-Role-FP: <short-hash>` on **200 responses to authenticated endpoints only** (never on anonymous, 401, 403, error paths). Fingerprint is the first 12 hex chars of `SHA-256(sorted,joined(roles))`. Client compares stored fingerprint; mismatch triggers role re-fetch via `/api/validate`. **`X-RavenBrain-Role-FP` is NOT CORS-exposed** — XSS in the RavenEye origin cannot enumerate roles from response headers. (Actual roles stay in sessionStorage from the JWT on login.)
- **Client cache abstraction wraps `rbfetch` on the outside.** Layering: `cacheFetch(url, {store, keyField})` → `rbfetch(url, {headers})` → `doRbFetch`. The cache sees 304s only after 401→refresh completes inside `rbfetch`. ETag is stored **inline on each entity record** (`entity.etag`), not in a separate store.
- **Cache eviction is simple: explicit logout, username change, or TTL.** No role-change eviction (people don't share iPhones on this team). No session-expiry eviction. On explicit logout with a non-empty upload queue, a separate "Clear caches and log out (discard pending events)" variant is offered with a confirm dialog.
- **Skew module: ±5 min clamp per update, 12h max-age for last-good offset.** Drops the two-response corroboration rule (simpler, and threat model doesn't need it). 12h max-age matches the JWT access-token lifetime so an offline-for-hours scout with a skewed device still has a correct offset when their JWT check runs.
- **JOBS scheduler tick = 5s (0.2 Hz).** Balances responsiveness (tournament-window boundary crossings detected within 5s) against battery/wakeup cost (most sync jobs have 30s or longer cadence — no need to wake every second).
- **`/api/config/client-sync` has public + authenticated variants.** Public variant (`/api/config/client-sync/public`) returns only fields safe for anonymous callers (e.g., tournament-window lead/tail for kiosks). Authenticated variant returns the full set. Both weak-ETagged.
- **Liveness qualification is tight.** HTTP 200 + `Content-Type: application/json` + path matches `/api/*` + **non-empty JSON with `X-RavenBrain-Version` header present** + (for `/api/ping` specifically) body shape matches `{pong: true, version: "..."}`. The `X-RavenBrain-Version` requirement is the strongest captive-portal defense: portals don't know to inject that header.
- **Kiosk-pit's public endpoint gets its own sync job.** `/api/tournament/active-team` (anonymous) is fetched by a new background job that writes to a new IndexedDB store `activeTeamTournaments`. The kiosk page reads from IndexedDB like everything else. No exception to R1.
- **Abort plumbing is NOT added.** In-flight `cacheFetch` calls are allowed to complete; the plan's risk table notes this as acceptable.
- **First-run UX on migrated pages.** `/programming/nt-keys` and `/kiosk-pit` render "Waiting for sync…" initially; after 5 seconds without data AND no network-alive signal, transition to a diagnostic: **"Waiting for tournament data. Please check WiFi connection."** with a retry button. Covers the fresh-provision no-WiFi case.

## Open Questions

### Resolved During Planning

All brainstorm deferred-to-planning items are resolved above in Key Technical Decisions. Additional flow-analyzer concerns are resolved below:

- **ETag/`active`-field mismatch** → return timestamps only; client computes boolean.
- **Concurrent-write race** → `@Transactional(REPEATABLE_READ)` on ETag-emitting methods.
- **Report cache keys not tournament-scoped** → metadata endpoint is season-wide, not per-tournament.
- **Kiosk-pit contradiction** → new background job for the anonymous endpoint, writes to IndexedDB.
- **JWT vs. skew max-age asymmetry** → 12h max-age matching JWT lifetime.
- **Role-fingerprint over full roles** → information disclosure via XSS avoided.
- **Captive-portal defense** → require `X-RavenBrain-Version` in liveness criteria.
- **Kiosk-pit first-run** → 5s timeout + diagnostic + retry button.
- **TBA plan coordination** → TBA is **halted awaiting this work**. This refinement lands first; TBA resumes on top of the refined architecture.
- **Corroboration rule** → dropped; single ±5 min clamp.
- **`useConditionalFetch`** → dropped; existing `useX()` hooks internally call `cacheFetch`.
- **AbortController registry** → dropped.
- **Separate `httpCacheMetadata` store** → dropped; ETag stored on entity records.
- **`Last-Modified` / `If-Modified-Since`** → dropped; weak ETags only.
- **Date.now() audit scope** → exactly 4 sites migrate (`rbauth.ts:111`, `rbauth.ts:131`, `tournament-streams-page.tsx:46`, `sync.ts` tournament-window checks). Everything else stays.

### Deferred to Implementation

- **Exact servlet filter signature for `@ServerFilter` combined with controller-level ETag emission** — Micronaut 4.x idiomatic shape is known; per-project wiring decided by the implementer.
- **Role-fingerprint emission vehicle** — `@ServerFilter` reading the Micronaut security context vs. a response-writing Jackson layer. Either works; implementer picks based on ordering and empty-context handling.
- **Specific IndexedDB store layouts** — adding `etag` and `updated_at`/`pulledAt` fields to entity records is straightforward; the exact shape is an implementation detail.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

### Two-loop scheduler (`sync.ts`)

```
setInterval(uploadTick, 15_000)        // Upload queue — offline-first priority
  └─ drain queues: events, quick comments, robot alerts, strategy plans,
     strategy drawings (drawings debounced: skip if modifiedAt < 3s ago)

setInterval(syncTick, 5_000)           // 0.2 Hz; walks JOBS array in order
  └─ for each job in JOBS:
       if job.precondition() && (now - job.lastRunAt >= job.cadenceMs):
         await job.run()

const JOBS = [
  { id: "tournaments",             cadenceMs: fromConfig,  precondition: loggedIn,                              run: syncTournamentList },
  { id: "team-tournaments",        cadenceMs: fromConfig,  precondition: loggedIn,                              run: syncTeamTournamentIds },
  { id: "active-team-tournaments", cadenceMs: fromConfig,  precondition: always,                                run: syncActiveTeamTournaments }, // anonymous; writes IndexedDB for kiosk
  { id: "strategy-areas",          cadenceMs: bootOnly,    precondition: loggedIn,                              run: syncStrategyAreaList },
  { id: "event-types",             cadenceMs: bootOnly,    precondition: loggedIn,                              run: syncEventTypeList },
  { id: "sequence-types",          cadenceMs: bootOnly,    precondition: loggedIn,                              run: syncSequenceTypeList },
  { id: "nt-keys",                 cadenceMs: fromConfig,  precondition: loggedIn && ntKeysPageRecentlyOpen,    run: syncNtKeys },
  { id: "schedules",               cadenceMs: fromConfig,  precondition: loggedIn && inTournamentWindow,        run: syncMatchSchedule },
  { id: "strategy-plans",          cadenceMs: fromConfig,  precondition: loggedIn && inTournamentWindow,        run: syncStrategyPlans },
  { id: "robot-alerts",            cadenceMs: fromConfig,  precondition: loggedIn && inTournamentWindow,        run: syncRobotAlertList },
  { id: "report-metadata",         cadenceMs: fromConfig,  precondition: loggedIn && reportsRole,               run: syncReportMetadata }, // season-wide, no tournament param
  { id: "report-prewarm",          cadenceMs: fromConfig,  precondition: reportsRole && !otherWorkThisTick,     run: prewarmOneReportBody },
];
```

### Client cache layering

```
Page component
   │
   │ uses (existing pattern, unchanged)
   ▼
useUserList(), useTournamentList(), etc.  ← existing hooks in rb.ts; internals updated
   │
   │ calls
   ▼
cacheFetch(url, { store, keyField })       ← new abstraction (Unit 3)
   │  - reads entity by keyField from store
   │  - if entity.etag exists, adds If-None-Match
   │  - on 304: returns stored entity, does not write
   │  - on 200: parses body, writes { ...body, etag } to store
   │
   │ delegates to
   ▼
rbfetch(url, options)                      ← existing; 401-refresh-retry unchanged
   │
   ▼
doRbFetch  →  fetch()
```

### Server-side ETag flow

```
Incoming GET /api/xxx
   │
   ▼
@ServerFilter("/api/**") @RequestFilter   ← stashes If-None-Match on request attribute
   │
   ▼
Controller method (@Transactional(REPEATABLE_READ))
   │  load body + compute cheap version from same snapshot
   │  → tag = "W/\"" + version + "\""
   │
   ├── tag == stashed If-None-Match  →  HttpResponse.notModified().header(ETAG, tag)
   │
   └── tag != stashed If-None-Match  →  HttpResponse.ok(body).header(ETAG, tag)
```

### Liveness qualification (Unit 8)

```
response qualifies as liveness iff
    response.status == 200
    AND response.headers["content-type"] starts with "application/json"
    AND request.url.pathname matches /\/api\//
    AND response.headers["x-ravenbrain-version"] is present      ← captive-portal defense
    AND body parses as JSON with at least one property
    AND (url != /api/ping OR body matches {pong:true, version:string})
```

## Implementation Units

### Phase 1 — Foundation

- [ ] **Unit 1: Server-side HTTP hygiene + unified sync config + V34 migration**

**Goal:** Add weak-ETag / If-None-Match support across cacheable `/api/*` GETs using `@Transactional(REPEATABLE_READ)` for snapshot-consistent version sources; emit `X-RavenBrain-Time` on every response; consolidate every sync cadence + related knob into `raven-eye.sync.*` in `application.yml` and remove hardcoded `@Scheduled` strings; add `updated_at` columns to admin reference tables via Flyway V34.

**Requirements:** R17 (lead/tail under new config), R19, R23 (server side), R25, R27, R29.

**Dependencies:** None.

**Files:**
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/http/IfNoneMatchFilter.java` — `@ServerFilter("/api/**")` with `@RequestFilter` stashing `If-None-Match` on a request attribute.
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/http/ServerTimeFilter.java` — `@ServerFilter("/**")` with `@ResponseFilter` adding `X-RavenBrain-Time` (epoch-millis) to every response.
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/http/ResponseEtags.java` — helper `withWeakEtag(response, version, ifNoneMatchOpt)`: returns `HttpResponse.notModified().header(ETAG, tag)` when matched, else `response.header(ETAG, tag)`.
- Modify: `RavenBrain/src/main/resources/application.yml` — introduce `raven-eye.sync.*` block:
  - `raveneye-poll-ms: 30000`
  - `frc-scores-poll: "30s"`
  - `frc-schedule-poll: "3m"`
  - `tba-event-poll: "1h"`
  - `tba-match-poll: "1h"`
  - `tournament-window-lead-hours: 12`
  - `tournament-window-tail-hours: 10`
  - `report-body-ttl-days: 60`
  - `skew-offset-max-age-hours: 12`
- Modify: `application.yml` CORS `exposed-headers` — add `X-RavenBrain-Time`, `ETag`. **Do NOT add `X-RavenBrain-Role-FP`** — it stays server-internal to Micronaut serialization, not browser-readable.
- Modify: `RavenBrain/src/main/java/ca/team1310/ravenbrain/frcapi/service/EventSyncService.java:275, 293` — replace `fixedDelay` literals with `${raven-eye.sync.frc-schedule-poll}` / `${raven-eye.sync.frc-scores-poll}`.
- Modify: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/service/TbaEventSyncService.java:45` — config reference.
- Modify: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tbaapi/service/TbaMatchSyncService.java:79` — config reference.
- Modify: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tournament/TournamentService.java:28-30, 36-38` — parameterize lead/tail hours from config (`@Property` injection); both queries use the same thresholds.
- Modify: Controllers that return cacheable reference, schedule, report-metadata, or report data — add `@Transactional(isolation = REPEATABLE_READ)` on the method + emit weak ETag via `ResponseEtags.withWeakEtag(...)`. Affected: `TournamentApi`, `ScheduleApi`, `RobotAlertApi` (GETs), `StrategyAreaApi`, `EventTypeApi`, `SequenceTypeApi`, `MatchStrategyApi` (GETs), `ReportApi` (cached reports using `RB_REPORT_CACHE.created`), `TelemetryApi` (nt-keys GET), plus new endpoints from Units 3, 4, 6.
- Create: `RavenBrain/src/main/resources/db/migration/V34__admin_table_updated_at.sql` — add `updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)` to `RB_STRATEGY_AREA`, `RB_EVENTTYPE`, `RB_SEQUENCE_TYPE`. Backfill existing rows with current timestamp.
- Test: `RavenBrain/src/test/java/ca/team1310/ravenbrain/http/IfNoneMatchFilterTest.java`
- Test: `RavenBrain/src/test/java/ca/team1310/ravenbrain/http/ServerTimeFilterTest.java`
- Test: `RavenBrain/src/test/java/ca/team1310/ravenbrain/http/ResponseEtagsTest.java`
- Test: Extend `TournamentApiTest` to assert 304 on conditional GET + ETag/body snapshot consistency under `@Transactional`.
- Test: Flyway migration test for V34.

**Approach:**
- `ResponseEtags.withWeakEtag(response, "v" + version, ifNoneMatch)` emits `W/"v42"` and returns `notModified()` if matched.
- `@Transactional(REPEATABLE_READ)` ensures the version query (e.g., `SELECT MAX(updated_at) FROM RB_TOURNAMENT`) sees the same snapshot as the body query. No lock contention; traffic is low.
- Admin tables' new `updated_at` column: MySQL's native `ON UPDATE CURRENT_TIMESTAMP` handles auto-update; one-line change per admin endpoint's write path is unnecessary.
- Startup validation (Micronaut `ApplicationEventListener<StartupEvent>`): verify `stale-threshold-minutes >= 1.5 * (tba-event-poll in minutes)` and log warning if violated.

**Patterns to follow:**
- `TournamentEnricher.java:42` `@Property` injection as config-consumption template.
- `rb.ts:46-63` as the client-side precedent for reading `X-RavenBrain-Version` — extends to `X-RavenBrain-Time` via Unit 2.

**Test scenarios:**
- Happy path: `GET /api/tournament` with no `If-None-Match` → 200 with `ETag: W/"<v>"` present.
- Happy path: `GET /api/tournament` with matching `If-None-Match` → 304, no body, ETag echoed.
- Happy path: `GET /api/report/team/<teamId>` on cached key → ETag reflects `RB_REPORT_CACHE.created`.
- Happy path: concurrent-write race — a thread reads `max(updated_at)=T1` + body; another thread commits an update with `T2>T1` during read; within the transaction, body is snapshot-consistent with T1 (body doesn't include T2 row).
- Edge case: weak ETag format `W/"..."` compared string-exact.
- Edge case: `@ServerFilter` stashes `If-None-Match` only when header present.
- Edge case: every response (login, validate, anonymous endpoints) carries `X-RavenBrain-Time`.
- Edge case: `EventSyncService` schedule config reads at bean construction; test setting config property and observing scheduled-delay change.
- Edge case: startup validation logs warning when `stale-threshold < 1.5 × cadence`.
- Edge case: both tournament-window queries use the same configured lead/tail.
- Edge case (V34): migration applies on a seeded DB; existing admin rows get current-timestamp `updated_at`; subsequent updates auto-bump.
- Edge case: `/api/frc-sync/status` (not cacheable) returns no ETag.

**Verification:**
- `./gradlew test` passes.
- Grep: no remaining `fixedDelay = "1h"` / `"3m"` / `"30s"` literals in Java source outside tests.
- Curl: `curl -s -D - https://ravenbrain.team1310.ca/api/tournament` after deploy shows both `ETag` and `X-RavenBrain-Time`.

---

- [ ] **Unit 2: Centralized clock-skew tolerance module (RavenEye)**

**Goal:** Single RavenEye module consuming `X-RavenBrain-Time`, maintaining a bounded client-server offset, used for all time-sensitive server-timestamp comparisons.

**Requirements:** R22, R23 (client side).

**Dependencies:** Unit 1 (server emits header).

**Files:**
- Create: `RavenEye/app/common/storage/serverTime.ts` — module exporting `recordServerTime(responseHeaders)`, `serverNow()`, `isExpired(timestampMs)`, `minutesAgo(timestampMs)`.
- Modify: `RavenEye/app/common/storage/rbauth.ts` (`doRbFetch` response path) — call `recordServerTime(response.headers)` on every response.
- Modify: `RavenEye/app/common/storage/rbauth.ts:111` — replace `Date.now() / 1000` with `serverNow() / 1000` for JWT exp comparison.
- Modify: `RavenEye/app/common/storage/rbauth.ts:131` — same.
- Modify: `RavenEye/app/routes/admin/tournament-streams-page.tsx:46` — replace `Math.round((Date.now() - then) / 60000)` with `minutesAgo(then)`.
- Modify: `RavenEye/app/common/sync/sync.ts` — tournament-window checks now use `activeFrom`/`activeUntil` (see Unit 4) compared against `serverNow()`.
- Test: document expected behavior inline in the module's top comment (no test runner in RavenEye).

**Approach:**
- Offset is in-memory only (no persistence). Updated on every response carrying `X-RavenBrain-Time`.
- **Rules:**
  - Cold start: offset = 0.
  - On update: clamp delta to ±5 min vs. current offset. (No two-response corroboration.)
  - Last-good offset valid for **12 hours** without a fresh header; reverts to 0 afterward. (Matches JWT access-token lifetime.)
- `serverNow()` = `Date.now() + offsetMs` (respecting max-age).
- `isExpired(timestampMs)` = `serverNow() > timestampMs`.
- `minutesAgo(timestampMs)` = `Math.max(0, Math.round((serverNow() - timestampMs) / 60000))`.
- The **4 specific call sites** that migrate to `serverNow()`: `rbauth.ts:111`, `rbauth.ts:131`, `tournament-streams-page.tsx:46`, `sync.ts` tournament-window checks. Everything else keeps `Date.now()`.

**Patterns to follow:**
- `rb.ts:53` as the precedent for reading a response header.

**Test scenarios:**
- Happy path: header present → offset updates; `serverNow()` returns adjusted time.
- Edge case: no header on first response → offset stays 0.
- Edge case: header absent for 12h → last-good expires; reverts to 0.
- Edge case (clamp): new header says +30 min skew, current offset is 0 → offset becomes +5 min (clamp).
- Edge case (clamp stays): next header also says +30 min → offset becomes +10 min; after a few more it converges to near the correct value.
- Edge case: monotonic direction changes allowed (offset can go back down).
- Integration: JWT expiration check behaves correctly with device clock ±15 min (offset corrects it).
- Integration: `minutesAgo(futureTimestamp)` returns 0, never negative.

**Verification:**
- Manual: set device clock +10 min; confirm `tournament-streams-page` "N minutes ago" display stays sensible.
- Manual: JWT continues to work across a forced 15-minute device-clock offset.

---

### Phase 2 — Client Plumbing

- [ ] **Unit 3: Client cache abstraction + sync-cadence delivery endpoints**

**Goal:** Introduce `cacheFetch` wrapping `rbfetch`, storing ETag inline on each entity record in IndexedDB. Every non-admin GET to RavenBrain flows through it via existing `rb.ts` wrappers. Deliver sync cadences from server via two `/api/config/client-sync/*` endpoint variants.

**Requirements:** R10, R11, R19 (client-side), R20.

**Dependencies:** Unit 1 (server emits ETags + config endpoints).

**Files:**
- Create: `RavenEye/app/common/storage/cacheFetch.ts` — core wrapper.
- Modify: `RavenEye/app/common/storage/db.ts` — each relevant entity store gains an `etag` field. No separate `httpCacheMetadata` store.
- Modify: `RavenEye/app/common/storage/rb.ts` — every currently-`rbfetch`ing GET wrapper migrates internally to call `cacheFetch`. Public signatures of `getTournamentList()`, `useUserList()`, etc. are unchanged. The two raw-fetch sites (lines 1094, 1121) stay on raw fetch (unauthenticated public endpoints consumed by the new active-team-tournaments sync job and home-page display).
- Create: `RavenEye/app/common/storage/syncConfig.ts` — fetches from authenticated endpoint; exposes `getSyncCadence()` / `getTournamentWindowBounds()` / `getReportTtl()`. Cold-start defaults if endpoint hasn't responded.
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/config/ClientSyncConfigApi.java`:
  - `GET /api/config/client-sync` (authenticated) — full set of `raven-eye.sync.*` properties.
  - `GET /api/config/client-sync/public` (anonymous) — only `tournament-window-lead-hours`, `tournament-window-tail-hours`.
  - Both weak-ETagged.
- Test: `RavenBrain/src/test/java/ca/team1310/ravenbrain/config/ClientSyncConfigApiTest.java`.

**Approach:**
- `cacheFetch(url, {store, keyField})`:
  1. Read entity by `keyField` from `store`.
  2. If entity has an `etag`, build `If-None-Match` header.
  3. Delegate to `rbfetch` (401-retry happens inside).
  4. **On 304:** return `{body: entity, fromCache: true}`. Do not write.
  5. **On 200:** parse body, write `{...body, etag: response.headers.get('etag')}` to store, return `{body, fromCache: false}`.
- No AbortController, no separate metadata store, no `If-Modified-Since`.
- `rb.ts` wrappers migrate one at a time: internally change `await rbfetch(url).then(r => r.json())` to `await cacheFetch(url, {store, keyField}).then(r => r.body)`. Public signature preserved; hooks (`useUserList`, etc.) unchanged externally.
- `syncConfig.ts` uses `cacheFetch` for itself. On app mount, kicks off a fetch; returns sensible hardcoded defaults if the endpoint hasn't responded.

**Patterns to follow:**
- Existing `rb.ts` per-endpoint wrappers — keep the shape, change the implementation.
- `db.ts` repository pattern.

**Test scenarios:**
- Happy path: first call → 200, body written with ETag, subsequent read returns it.
- Happy path: second call with stored ETag → 304, no write, returns stored body.
- Happy path: body changed on server → new ETag, body overwritten.
- Edge case: store is empty on 304 (shouldn't happen in steady state but defensive) → `cacheFetch` retries without the If-None-Match header.
- Error path: network fails → throws; no writes.
- Happy path: public `/api/config/client-sync/public` returns only public fields; ETag present.
- Happy path: authenticated config endpoint returns full set; requires valid Bearer token.
- Edge case: `getSyncCadence()` returns a sensible default (e.g., 30000 ms) before the endpoint responds.

**Verification:**
- `npm run typecheck` passes.
- DevTools Network: after first load, subsequent polls return `304 Not Modified`.
- Indicator and sync still operate normally.

---

### Phase 3 — Tournament Window

- [ ] **Unit 4: Server-owned tournament window (timestamps only)**

**Goal:** Return `activeFrom` and `activeUntil` on tournament records; server replaces `-24h`/`+4h` with configured `-12h`/`+10h`; client computes `active` locally via `serverNow()`.

**Requirements:** R16, R17, R18.

**Dependencies:** Unit 1 (config keys + `@Transactional` pattern), Unit 2 (`serverNow()` for client-side evaluation), Unit 3 (`/api/tournament` flows through `cacheFetch`).

**Files:**
- Modify: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tournament/TournamentService.java` — both `findActiveTournaments()` and `findUpcomingAndActiveTournaments()` parameterized by lead/tail; tournament DTO enriched with `activeFrom = starttime - leadHours`, `activeUntil = endtime + tailHours`. **Does not emit `active` boolean** — client computes.
- Modify: `RavenBrain/src/main/java/ca/team1310/ravenbrain/tournament/TournamentRecord.java` (or `TournamentResponse` — implementer verifies which the controller returns) — add `activeFrom` (Instant) and `activeUntil` (Instant). Server-populated on read.
- Modify: `RavenEye/app/types/RBTournament.ts` — add the two fields (optional).
- Create: `RavenEye/app/common/storage/tournamentWindow.ts` — helper `isTournamentActive(t)` returning `serverNow() >= t.activeFrom && serverNow() <= t.activeUntil`, plus `hasAnyActiveTournament(list)`.
- Modify: `RavenEye/app/common/sync/sync.ts` — `hasActiveTournament()` uses the new helper; remove `ACTIVE_TOURNAMENT_CUTOFF` constant and its 4 references.
- Test: Extend `TournamentApiTest` to assert `activeFrom`/`activeUntil` fields, and that both window queries use the same config.

**Approach:**
- Fields computed at query time (no schema migration).
- Six callers of `findUpcomingAndActiveTournaments()` inherit the new thresholds automatically.
- Client's `active` boolean is derived per-render from timestamps + `serverNow()`. Always fresh; no ETag-vs-now drift.

**Patterns to follow:**
- Existing DTO enrichment patterns; TBA plan's enrichment shape (once it resumes) will sit alongside these fields.

**Test scenarios:**
- Happy path: tournament with `starttime = now - 1h, endtime = now + 1h` → `activeFrom ≈ now - 13h`, `activeUntil ≈ now + 11h`.
- Edge case: tournament ending 9h ago with tail=10h → `activeUntil > now` still.
- Edge case: tournament ending 11h ago with tail=10h → `activeUntil < now`.
- Edge case: lead=8h/tail=12h config change → same tournaments re-evaluate without code change.
- Integration: both `findActiveTournaments` and `findUpcomingAndActiveTournaments` pick up the new thresholds.
- Integration: `EventSyncService` and `TbaMatchSyncService` inherit automatically.
- Integration (client): `isTournamentActive(t)` returns `true` right after `starttime - 12h`, `false` after `endtime + 10h`.
- Integration (boundary): when the clock crosses `activeFrom` at 12:00, UI re-renders correctly because the helper uses `serverNow()` — no ETag refresh needed.

**Verification:**
- `./gradlew test` + `npm run typecheck` pass.
- Manual: staging event just entering the tail window shows as active on the client.

---

### Phase 4 — Sync & Offline

- [ ] **Unit 5: Two-loop scheduler refactor + page-level IndexedDB migrations**

**Goal:** Collapse to two `setInterval`s (upload-loop at 15s, sync-loop at 5s walking a JOBS array). Migrate `/programming/nt-keys` and `/kiosk-pit` to IndexedDB-backed reads with first-run loader + diagnostic. Add a new anonymous sync job for `/api/tournament/active-team` to make `/kiosk-pit` fully offline-capable.

**Requirements:** R1, R2, R13, R14, R15, R21.

**Dependencies:** Unit 2 (tournament-window helper uses `serverNow()`), Unit 3 (`cacheFetch` is the network primitive), Unit 4 (tournament-window signal).

**Files:**
- Modify: `RavenEye/app/common/sync/sync.ts` — rewrite around two `setInterval`s. Preserve every currently-exported symbol or migrate all callers in the same PR.
- Modify: `RavenEye/app/routes/programming/nt-keys-page.tsx:5,14` — read NT keys from a new IndexedDB store; trigger `syncNtKeys()` job on mount if store empty; render `FirstRunLoader` component on empty data.
- Modify: `RavenEye/app/routes/report/pit-kiosk-page.tsx:644` — replace `getTournamentList()` with IndexedDB read + sync-on-mount-if-empty.
- Modify: `RavenEye/app/routes/report/pit-kiosk-page.tsx:654` — replace `getActiveTeamTournaments()` with IndexedDB read from the new `activeTeamTournaments` store.
- Modify: `RavenEye/app/common/storage/db.ts` — add `ntKeys` object store and `activeTeamTournaments` object store.
- Create: `RavenEye/app/common/sync/syncNtKeys.ts` — `/api/telemetry/nt-keys` via `cacheFetch` → `ntKeys` store.
- Create: `RavenEye/app/common/sync/syncActiveTeamTournaments.ts` — fetches `/api/tournament/active-team` (anonymous, raw `fetch()` since it's the public endpoint) → `activeTeamTournaments` store. **Does NOT go through `cacheFetch`** (anonymous; but can still receive ETag manually if server supports it — simple per-endpoint ETag read is fine).
- Create: `RavenEye/app/common/components/FirstRunLoader.tsx` — loader with 5s timeout → diagnostic ("Waiting for tournament data. Please check WiFi connection.") + retry button.
- Modify: `RavenEye/app/common/storage/networkHealth.ts` — removed `setInterval(runPing, POLL_INTERVAL_MS)`; replaced by `lastOk` recording from Unit 8. Kept `ping()` as an on-demand fallback (not a polling driver).
- Test: manual verification per CLAUDE.md convention (no RavenEye test runner).

**Approach:**
- **Upload loop** (15s): drains the outbound queues. Strategy drawings check `drawing.modifiedAt > serverNow() - 3000` and defer if so. Runs regardless of tournament-window state (but idles when `!networkAlive` — same guard as today).
- **Sync loop** (5s tick): walks the JOBS array in order. Each descriptor is a plain object `{id, cadenceMs, precondition, run}`. Descriptor runs when `precondition()` is true AND `now - lastRunAt >= cadenceMs`. `bootOnly` runs once on startup; `perTick` runs every tick. Array order is load-bearing: tournament list first, then schedule/plans/alerts, then report-metadata, then pre-warm.
- **Pre-warm descriptor** tracks a shared `tickTouchedNetwork` flag set by earlier descriptors; skips itself when other descriptors reported work this tick.
- **First-run loader:** initial "Waiting for sync…" message; after 5s with no data AND no network-alive signal, swaps to diagnostic + retry. `FirstRunLoader` takes `{hasData, onRetry}` props and manages the timeout internally.
- **`syncActiveTeamTournaments`**: uses raw `fetch()` since endpoint is anonymous. Responds to ETag if server sends one (simple read-the-header-write-it-back pattern) without depending on the full `cacheFetch` abstraction.
- **`ACTIVE_TOURNAMENT_CUTOFF` deleted.** Every consumer uses `isTournamentActive(t)` from Unit 4's helper.

**Patterns to follow:**
- `rb.ts` existing per-endpoint hooks (return `{loading, data, error}`).
- `FirstRunLoader` follows the same banner/component pattern as `app/common/banners/`.

**Test scenarios:**
- Happy path: exactly two `setInterval`s in `sync.ts` after refactor.
- Happy path: tournament-list job fires first in tick; dependent jobs run on same tick after it resolves.
- Happy path: new background job added by appending one object to JOBS.
- Happy path (upload at 15s): dirty drawing — next 15s tick uploads.
- Edge case (debounce): drawing modified within last 3s — upload skipped this tick; next tick uploads.
- Edge case (pre-warm skip): tournament-list + schedule both did work this tick → pre-warm doesn't run.
- Edge case (pre-warm proceed): all other jobs had no work → pre-warm runs; one body pulled.
- Edge case (role): MEMBER — `report-metadata` and `report-prewarm` skip via `reportsRole` precondition.
- Edge case (first-run `/programming/nt-keys`): fresh IndexedDB → loader → 5s timeout with no network → diagnostic; retry button triggers sync.
- Edge case (first-run `/kiosk-pit`): fresh IndexedDB → loader → anonymous sync populates `activeTeamTournaments` → diagnostic dismissed.
- Edge case (offline): tick runs; only upload-loop + no-precondition descriptors proceed; no errors logged.
- Edge case (tournament-window boundary): response lands after window closes → writes to IndexedDB anyway (fresh data is safe); next tick's `isTournamentActive` correctly idles jobs.
- Edge case (removal): grep confirms `ACTIVE_TOURNAMENT_CUTOFF` has zero matches.
- Edge case (scheduler tick): 5-second tick measurable; no 1-second polling.

**Verification:**
- `npm run typecheck` passes.
- Binary criteria from R14: **exactly two** `setInterval`s in `sync.ts` (upload + sync tick); no `app/routes/**` file starts a background *network* polling interval; new jobs added by appending to the inline JOBS array.
- Manual: fresh browser profile → `/programming/nt-keys` with WiFi → loader disappears quickly.
- Manual: fresh browser profile → `/kiosk-pit` with WiFi disabled → loader → 5s → diagnostic shown.

---

### Phase 5 — Reports in IndexedDB

- [ ] **Unit 6: Reports in IndexedDB (season-wide metadata + lazy body + pre-warm + TTL)**

**Goal:** Add `GET /api/report/metadata` (season-wide) returning `[{key, created}]` over `RB_REPORT_CACHE`; client metadata sync at configured cadence during tournament window; bodies pulled on open via `useReportBody(key)`; pre-warm opportunistically; TTL-based eviction.

**Requirements:** R3, R4, R5, R6, R7, R8, R9.

**Dependencies:** Unit 1 (ETag support + TTL config), Unit 3 (`cacheFetch`), Unit 4 (tournament window), Unit 5 (JOBS array hosts the descriptors).

**Files:**
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/report/ReportMetadataApi.java` — `GET /api/report/metadata` returning `[{key, created}]` from `RB_REPORT_CACHE` ordered by `created DESC`. Role-gated at `ROLE_EXPERTSCOUT, ROLE_ADMIN, ROLE_SUPERUSER` (same as existing report endpoints). Weak-ETag emission using `MAX(created)` as the version.
- Modify: `RavenBrain/src/main/java/ca/team1310/ravenbrain/report/cache/ReportCacheService.java` — add `findAllMetadata(): List<ReportMetadataTuple>` returning `{cachekey, created}` tuples for all rows.
- Modify: `RavenEye/app/common/storage/db.ts` — add `reportMetadata` and `reportBodies` stores. Keys: cache-key string. `reportBodies` record shape: `{key, body, versionStored, pulledAt, etag}`. `reportMetadata` record shape: `{key, created, etag}`.
- Create: `RavenEye/app/common/sync/reportSync.ts` — `syncReportMetadata()`, `prewarmOneReportBody()`, `pullReportBody(key)`. All use `cacheFetch`.
- Create: `RavenEye/app/common/storage/useReportBody.ts` — hook returning `{loading, body, error}`. Reads from IndexedDB; triggers pull if absent or `body.versionStored < metadata.created`.
- Modify: every report page (`RavenEye/app/routes/report/*`) — replace on-mount direct fetches with `useReportBody(key)`. Existing 24h cache logic in `summary-report-page.tsx:45` is removed.
- Test: `RavenBrain/src/test/java/ca/team1310/ravenbrain/report/ReportMetadataApiTest.java`.

**Approach:**
- **Server:** `GET /api/report/metadata` returns `[{key: "pmva:v5:2026onto", created: 1713456789000}, ...]` with weak ETag = `max(created)`. Small payload (one row per cached report).
- **Client metadata sync:** `report-metadata` JOBS descriptor runs on `reports-metadata-poll-ms` cadence during tournament window; pulls via `cacheFetch` into `reportMetadata` store. Role-filtered: skip for MEMBER/DATASCOUT.
- **Client body pull (`useReportBody(key)`):**
  1. Read `reportBodies[key]` and `reportMetadata[key]`.
  2. If body absent OR `body.versionStored < metadata.created`, trigger `pullReportBody(key)` via `cacheFetch`.
  3. Return `{loading, body, error}`.
- **Pre-warm:** `report-prewarm` descriptor. When not skipped by "other work this tick" guard, picks the metadata entry whose body is missing or oldest by `pulledAt`, pulls it. One body per tick maximum.
- **Eviction:** runs inside `runEvictionPass()` (called at end of each sync tick):
  - Compiles victims: report bodies with `pulledAt < serverNow() - ttlDays`.
  - Also runs on explicit logout or username change (Unit 7).
  - Single IndexedDB transaction, delete victims.
- **Body record:** `{key, body, versionStored: metadata.created_at_pull_time, pulledAt: serverNow(), etag}`. Version comparison uses `versionStored` against current metadata.
- **QuotaExceededError:** catch on body write → evict oldest body by `pulledAt`, retry once. If still fails, abandon pre-warm for this tick; for `useReportBody` on-open path, surface error to UI.

**Patterns to follow:**
- `ReportCacheService.invalidateForTournament(id)` / `invalidateByPrefix(prefix)` — existing cache-key patterns.
- `useUserList()` pattern for `{loading, body, error}` hook shape.

**Test scenarios:**
- Happy path: `GET /api/report/metadata` returns all seeded cache rows with correct `created`; ETag present.
- Happy path: `syncReportMetadata` persists tuples; subsequent conditional GET returns 304.
- Happy path: `useReportBody("team-summary:1310")` with empty store → triggers pull → populates body.
- Happy path: event submission invalidates server cache for `team-summary:1310`; next metadata sync sees new `created`; next `useReportBody` invocation re-pulls.
- Edge case: DRIVE_TEAM (no report access) — metadata sync runs, no bodies to pre-warm, no on-open access possible; the descriptor effectively no-ops.
- Edge case: MEMBER — `report-metadata` precondition returns false; no work done.
- Edge case: quota exceeded on body write → evict oldest body → retry → if still fails, abandon pre-warm for that tick (no surfaced error); for on-open, surface error.
- Edge case: TTL eviction — body with `pulledAt` 61 days ago is evicted on next tick.
- Edge case: pre-warm skipped when tournament-list + metadata both did work in same tick.
- Integration: offline scout opens a report; loader appears; body arrives; subsequent open is instant from IndexedDB.

**Verification:**
- `./gradlew test --tests "ca.team1310.ravenbrain.report.*"` passes.
- `npm run typecheck` passes.
- Manual: open a report online; go offline; reopen — renders from IndexedDB.

---

### Phase 6 — Cache Lifecycle

- [ ] **Unit 7: Role fingerprint + explicit-only cache eviction + clear-caches-and-log-out button**

**Goal:** Server emits `X-RavenBrain-Role-FP` (12-char SHA-256 prefix of sorted roles) on 200 responses to authenticated endpoints. Client compares against stored fingerprint; mismatch triggers role re-fetch via `/api/validate`. Cache eviction triggers only on: explicit logout OR username change (new login on same device). Add a user-facing "Clear caches and log out" control with a "(discard pending events)" variant for non-empty queue states.

**Requirements:** R12, R24 (per resolution: only on logout/username change, not continuous role refresh).

**Dependencies:** Unit 1 (filter infrastructure), Unit 6 (report stores to evict).

**Files:**
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/http/RoleFingerprintFilter.java` — `@ServerFilter("/api/**")` with `@ResponseFilter` that emits `X-RavenBrain-Role-FP` ONLY when the Micronaut security context carries a valid authenticated principal AND the response status is 200. Fingerprint: first 12 hex chars of `SHA-256(sorted-roles-joined-with-comma)`. Header is **not** added to `application.yml` `exposed-headers`.
- Modify: `RavenEye/app/common/storage/rbauth.ts` — extend the Unit 2 response-recording hook to also read `X-RavenBrain-Role-FP` (when present). Compare to stored fingerprint in sessionStorage; on mismatch, trigger role re-fetch via existing `/api/validate` path.
- Modify: `RavenEye/app/common/sync/sync.ts` — `runEvictionPass()` is called **only** on explicit logout or new login with different username. Not called on role change (no eviction). Not called on session expiry (no eviction).
- Create: `RavenEye/app/common/components/ClearCachesButton.tsx` — UI component in settings/nav area.
  - **Default variant:** visible when upload queue empty. Click → confirm dialog → `clearAllCaches()` + `logout()` + navigate to `/login`.
  - **"(discard pending events)" variant:** visible when upload queue non-empty. Click → strong-warning confirm dialog ("N events and M alerts will be lost. Continue?") → `clearAllCaches()` including queues + `logout()` + navigate.
- Modify: `RavenEye/app/common/storage/db.ts` — add `clearAllCaches({discardQueues})` helper. With `discardQueues=false`, wipes `reportMetadata`, `reportBodies`, all reference-data stores, `activeTeamTournaments`, `ntKeys` — NEVER `commentsNew`/`eventsNew`/`robotAlertsNew`/dirty strategy plans/drawings. With `discardQueues=true`, wipes everything.
- Modify: `RavenEye/app/common/storage/rbauth.ts` (`logout()` function at line 207) — also call `clearAllCaches({discardQueues: false})` and clear localStorage refresh token.
- Modify: auth flow on new login — if the new login's username differs from sessionStorage's previous username (after logout or on login), invoke `clearAllCaches({discardQueues: true})` as a safety measure (fresh identity should not inherit prior caches).
- Test: `RavenBrain/src/test/java/ca/team1310/ravenbrain/http/RoleFingerprintFilterTest.java`.

**Approach:**
- **Role fingerprint** is a one-way short hash. Server computes on every response to authenticated endpoints. Client stores the fingerprint in sessionStorage (`raveneye_role_fp`).
- On mismatch detected: client invokes `/api/validate` (existing), re-populates roles in sessionStorage, fires `AUTH_CHANGED_EVENT`. No cache eviction — the user remains the same user with updated privileges; their caches can stay.
- **Explicit logout** flow: user clicks "Clear caches and log out" → confirm → `clearAllCaches({discardQueues: false})` (unless they chose the discard variant) → `logout()` (which clears session + refresh token) → navigate to `/login`.
- **Username change** flow: on a fresh login (`authenticate()` success), compare incoming `login` against previous sessionStorage value. If different: `clearAllCaches({discardQueues: true})` before accepting the new session. Prevents cache pollution across user identities on a shared device (rare but safe).
- **Button behavior:**
  - Default variant: hidden when queue non-empty, visible when queue empty.
  - Discard variant: visible only when queue non-empty (distinct element, strong red-warning styling, explicit count in the confirm dialog).
  - Atomic check on click: even for the default variant, handler re-reads queue state synchronously and falls back to the discard dialog if the queue became non-empty between render and click.

**Patterns to follow:**
- Existing `AUTH_CHANGED_EVENT` at `rbauth.ts:13`.
- Existing toast / dialog infrastructure per `RavenEye/CLAUDE.md`.
- Existing `logout()` flow at `rbauth.ts:207`.

**Test scenarios:**
- Happy path: authenticated GET response includes `X-RavenBrain-Role-FP`; first call writes to sessionStorage; subsequent responses with same fingerprint → no-op.
- Happy path: admin promotes user to SUPERUSER mid-session → next authenticated response's fingerprint differs → client re-fetches roles via `/api/validate` → sessionStorage updated → `AUTH_CHANGED_EVENT` fires. No caches evicted.
- Edge case: anonymous response (login failure, 401) → no fingerprint header → no-op.
- Edge case: 403 response to authenticated request → no fingerprint header (filter only emits on 200).
- Happy path (logout): click default variant when queue empty → confirm → caches cleared (queues untouched) → logout fires → user on login page.
- Happy path (discard): click discard variant with queued events → warning dialog showing count → confirm → everything cleared including queues → logout → login page.
- Edge case (visibility race): user opens menu → queue empty → default button visible → new event fires → user clicks → handler re-reads queue (now non-empty) → offers discard variant confirm instead.
- Happy path (username change): user A logs out → user B logs in on same device → `clearAllCaches({discardQueues: true})` fires as part of `authenticate()`; user B starts with clean IndexedDB.
- Edge case: session expires silently (tab close + reopen within sessionStorage lifetime) → no cache eviction; user resumes with existing caches.
- Edge case: JWT server-side revoked → next request gets 401 → rbfetch refresh fails → session ends; user prompted to log in; **caches not auto-evicted** (only on explicit logout or username change).

**Verification:**
- `./gradlew test` passes.
- `npm run typecheck` passes.
- Manual: click default button with clean queue → confirm user logged out, caches cleared.
- Manual: add pending events → confirm default button hidden, discard button visible with red warning styling.
- Manual: log in as user A → capture events → sync → log out → log in as user B → confirm B sees clean IndexedDB.
- Network tab: `X-RavenBrain-Role-FP` present on `/api/tournament` (authenticated). Absent on `/login` and `/api/ping` when not authenticated.

---

### Phase 7 — Online Indicator

- [ ] **Unit 8: Online indicator rework (lastOk + JSON + X-RavenBrain-Version liveness + ping demotion)**

**Goal:** Online indicator derives from `lastOk`, updated on every qualifying response; dedicated 30s `/api/ping` poll removed; fallback ping only when no qualifying response landed in the required window.

**Requirements:** R30, R31, R32.

**Dependencies:** Unit 3 (cache wrapper sees every response), Unit 1 (`X-RavenBrain-Version` present on every response via existing behavior).

**Files:**
- Modify: `RavenEye/app/common/storage/networkHealth.ts` — remove the `setInterval(runPing, POLL_INTERVAL_MS)` driver; introduce `lastOk` timestamp updated by a new `recordQualifyingResponse(response, url)` helper; fallback ping triggered by the sync tick loop when `lastOk` is older than the online threshold.
- Modify: `RavenEye/app/common/storage/cacheFetch.ts` (Unit 3) + `RavenEye/app/common/storage/rbauth.ts` (`doRbFetch`) — on every response, call `recordQualifyingResponse(response, url)` which checks liveness criteria and updates `lastOk` on match.
- Modify: `RavenBrain/src/main/java/ca/team1310/ravenbrain/connect/EstablishConnection.java:30-36` (`/api/ping`) — return `{"pong": true, "version": "<app-version>"}` as JSON instead of `TEXT_PLAIN` `"pong"`.
- Modify: the header/nav component that renders the indicator — use new `useNetworkHealth()` returning `{online, lastOkAt}`.

**Approach:**
- **Liveness criteria (ANDed):**
  - `response.status === 200`
  - `response.headers.get('content-type')?.startsWith('application/json')`
  - `url.pathname` matches `/api/`
  - `response.headers.get('x-ravenbrain-version')` present (captive-portal defense — portals don't know to inject this)
  - parsed body is non-empty JSON with at least one property or is a non-empty array
  - special case for `/api/ping`: body must match `{pong: true, version: string}`
- `recordQualifyingResponse` sets `lastOk = serverNow()` (respects skew from Unit 2 so indicator doesn't flap on skewed devices).
- `useNetworkHealth()` returns `{online: serverNow() - lastOk < threshold, lastOkAt: lastOk}`. Threshold: 15s during tournament window, 60s otherwise.
- **Fallback ping:** a JOBS descriptor with `precondition: serverNow() - lastOk > 15000 && inTournamentWindow` runs `ping()`. Only fires when everything else has been quiet for >15s during active window.
- **Ping endpoint** now returns JSON + passes liveness criteria; on a match, updates `lastOk` like any other qualifying response.

**Patterns to follow:**
- Existing `ping()` at `rb.ts:46-63` — keeps its 3s timeout.
- Existing `useNetworkHealth()` interface shape; internals rewritten.

**Test scenarios:**
- Happy path: qualifying `/api/tournament` response updates `lastOk`; indicator green.
- Happy path: normal sync traffic every 30s keeps `lastOk` fresh; no fallback ping fires.
- Edge case: idle for 20s during tournament window → fallback ping fires at 15s elapsed.
- Edge case (captive HTML): response `content-type: text/html` → criteria fail; `lastOk` not updated; indicator flips offline.
- Edge case (captive empty JSON): response `{}` → empty-property check fails.
- Edge case (captive JSON masquerade): response `{"message": "Sign in"}` with Content-Type application/json → **X-RavenBrain-Version absent** → criteria fail; indicator flips offline.
- Edge case (ping body): response 200 + JSON + X-RavenBrain-Version present but body is `{foo: "bar"}` → for `/api/ping` specifically, body shape check fails.
- Edge case (skew): device clock offset ±20 min — indicator works correctly via `serverNow()`.
- Integration: 5-minute normal session — no dedicated ping traffic in steady state.

**Verification:**
- `npm run typecheck` passes.
- Manual: with a captive-portal simulator returning 200 HTML → indicator stays red.
- Manual: with a captive-portal simulator returning `{"portal": true}` JSON (without X-RavenBrain-Version) → indicator stays red.
- Manual: idle the app 20s during a tournament window → observe single fallback ping in DevTools Network.

---

### Phase 8 — Alignment & Docs

- [ ] **Unit 9: TBA plan alignment staging + architecture docs + end-to-end verification**

**Goal:** Stage the TBA alignment changes (to be merged when the TBA plan resumes). Author architecture docs in both repos. Verify weak-ETag passthrough once RavenBrain actually emits them.

**Requirements:** R26 (verification), R33, R34, R35-R41 (TBA alignment staged for resume).

**Dependencies:** Units 1-4 landed.

**Files:**
- Create: `RavenBrain/doc/architecture.md` additions — new "Communication Model" section:
  - WebSockets / SSE / server-push are not used. Rationale: servlet-mode architectural simplicity + student-contributor readability. (The "flaky WiFi resilience" argument is not used.)
  - Communication is bulk synchronization over conditional HTTP GETs with weak ETags. Server-side `RB_REPORT_CACHE` and `RB_*_RESPONSES` caches for external APIs.
  - Data-source authority: FRC is authoritative for scores + schedules; TBA and Statbotics are designated for derived analytics / match data / statistics. TBA integration is in flight but **currently halted awaiting this refinement**; Statbotics is planned.
  - Reference this plan and the origin brainstorm.
- Create: `RavenEye/docs/architecture.md` — client-side equivalent: IndexedDB as the read source of truth; admin screens as the direct-fetch exception; two-loop sync scheduler; cache abstraction; skew-tolerance module.
- Modify: `RavenEye/docs/tba-data-foundation.md` — add a section at the top noting the refinement has landed; list the alignment adjustments the TBA plan picks up on resume:
  - `@Scheduled(fixedDelay)` in `TbaEventSyncService` and `TbaMatchSyncService` now reads from `raven-eye.sync.*` (already done in Unit 1).
  - `TournamentRecord` already carries `activeFrom`/`activeUntil` (done in Unit 4); TBA adds its webcast fields on top.
  - `webcasts` in wire response continues to be the merged list (no change).
  - `webcastsStale` is the canonical example of the "server computes staleness booleans, client displays them" pattern (R39 from brainstorm).
  - `tournament-streams-page.tsx` relative-time uses `minutesAgo()` from the skew module (already done in Unit 2).
- Perform: end-to-end ETag verification via curl once RavenBrain emits weak ETags; confirm 304 flows through Cloudflare. Document the command in `RavenBrain/doc/architecture.md`.

**Approach:**
- The TBA plan's file-level changes are already *implemented* by Units 1-4 (its cadences, its shared DTO fields are covered). When TBA resumes, its remaining units (webcast-specific table, sync service, UI work) sit on top with no conflict.
- Architecture docs are short (< 300 lines each). Reference sources rather than duplicating content.
- Curl verification is a gate on the Phase 8 completion — if 304 doesn't pass through once origin emits ETags, investigate Cloudflare Page Rules (most likely cause: a rule that re-fetches instead of serving 304).

**Patterns to follow:**
- Existing `RavenBrain/doc/architecture.md` structure.
- Existing `RavenEye/docs/` design-doc tone.

**Test scenarios:**
- Happy path (R35/R36): grep confirms no hardcoded `fixedDelay = "..."` literals in Java source.
- Happy path (R37): `curl -D - https://ravenbrain.team1310.ca/api/tournament` emits `ETag: W/"..."`; second curl with `If-None-Match` returns 304.
- Happy path (R38): `tournament-streams-page.tsx` does not reference `Date.now()` directly.
- Happy path (R39): `webcastsStale` remains server-computed per the TBA plan's existing design.
- Happy path (R40): any non-admin page that renders webcasts reads from IndexedDB (verify spot-check once TBA resumes).
- Happy path (R41): Flyway migrations in this plan use V34; TBA resume uses V35+.
- Documentation: both architecture docs are present, concise, and linked from the origin brainstorm.

**Verification:**
- `./gradlew test` passes.
- Grep: zero hardcoded `fixedDelay` literals in Java source.
- Curl gate: 304 passes through production for at least one cacheable endpoint.
- Both architecture docs exist and contain the required sections.

## System-Wide Impact

- **Interaction graph:**
  - `cacheFetch` becomes the single gateway for non-admin, non-public authenticated GETs. 401-retry (inside `rbfetch`) unchanged; 304-handling is new (inside `cacheFetch`).
  - `ServerTimeFilter`, `IfNoneMatchFilter`, and `RoleFingerprintFilter` apply to `/api/**` — every relevant response is affected.
  - The two-loop scheduler in `sync.ts` is the single driver for all background sync.
  - `TournamentService` returns timestamps used by both the direct API and (once resumed) the TBA-enriched response.
- **Error propagation:**
  - 304 is not an error; `cacheFetch` handles silently.
  - 401 handled by `rbfetch`'s existing refresh-retry.
  - 403 on pre-warm is silently dropped.
  - No mid-request abort machinery; responses to stale requests either no-op or land in stores that get re-evicted naturally.
- **State lifecycle:**
  - **In-memory skew offset** with 12h max-age; reverts to 0 if stale.
  - **Role fingerprint in sessionStorage** updated on mismatch detection.
  - **IndexedDB eviction** only on explicit logout or username change.
  - **Outbound tracking queue** never auto-evicted; explicit "discard pending events" variant of the clear button is the only non-sync path to emptying it.
- **API surface parity:**
  - Every cacheable GET gains weak ETag. Write endpoints unchanged.
  - `/api/tournament` gains `activeFrom`, `activeUntil` (additive).
  - `/api/config/client-sync` and `/api/config/client-sync/public` are new.
  - `/api/report/metadata` is new.
  - `X-RavenBrain-Time` header is new (universal).
  - `X-RavenBrain-Role-FP` header is new (authenticated-200 only; not CORS-exposed).
  - `/api/ping` body changes from text to JSON.
- **Integration coverage:**
  - End-to-end 304 through Cloudflare (Unit 9 curl gate).
  - Skew module must pass simulated-offset tests against JWT expiration (Unit 2).
  - Two-loop sync must preserve current upload-queue partial-success semantics (Unit 5).
  - Online indicator must not flap across captive-portal tests (Unit 8).
- **Unchanged invariants:**
  - Authentication flow, JWT issuance, refresh-token lifecycle, role-guard component behavior.
  - Upload-queue behavior for events, comments, alerts, strategy plans, drawings (partial-success preserved).
  - `RequireLogin`/`RequireRole` contracts.
  - CORS + CSP policies (except: new exposed headers — `X-RavenBrain-Time`, `ETag`).
  - Wire contract of every existing GET is additive.

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| Cloudflare rule changes later break weak-ETag passthrough. | R26 gate in Unit 9; curl-verifiable. Re-verification is one command; document in architecture doc. |
| `@Transactional(REPEATABLE_READ)` adds DB locking overhead. | Traffic is low; reads are the hot path; MySQL's InnoDB handles repeatable-read with MVCC (readers don't block writers). |
| Admin-table `updated_at` columns in V34 fail to backfill correctly. | Migration sets default to current timestamp; existing rows get current-time on migration apply. No correctness impact since reference data changes are rare. |
| Skew module's 12h max-age is too permissive under a genuinely bad injected value. | ±5 min clamp per update bounds single-update damage. 12h stays bounded because the JWT itself expires at 12h — beyond that the server-side 401 is the authority. |
| Captive-portal detection fails against a portal that also injects `X-RavenBrain-Version`. | Very unlikely (portals don't know about app-specific headers). If it happens, tighten to a stronger binding (HMAC nonce) as a follow-on. |
| `useConditionalFetch` was dropped but some rb.ts wrapper semantics change. | All migration happens inside rb.ts internals; public signatures unchanged; pages don't notice. |
| Role fingerprint collision across users (very rare with 12 hex chars). | 12-char SHA-256 prefix = 48 bits; collision probability for <10 role sets is effectively zero. Widen to 16 chars if field experience shows any false-match. |
| TBA plan resume conflicts with landed refinement. | TBA is halted awaiting this work; its shared-file changes are either already implemented (cadences, DTO fields) or don't overlap. Unit 9 stages the TBA plan document to reflect the landed state. |
| V34 migration conflicts with TBA plan's existing V30-V32 / V33 numbering. | V33 is latest in source; V34 is clear. TBA resume uses V35+. |
| IndexedDB quota exceeded on aging devices. | LRU-via-TTL eviction; on pre-warm write failure, evict oldest and retry; on on-open failure, surface to UI. iPhone 5 is explicitly accepted-degraded scope. |
| `/kiosk-pit` background sync for anonymous endpoint could DoS the public endpoint. | Same cadence as other sync jobs (30s); single request per tick; unauthenticated endpoint is rate-limit-tolerant by design. |
| 5s scheduler tick + 15s upload tick could burn battery on kiosk tablets. | 5s is 12 wakes/min vs. three current 3-min setIntervals; upload at 15s matches today. Net increase is modest. If field experience shows battery impact, increase sync tick to 10s. |

## Documentation / Operational Notes

- Architecture docs authored in Unit 9 (both repos).
- `RavenBrain/README.md` — note `raven-eye.sync.*` config block.
- No new env vars (no TBA/FRC key changes).
- Deployment on Hydra — `application.yml` restructure is pure-server.
- End-to-end 304 verification is a ship gate (Unit 9).
- Ship via `/kd-pr`; no direct pushes; no Claude attribution.
- Keep `RavenEye/docs/` in sync with any RavenEye-side code changes (standing convention).
- When TBA plan resumes, its author picks up the alignment noted in `RavenEye/docs/tba-data-foundation.md` (authored in Unit 9).

## Sources & References

- **Origin document:** `RavenEye/docs/brainstorms/2026-04-18-network-communication-refinement-requirements.md`
- **Related plan (halted, pending this work):** `RavenEye/docs/plans/2026-04-18-001-feat-tba-data-foundation-plan.md`
- **Related doc:** `RavenEye/docs/tba-data-foundation.md`
- **Related code — RavenBrain:**
  - `src/main/java/ca/team1310/ravenbrain/frcapi/fetch/FrcCachingClient.java`
  - `src/main/java/ca/team1310/ravenbrain/report/cache/ReportCacheService.java`
  - `src/main/java/ca/team1310/ravenbrain/tournament/TournamentService.java`
  - `src/main/resources/application.yml`
- **Related code — RavenEye:**
  - `app/common/storage/rbauth.ts`
  - `app/common/storage/rb.ts`
  - `app/common/sync/sync.ts`
  - `app/common/storage/networkHealth.ts`
- **External docs:**
  - [Micronaut 4.x HTTP Filters](https://docs.micronaut.io/latest/guide/index.html#filters)
  - [RFC 7232 §2.3 — weak vs. strong validators](https://www.rfc-editor.org/rfc/rfc7232#section-2.3)
  - [MDN If-None-Match](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/If-None-Match)
  - [MDN 304 Not Modified](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/304)
- **Cloudflare ETag passthrough verified:** 2026-04-19 against `https://raveneye.team1310.ca/assets/*.js` — weak ETags pass through, 304 honored end-to-end.
