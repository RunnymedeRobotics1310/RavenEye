---
date: 2026-04-18
topic: network-communication-refinement
---

# Network Communication Refinement

## Problem Frame

StratApp operates at FRC competitions where venue WiFi is unreliable. The architecture is already offline-first in principle — RavenEye holds reference data in IndexedDB and queues scouting data for bulk upload — but four problems are eroding that premise, and this work is a broader refinement of the protocol layer (not merely cleanup):

1. **Initial app load is heavy.** Vite-hashed assets aren't served with long-lived cache headers and RavenBrain responses do not expose HTTP caching (no ETag / Last-Modified), so startup fetches fully re-download reference data on every visit even when nothing has changed. (Gzip is already enforced at the edge; brotli is not yet verified.)
2. **Some API payloads are large** (strategy-plan drawings, report aggregates, bulk schedule responses) and are re-sent in full on every sync because of the lack of conditional GET support.
3. **Scores, schedules, and match times can be up to ~3.5 minutes stale** at the client: RavenBrain polls FRC every 30s for scores, but RavenEye polls RavenBrain only every 3 min.
4. **The sync layer is accumulating complexity.** `sync.ts` is ~916 lines with three independent `setInterval` loops and ad-hoc per-component sync logic. Several non-admin, non-report pages (`/strategy/*`, `/programming/nt-keys`, `/kiosk-pit`) already issue direct fetches that bypass IndexedDB — silently eroding offline-first.

A fifth, forward-looking concern shapes this work too: as reports grow richer and more central to drive team workflow, we want report data to be as readily accessible as any other data the app holds. That motivates pulling reports into IndexedDB alongside scouting and reference data.

## Read-path model (before vs. after)

| Data category | Read path today | Read path after this work |
|---|---|---|
| Scouting reference (tournaments, strategy areas, event types, sequence types, team tournament IDs) | IndexedDB, background-synced | IndexedDB, background-synced (per-endpoint ETag/304, no consolidated bootstrap endpoint) |
| Match schedules & scores | IndexedDB, 3-min poll | IndexedDB, conditional poll on configurable cadence (default 30s) during tournament window; idle outside |
| Strategy plans & drawings | IndexedDB, 3-min poll | IndexedDB, conditional poll at the same cadence as schedules/scores during tournament window; idle outside |
| Robot alerts | IndexedDB, 3-min poll | IndexedDB, conditional poll at the same cadence during tournament window; idle outside |
| Reports (team, drill, sequence, mega, chrono, custom-stats, PMVA, robot-performance) | Direct fetch each page load, no client cache | IndexedDB; metadata on the same cadence as schedules/scores; bodies pre-warmed opportunistically + pulled on open; evicted on TTL, role change, or explicit user action |
| Admin screens (user mgmt, event/sequence/strategy-area admin, tournament config & webcast, field calibration, FRC/config-sync triggers, match videos, Nexus debug) | Direct fetch | Direct fetch (unchanged — the sole exception) |
| Online indicator | `/api/ping` every 30s | Derived from `lastOk` timestamp; piggybacks any qualifying successful response (≥15s cadence during tournament window) |

## Requirements

**Offline-First Unification**
- R1. All UI-facing data reads outside admin screens render from IndexedDB. No page component issues a direct fetch to RavenBrain to populate what it shows. Pages explicitly in scope: scouting/track pages, strategy pages under `/strategy/*`, the programming/telemetry page at `/programming/nt-keys`, the pit kiosk at `/kiosk-pit`, and all report pages.
- R2. Admin screens (user mgmt, event/sequence/strategy-area admin, tournament config & webcast, field calibration, FRC/config-sync triggers, match videos, Nexus debug) are the sole exception and continue to fetch directly.

