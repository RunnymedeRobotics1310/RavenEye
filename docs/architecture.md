# RavenEye Architecture

Companion to `RavenBrain/doc/architecture.md`. This document describes the client-side
half of the system — how RavenEye stores, reads, and synchronizes data. For REST-endpoint,
caching, and server-timer details see the RavenBrain architecture doc.

## System Context

RavenEye is a React SPA (React 19, React Router 7 in framework mode, client-side only) built
with Vite 7. It talks to exactly one backend — RavenBrain. Track pages are designed to work
offline after an initial sync; report and admin pages generally assume connectivity.

## Design Posture (Unit 9, network-communication-refinement)

The refinement captured in
[`docs/brainstorms/2026-04-18-network-communication-refinement-requirements.md`](brainstorms/2026-04-18-network-communication-refinement-requirements.md)
and
[`docs/plans/2026-04-19-001-feat-network-communication-refinement-plan.md`](plans/2026-04-19-001-feat-network-communication-refinement-plan.md)
established these standing rules. Every change to the client-server boundary should
maintain them.

### Server-push is rejected

No WebSockets, no SSE, no server-push mechanism of any kind. Rationale: servlet-mode
architectural simplicity and student-contributor readability. (The "degrades gracefully on
flaky WiFi" argument is contested and is deliberately not used as justification — polling
with staggered jitter degrades at least as well, and reconnect storms on a push design are
not an improvement at a tournament.)

### Offline-first reads go through IndexedDB, except admin screens

Every non-admin page reads its data from IndexedDB. Background sync keeps IndexedDB fresh
from the server. If a page component issues a direct `fetch` / `rbfetch` to populate what
it renders, it's either an admin page (user management, event/sequence/strategy-area admin,
tournament config, field calibration, FRC/config-sync triggers, match videos, Nexus debug)
or it's a bug against this posture.

Two narrow exceptions that stay on raw `fetch()` because the endpoints are anonymous:
`getActiveTeamTournaments()` and the public team-schedule pass-through. The kiosk-pit and
home-page displays that use them accept network-required behavior for that specific call.

### Conditional GETs with weak ETags

`app/common/storage/cacheFetch.ts` wraps `rbfetch` and issues conditional requests. The
server emits a weak `ETag`; `cacheFetch` sends `If-None-Match` on the next call and returns
a parsed body without re-parsing on 304. ETags are persisted per-URL in the `apiEtags`
IndexedDB store along with the parsed body so 304 responses can serve from cache without
forcing every caller to maintain its own fallback.

The 401-refresh-retry inside `rbfetch` is unchanged; `cacheFetch` only sees the
post-refresh response. Write endpoints and anonymous endpoints bypass the cache layer.

### Clock-skew tolerance is centralized

`app/common/storage/serverTime.ts` maintains a bounded client-server clock offset using the
`X-RavenBrain-Time` header emitted on every response. `serverNow()` is used instead of
`Date.now()` anywhere a client-side timestamp is compared against a server-emitted one —
JWT expiration checks in `rbauth.ts`, "N minutes ago" renders in
`tournament-streams-page.tsx`, tournament-window membership via `tournamentWindow.ts`.
`Date.now()` continues to drive local UI timers (countdowns, drill timeouts, draw-tool
persistence) where clock skew is irrelevant.

Clamp and max-age rules are in the module's top comment. The short version: bounded single
updates (±5 min) and a last-good TTL (12 h) matching the JWT access-token lifetime.

### Server owns the tournament window

`TournamentResponse.activeFrom` and `activeUntil` are computed server-side from start/end
plus the configured lead/tail. The client derives `active` locally via `serverNow()` rather
than storing a server-emitted boolean. This avoids an ETag mismatch where a tournament's
`active` status flips mid-window but no row has been modified, so the ETag would be stale
and the client would keep showing the old value.

### Two-loop sync scheduler

`app/common/sync/sync.ts` drives exactly two `setInterval` loops:

- **Upload loop, 15s.** Drains the outbound tracking queues (events, quick comments, robot
  alerts, strategy plans). Offline-first priority — never blocked by a slow reference-data
  fetch.
- **Sync loop, 5s tick.** Walks an inline `JOBS` array. Each descriptor declares cadence,
  precondition, run. Adding a new sync is one entry in the array. Cadences default to 30s
  inside the tournament window and idle outside it via preconditions.

### Online indicator is derived, not polled

`app/common/storage/networkHealth.ts` tracks a `lastOk` timestamp updated on every
qualifying response (HTTP 200, `Content-Type: application/json`, `/api/*` path,
`X-RavenBrain-Version` header present, non-empty JSON body; and for `/api/ping` specifically
a body shape of `{pong: true, version: string}`). In steady state, no dedicated pings fire
— the indicator rides real traffic. A fallback ping runs only when `lastOk` ages beyond 15s.
Captive portals returning 200 text/html or generic JSON blobs fail the qualifier and leave
the indicator offline, correctly.

### Cache lifecycle on identity boundaries

Read-only caches (ETags, reference data, report metadata/bodies, strategy plans) are wiped
on explicit logout and on a same-device login that produces a different username. Outbound
tracking queues are preserved across both events so a scout who accidentally logs out on a
bad-WiFi day does not lose captured events. The dedicated "Clear caches and log out
(discard pending events)" UI is future polish; the `clearDataCaches()` helper that backs it
already exists in `app/common/storage/cacheClear.ts`.

### Role-change detection via fingerprint

`X-RavenBrain-Role-FP` (first 12 hex chars of SHA-256 over the user's sorted role list) is
emitted by RavenBrain on 200 authenticated responses and is *not* CORS-exposed — browser
JS in the RavenEye origin cannot read it, so an XSS payload in this origin cannot harvest
role data. `doRbFetch` tracks the fingerprint in sessionStorage and fires an async
`/api/validate` when it changes mid-session so `useRole()` subscribers can recompute.

## Data-Source Authority (mirrored from RavenBrain/doc/architecture.md)

- **FRC API is authoritative** for match scores and schedules.
- **TBA is the source** for derived event data (webcasts today, more over time). See
  [`docs/tba-data-foundation.md`](tba-data-foundation.md).
- **Statbotics** is designated for quantitative analytics and statistics. Not yet
  integrated; the architecture does not preclude adding it.

## File Layout Quick Reference

| Concern | File |
|---|---|
| JWT auth, rbfetch, 401 retry | `app/common/storage/rbauth.ts` |
| API wrappers (typed per-endpoint functions + hooks) | `app/common/storage/rb.ts` |
| IndexedDB repository | `app/common/storage/db.ts` |
| Conditional GET abstraction | `app/common/storage/cacheFetch.ts` |
| Sync cadence config (server-delivered) | `app/common/storage/syncConfig.ts` |
| Clock-skew tolerance | `app/common/storage/serverTime.ts` |
| Tournament-window helpers | `app/common/storage/tournamentWindow.ts` |
| Online-indicator state | `app/common/storage/networkHealth.ts` |
| Cache-clear on logout / username change | `app/common/storage/cacheClear.ts` |
| Report metadata + body cache | `app/common/storage/reportCache.ts` |
| Sync scheduler and JOBS array | `app/common/sync/sync.ts` |
| Report sync (metadata, pre-warm, TTL eviction) | `app/common/sync/reportSync.ts` |