**Reports in IndexedDB (hybrid sync)**
- R3. Reports remain server-computed. The client caches the computed result in IndexedDB; it does not compute reports in the browser.
- R4. Report *metadata* (identifier keys + version/`updatedAt`) syncs on the same cadence as schedules/scores while the tournament window is active.
- R5. Report *bodies* are pulled on first open for a given key, stored in IndexedDB, and re-pulled when the corresponding metadata version bumps.
- R6. During the tournament window, after startup or on window-became-active transition, RavenEye opportunistically pre-warms report bodies for the active tournament (those the user's role is authorized to see), to support offline reads on match floor. Pre-warm is low-priority and must not starve other sync work.
- R7. Report sync respects each endpoint's role gate. **RavenBrain is the authoritative enforcement point (returns 401/403 to unauthorized roles); the client-side role check is an optimization to avoid unnecessary requests, never a security boundary.**
- R8. Cached report bodies are evicted under any of: (a) a configurable time-to-live, default 60 days, configured in RavenBrain `application.yml`; (b) the user's role being removed/downgraded such that they no longer have access to that report; (c) explicit user-initiated cache clear.
- R9. The report-metadata version scheme is unified with RavenBrain's existing `ReportCacheService` / `RB_REPORT_CACHE` keying (e.g., `pmva:v5:`, `robot-perf:v4:`). If the existing per-key scheme is sufficient, reuse it and expose the version to the client via a metadata endpoint; if it is not, replace it with a single unified scheme used by both client and server. Do not maintain two parallel versioning mechanisms.

**Client-Side Cache Model**
- R10. RavenEye introduces a flexible, reusable client cache abstraction that wraps `rbfetch` and:
  - stores per-endpoint ETag / Last-Modified in IndexedDB
  - adds `If-None-Match` / `If-Modified-Since` on conditional GETs automatically
  - writes successful responses to a caller-supplied IndexedDB store
  - does not overwrite IndexedDB when the response is 304
  - accommodates new RavenBrain endpoints without per-caller bespoke wiring
- R11. All non-admin GETs from RavenEye to RavenBrain go through this abstraction.
- R12. A user-initiated **"Clear caches and log out"** control is available in the app. It is visible *only* when the outbound tracking queue (events, quick comments, robot alerts, strategy plans, strategy drawings) is empty — i.e., all scouting data has been synchronized. The control purges all IndexedDB stores and refresh tokens, ending the session cleanly.

**Sync Architecture Simplification**
- R13. Collapse RavenEye's background sync into a single `setInterval` in `sync.ts` that iterates an inline array of plain job descriptors. Each descriptor is a simple object with fields `id`, `cadenceMs`, `precondition`, and `run`. No new framework, no registry module, no scheduler abstraction.
- R14. Binary simplicity criteria (these replace the earlier "line count" metric):
  - `sync.ts` contains exactly one `setInterval`.
  - No page component under `app/routes/**` starts its own background *network* polling interval (page-local UI timers for countdowns or 1-second IndexedDB observers are allowed).
  - A new background sync job is added by appending one object to the in-file array, with no changes to the scheduler body.
- R15. The outbound upload queue (events, quick comments, robot alerts, strategy plans, strategy drawings) runs at the 15-second cadence. Strategy plan and drawing uploads, which historically ran on the 3-minute schedule loop, move to the 15-second cadence; to avoid POSTing mid-stroke, the upload step for a drawing is debounced when the drawing has been modified within the last ~3 seconds.

**Tournament Window as Shared Signal**
- R16. The concept of "active tournament" and "tournament window" are unified and server-owned. Tournament records carry `activeFrom`/`activeUntil` timestamps (stored or computed; planning decides) plus an `active` boolean reflecting the same window evaluated at query time.
- R17. The pre-window lead-in and post-window tail are configured in RavenBrain `application.yml`. **Defaults: `startDate − 12h` and `endDate + 10h`.** These replace the existing server-side `-24h` / `+4h` thresholds in `findUpcomingAndActiveTournaments()`. All callers of that query pick up the new thresholds; no split behavior.
- R18. All time-sensitive client behavior (background poll cadence, online-indicator cadence, job idling) keys off whether any tournament is currently within the window.

**Configurable Sync Cadences**
- R19. RavenBrain `application.yml` carries *both* coordinated cadences in the same configuration block (under a `sync` key or similar):
  - RavenBrain→FRC poll interval (currently 30s for scores)
  - RavenEye→RavenBrain poll interval (new; default 30s during tournament window)
  - Pre-window lead-in and post-window tail (R17)
  - Report body TTL (R8)
- R20. RavenEye receives its sync cadences from the server (delivered as part of an existing response or a dedicated lightweight config endpoint — planning chooses the vehicle). Client-side cadence constants are not hard-coded. There is one source of truth.

**Freshness**
- R21. Scores, schedules, strategy plans, robot alerts, and report metadata all refresh at the configured RavenEye→RavenBrain cadence (default 30s) during the tournament window. Outside the window, these jobs idle.

**Clock Skew Tolerance**
- R22. RavenEye introduces a centralized clock-skew tolerance module. **No equivalent exists today; `Date.now()` is used raw in 15+ places including JWT expiration checks.**
- R23. RavenBrain emits its own timestamp in a known response header (e.g., `X-RavenBrain-Time`) on every response. RavenEye computes and retains a client-server offset from this signal and uses it for all time-sensitive computations (JWT expiration checks, tournament-window membership computed from `activeFrom`/`activeUntil`, any display of "N minutes ago", `lastOk` comparisons). `Date.now()` is not called directly outside this module for time-sensitive decisions.

**Role Refresh and Downgrade**
- R24. While the tournament window is active, RavenEye re-validates the user's session (including roles) on a cadence appropriate to the sync config (e.g., every few minutes or on a successful response carrying role info). On role change:
  - Roles in sessionStorage are updated.
  - IndexedDB caches of data the user is no longer authorized to see are evicted.
  - The outbound tracking queue is **not** touched (never lose in-progress scouting data to a role change).

**HTTP Hygiene**
- R25. All RavenBrain GET endpoints that return cacheable reference, schedule, report, or report-metadata data support `ETag`/`If-None-Match` (and/or `Last-Modified`/`If-Modified-Since`) and return HTTP 304 when content is unchanged. Broad coverage is intentional: the centralized client cache (R10) makes the marginal cost per endpoint low.
- R26. The 304-on-routine-polls behavior is verified end-to-end through Cloudflare / Nginx against the production RavenBrain URL before this work is considered complete. An automated health-check or documented manual verification suffices.
- R27. As a supplement to HTTP caching (not a replacement), RavenBrain retains/extends its server-side response cache (`ReportCacheService`/`RB_REPORT_CACHE` and its equivalents) so cache-hit behavior is robust even when the edge layer misbehaves.
- R28. `Cache-Control: public, max-age=<long>, immutable` (or equivalent long-lived directive) is served on Vite-hashed static assets.
- R29. Brotli compression support is verified during planning; gzip is already in place at the edge.

**Online Indicator**
- R30. The online-status indicator refreshes at least every 15 seconds while the tournament window is active.
- R31. A qualifying successful RavenBrain response counts as a liveness signal. "Qualifying" means: HTTP 200, **Content-Type `application/json`**, path matching `/api/*`. This prevents captive-portal HTML 200s from spoofing liveness.
- R32. The client tracks `lastOk` from R31 and derives the online-status indicator from it. A fallback ping is issued only when no qualifying successful response has landed within the required 15-second window; if any other API call satisfies the requirement, no ping fires. The design goal is **no pointless network calls**.

**Documentation**
- R33. The rejection of WebSockets / SSE / any server-push mechanism is recorded in `RavenBrain/doc/architecture.md` and in a RavenEye architecture document under `RavenEye/docs/`. The recorded rationale is servlet-mode architectural simplicity and student-contributor readability — not claims about flaky-WiFi resilience (that argument is contested and should not be used as justification).
- R34. The data-source authority is recorded in the same architecture docs: FRC API is authoritative for scores and schedules; TBA and Statbotics are designated as the sources for derived analytics, match data, and statistics. TBA integration proceeds on its existing track (see `RavenEye/docs/plans/2026-04-18-001-feat-tba-data-foundation-plan.md` and `RavenEye/docs/tba-data-foundation.md`); Statbotics integration is planned for later and is not implemented here.

**TBA Plan Alignment**

The TBA Data Foundation plan (`RavenEye/docs/tba-data-foundation.md`, status `active`, dated 2026-04-18) was authored in parallel with this refinement. Its architecture is compatible with the standards set here, but the following alignment items must be applied — either during the TBA plan's own implementation or as a follow-on PR before this refinement ships — so the two efforts produce one coherent system rather than two.

- R35. `TbaEventSyncService`'s sync cadence — currently `@Scheduled(fixedDelay = "1h")` — is driven by the unified `sync` config block (R19). The annotation reads its interval from config; no hard-coded cadence remains in Java source.
- R36. The TBA cache TTL and stale-threshold configuration (`raven-eye.tba-api.ttl-seconds`, `raven-eye.tba-api.stale-threshold-minutes`) are consolidated into — or mirrored under — the unified `sync` config block per R19, keeping all cadence-related knobs in one place. The TBA plan's documented invariant `stale-threshold ≥ 1.5 × cadence` is validated at application startup.
- R37. `GET /api/tournament`, enriched with `webcastsFromTba`, `webcastsLastSync`, and `webcastsStale` per the TBA plan, inherits `ETag` / `If-None-Match` support from R25 without TBA-plan-specific wiring. The enriched response body is the ETag input.
- R38. Relative-time displays in `tournament-streams-page.tsx` (e.g., "Webcast data last synced 2h ago") are computed through the centralized clock-skew-tolerance module from R22-R23. This covers the pre-existing "N minutes ago" rendering (currently line ~45) as well as any new TBA-added staleness text. Raw `Date.now()` in time-sensitive display code is not allowed once the skew module lands.
- R39. `webcastsStale` is a server-computed flag, which is the TBA plan's design and establishes the preferred pattern for this project: **the server computes staleness booleans, the client displays them.** Future staleness/freshness indicators follow this shape rather than comparing server timestamps to local `Date.now()` on the client.
- R40. Any non-admin page that renders webcasts (the TBA plan flags `schedule-page.tsx` and any tournament-summary render as spot-check items) reads the enriched tournament record from IndexedDB per R1. The TBA-enriched fields flow through existing tournament sync — no new client code path is introduced for non-admin webcast rendering.
- R41. Flyway migration numbering: the TBA plan uses V30-V32. Any schema migration added by this refinement (only likely candidate: stored `activeFrom`/`activeUntil` columns, if planning R16 chooses the stored option over computed) starts at V33 or later and is coordinated with the TBA plan's merge status.

## Success Criteria

- No UI read path outside admin screens bypasses IndexedDB. `/strategy/*`, `/programming/nt-keys`, and `/kiosk-pit` read from IndexedDB like other non-admin pages.
- A user viewing the match schedule or scoreboard sees score and schedule changes within the configured cadence (default 30s) during the tournament window.
- Routine background polls return HTTP 304 when the underlying data has not changed, verified end-to-end through the production proxy.
- The online indicator never goes more than 15 seconds without refreshing during the tournament window, and no dedicated ping fires when any qualifying API call has already satisfied liveness in the window.
- `sync.ts` meets the binary criteria in R14: exactly one `setInterval`, no page-level network-polling intervals, new jobs added by appending to an inline array.
- Reports the user has permission to see are available offline on match floor for the active tournament, either because they were pre-warmed or because they were previously opened online.
- The "Clear caches and log out" control is discoverable and visible only when the tracking queue is empty.
- Clock-skew tolerance is exercised by a test that simulates a ±10-minute device clock offset and verifies that tournament-window membership and JWT expiration both behave correctly.

## Scope Boundaries

- **WebSockets, SSE, and any server-push mechanism are rejected and out of scope.** (See R33.)
- **Image optimization (WebP/AVIF, lazy-loading, explicit dimensions) is out of scope for this work** and tracked as a separate future improvement not attached to this refinement.
- **Consolidated `/api/bootstrap` endpoint is out of scope.** With per-endpoint conditional GETs (R25), the startup cost of parallel requests is dominated by 304s; a combined endpoint adds complexity without meaningful win.
- **Statbotics integration is out of scope.** The architecture must allow adding it later as a derived-data source.
- **Core TBA architecture changes are out of scope.** The TBA Data Foundation plan (`RavenEye/docs/tba-data-foundation.md`) owns TBA's data model, read path, and admin UX. This refinement *adjusts how the TBA plan integrates with the system* (see R35-R41) but does not redesign its tables, sync service, or response shape.
- **Admin screens** remain direct-fetch; no offline capability is added to them.
- **Authentication flow** (JWT issuance, refresh token lifecycle, role-guard components) is not redesigned. Role-refresh (R24) and skew-tolerance (R22-R23) sit alongside it, not inside it.
- **Telemetry endpoints** (`/api/telemetry/*`) are not part of this work.
- **Match video playback / ingestion** is not part of this work.
- **Report computation changes** are out of scope. Reports keep their current server-side implementation; only delivery, caching, and eviction change.
- **Lint/architectural guard to enforce the admin carve-out** is not specified here; kept as a discipline boundary.

## Key Decisions

- **Polling with conditional requests, not server-push.** Rationale: servlet-mode architectural simplicity and student-contributor readability. (The "degrades more gracefully on flaky WiFi" argument is contested and is not used as justification.)
- **Reports live in IndexedDB via hybrid sync (metadata continuous, bodies pre-warmed + pulled on open, TTL-evicted).** Chosen over lazy-only or eager-only: balances freshness, offline robustness for match-floor reads, and IndexedDB quota discipline. Accepts the strategic direction that reports should become as readily accessible as other app data.
- **No `/api/bootstrap` endpoint.** With ETag/304 on the existing per-endpoint calls plus HTTP/2 connection reuse, a consolidated endpoint does not justify its complexity.
- **Server owns "tournament window."** `activeFrom`/`activeUntil` fields returned to the client so the data is visible (reduces mystery) rather than a single opaque `active` boolean. Defaults `-12h` / `+10h`, configurable in `application.yml`, replace the existing `-24h` / `+4h` thresholds across all server callers.
- **Both sync cadences (FRC→RavenBrain and RavenBrain→RavenEye) live in one `application.yml` block.** Client receives its cadence from the server. One source of truth.
- **Single inline array of job descriptors in `sync.ts`.** Deliberately *not* a registry or scheduler framework. Plain data + one `setInterval` is readable by students and adequate for the number of jobs we have.
- **Binary simplicity criteria, not line-count.** Measures the actual architectural property we care about.
- **Strategy plan/drawing uploads accelerate to 15s** alongside events and quick comments. Debounced when a drawing has been modified in the last ~3 seconds to avoid POSTing mid-stroke.
- **Centralized client-side cache abstraction** (R10-R11) becomes the uniform shape for future RavenBrain endpoints. No per-endpoint cache wiring.
- **Server-side response cache stays** (R27) so we're resilient if the edge layer ever strips/mangles ETags.
- **Centralized clock-skew tolerance** with server-provided timestamp. This is *new* code — no existing centralization.
- **Role refresh during the tournament window** (R24). Cached data the user no longer has rights to is purged on role change; tracking queue is never disturbed.

## Dependencies / Assumptions

- Cloudflare + Nginx preserve `ETag` / `If-None-Match` end-to-end once RavenBrain emits them. Initial verification (2026-04-18) confirmed gzip is enforced at the edge; ETag passthrough cannot be tested until RavenBrain emits them. R26 requires re-verification as part of delivery.
- Micronaut 4.x servlet mode can configure ETag responses on controller return values or via a response-writing filter. (Mechanism selected during planning.)
- Adding report bodies to IndexedDB fits within device quota for users on supported mainstream devices. iPhone 5 is acknowledged as an edge case; we accept degraded experience there rather than capping the cache.
- The existing `RB_REPORT_CACHE` cache-key format can be exposed (or an equivalent `updatedAt` derived) for use as the report-metadata version (R9). If not, planning designs a unified replacement.
- `RB_TOURNAMENT` has `startDate`/`endDate` (or equivalent) columns sufficient to compute `activeFrom`/`activeUntil` at query time. Whether they are stored or computed is a planning choice.
- The outbound tracking queue continues to handle per-record partial success. Accelerating strategy plan/drawing uploads to 15s inherits that behavior without change to the server-side `/api/match-strategy` endpoints.
- The TBA Data Foundation plan (`RavenEye/docs/tba-data-foundation.md`, status `active`) is assumed to be coordinated with this refinement. R35-R41 capture the specific alignment items the TBA plan needs to pick up; they can be applied during the TBA plan's implementation or as a targeted follow-on PR. If the TBA plan has already merged by the time this refinement is planned, R35-R41 become a discrete cleanup step.

## Outstanding Questions

### Resolve Before Planning
*(none — remaining items are implementation choices suitable for `/ce:plan`)*

### Deferred to Planning
- [Affects R9][Technical] Does the existing `ReportCacheService` per-key scheme (e.g., `pmva:v5:`) fully support exposing a version/`updatedAt` for client-side metadata sync, or does it need a new column tracking last-invalidation timestamp per cache key?
- [Affects R10, R11][Technical] Shape of the client cache abstraction — a thin wrapper around `rbfetch` that the existing storage layer (`app/common/storage/rb.ts`) delegates to, vs. replacing `rb.ts` call sites incrementally. Recommendation: wrap `rbfetch` so individual callers don't change.
- [Affects R16, R17][Technical] Whether to store `activeFrom`/`activeUntil` as columns (needs Flyway migration) or compute them at query time from `startDate`/`endDate` and the configured lead/tail. Computed is simpler; stored lets planning cache.
- [Affects R17][Technical] Full enumeration of server callers of `findUpcomingAndActiveTournaments()` to confirm all pick up the new thresholds without regression.
- [Affects R19, R20][Technical] Vehicle for delivering sync cadences from server to client: a dedicated `/api/config/client` endpoint, or piggyback onto an existing early-startup response. Recommendation: dedicated endpoint, cacheable with ETag like everything else.
- [Affects R22, R23][Technical] Which header name for server time (`X-RavenBrain-Time`?). Micronaut filter vs. per-controller; planning picks.
- [Affects R24][Technical] Role-refresh vehicle — extend `/api/validate`, add a dedicated endpoint, or piggyback roles onto every response. Recommendation: piggyback current roles in a response header on authenticated requests (cheap, universal).
- [Affects R6][Technical] Pre-warm pacing — one body per metadata-sync tick until caught up, or a single burst on window-transition. Planning picks based on IndexedDB write performance.
- [Affects R25, R29][Needs research] Brotli support in Micronaut 4.x servlet mode vs. terminating compression at the edge (already happening for gzip).

## Next Steps

-> `/ce:plan` for structured implementation planning.
