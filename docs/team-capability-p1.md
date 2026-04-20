---
title: "feat: Team Capability Rankings (P1)"
type: feat
status: active
date: 2026-04-19
---

# Team Capability Rankings (P1)

**Companion to:** [`docs/plans/2026-04-19-002-feat-team-capability-rankings-p1-plan.md`](plans/2026-04-19-002-feat-team-capability-rankings-p1-plan.md). The plan is the full decision record; this is the two-page skim for anyone landing on the code cold.

## Overview

P1 fuses three data sources into a single per-tournament capability view and renders it on the two pages strat reaches for most during an event. A **Tournament Teams card** at the bottom of the team-schedule page lists every team at the tournament (sortable, default OPR desc, click-through to team-summary). A **Match Teams table** at the top of the strategy page lists only the 6–8 teams in the current match, grouped by alliance, with within-alliance ranks in parentheses next to each numeric column. Both read from one new endpoint (`GET /api/team-capability/{tournamentId}`) that returns OPR (from TBA), per-phase EPA (from Statbotics), and scouting aggregates (from our own event-log / quick-comment / robot-alert surfaces). Consumers: strat team for pick-list reference during alliance selection and pre-match sizing; expanded visibility to DRIVE_TEAM on the Match Teams table.

## Data sources

- **TBA OPR** — Statbotics does not expose OPR and FRC exposes rankings only, so OPR comes from TBA's `/event/{key}/oprs`. Extends the existing `tbaapi` package with one new client method, one new model, and a new `RB_TBA_EVENT_OPRS` table (composite PK on `(tba_event_key, team_number)`). The existing TBA scheduled sync gains one additional call per active tournament.
- **Statbotics EPA with per-phase breakdown** — new `ca.team1310.ravenbrain.statboticsapi` package mirroring `tbaapi` exactly (`fetch` / `service` / `model` sub-packages). Statbotics is unauthenticated and exposes no conditional-request headers, so the caching client is **TTL-only** (no ETag / Last-Modified). Batch endpoint `/v3/team_events?event={key}&limit=1000` returns all ~80 teams for an event in a single call. Flat columns for the stable fields (`epa_total`, `epa_auto`, `epa_teleop`, `epa_endgame`, `epa_unitless`, `epa_norm`) plus a `breakdown_json` TEXT column for season-specific drill-down. Identified via `User-Agent: StratApp/<version> (+https://raveneye.team1310.ca)` per Statbotics' informal "please be nice" posture.
- **Scouting aggregates** — existing services, accessed in bulk. New `TournamentAggregatesService` batches the work currently done one-team-at-a-time by `CustomTournamentStatsService` into a single call that returns per-team rows for every team at a tournament. Pulls scoring averages (auto accuracy, teleop success rate, pickup average) from the event log and summary counts (quick-comment count, robot-alert count + max severity) from the admin surfaces.

## Component graph

```
┌────────────────────────────┐  1h    ┌────────────────────────────┐
│ StatboticsTeamEventSync    │───────▶│ Statbotics v3 REST         │
│ (scope: watched ∪ team-    │        │ GET /v3/team_events?event= │
│  owner ∩ active-window,    │        │   {key}&limit=1000         │
│  non-blank tba_event_key)  │        └────────────────────────────┘
└─────────────┬──────────────┘
              │ writes only
              ▼
┌────────────────────────────┐
│ RB_STATBOTICS_TEAM_EVENT   │
│ epa_* columns +            │
│ breakdown_json (8 KB cap)  │
└─────────────┬──────────────┘
              │                ┌────────────────────────────┐  1h    ┌──────────────────┐
              │                │ TbaEventSyncService (P0)   │───────▶│ TBA v3 REST      │
              │                │  + OPR call (new in P1)    │        │ /event/{k}/oprs  │
              │                └─────────────┬──────────────┘        └──────────────────┘
              │                              │ writes only
              │                              ▼
              │                ┌────────────────────────────┐
              │                │ RB_TBA_EVENT_OPRS          │
              │                └─────────────┬──────────────┘
              │                              │
              │  ┌───────────────────────────┘
              │  │
              ▼  ▼
┌───────────────────────────────────────────────────────────────┐
│ TeamCapabilityEnricher.enrich(tournamentId)  [pure read]      │
│   teams         = TeamTournamentService.findTeamsFor(id)      │
│   opr_by_team   = TbaEventOprsRepo.findByTbaEventKey(k)       │
│   sbx_by_team   = StatboticsTeamEventRepo.findByEventKey(k)   │
│   scout_by_team = TournamentAggregatesService.getAll(id)      │
│   → join in memory, compute staleness + coverage flags        │
└─────────────────────────────────┬─────────────────────────────┘
                                  ▼
┌───────────────────────────────────────────────────────────────┐
│ GET /api/team-capability/{tournamentId}   IS_AUTHENTICATED    │
│   backed by TeamCapabilityCache (invalidate on event-log      │
│   writes, Statbotics / OPR sync completions)                  │
└─────────────────────────────────┬─────────────────────────────┘
                                  │ cacheFetch (If-None-Match)
                                  ▼
┌───────────────────────────────────────────────────────────────┐
│ IndexedDB teamCapability store  (cleared by clearDataCaches)  │
└─────────────────────────────────┬─────────────────────────────┘
                                  ▼
┌───────────────────────────────────────────────────────────────┐
│ RavenEye                                                      │
│   /report/schedule/:tournamentId  → TournamentTeamsCard       │
│   /strategy/:id/:level/:match     → MatchTeamsTable           │
│                                     (6–8 teams, within-       │
│                                     alliance ranks, CB-safe)  │
└───────────────────────────────────────────────────────────────┘
```

## Response shape

`GET /api/team-capability/{tournamentId}` returns a list of `TeamCapabilityResponse`, one per team at the tournament:

- **Identity** — `teamNumber`, `teamName`, `withdrawn` (true when team is in `RB_TEAM_TOURNAMENT` but absent from the latest Statbotics roster sync).
- **TBA** — `opr?`, `oprStale` (server-computed from `last_status` / `last_sync`).
- **Statbotics** — `epaTotal?`, `epaAuto?`, `epaTeleop?`, `epaEndgame?`, `epaUnitless?`, `epaNorm?`, `epaStale` (same posture). `epaUnitless` / `epaNorm` included for cross-year cases but not rendered in v1.
- **Scouting** — `autoAccuracy?`, `teleopSuccessRate?`, `pickupAverage?`, `quickCommentCount`, `robotAlertCount`, `robotAlertMaxSeverity?`, `scoutingCoverage` (`"full"` / `"thin"` / `"none"`).

Missing data surfaces as `null` and renders as `—` in the UI with no rank. Staleness booleans are computed server-side; the client never derives them from timestamps.

## Key decisions

- **OPR from TBA, not Statbotics** — Statbotics has no OPR; FRC exposes rankings only. TBA plumbing is already in place from P0.
- **TTL-only Statbotics caching** — no ETag / Last-Modified observed. The cache-response table keeps those columns for structural parity with `RB_TBA_RESPONSES` but they stay NULL for every row.
- **5-minute force-sync guard** — `POST /api/statbotics-sync` rejects with 429 if a successful sync completed within the last five minutes. Hard-coded (no admin knob). Cheap protection against SUPERUSER-token spam against Statbotics' informal posture.
- **8 KB `breakdown_json` cap** — sync rejects responses where the blob exceeds the cap (`last_status = 422`, prior row preserved). Well above any real breakdown size in practice; guards against upstream expansion or a malicious proxy.
- **Event-log-only coverage classifier** — `scoutingCoverage` is `"full"` when all scoring averages are non-null, `"none"` when all are null and counts are zero, `"thin"` otherwise. Comment count is its own column and does **not** participate in the coverage classification — quantitative and qualitative coverage are different signals.
- **Within-alliance ranks with suppression** — the Match Teams table ranks 1–3 (or 1–4 for 4-team alliances) **within each alliance**, not 1–6 across both. Computed client-side. When an alliance has only one non-null value in a column, render without rank ("(1)" would imply best-of-three). When all alliance values in a column are equal, render all values without rank.
- **Withdrawn teams render strikethrough** — and sort last regardless of column direction. Detected by roster-vs-Statbotics diff; Statbotics drops withdrawn teams mid-event while TBA keeps them.
- **IDOR accepted at `IS_AUTHENTICATED`** — `GET /api/team-capability/{tournamentId}` is accessible to any authenticated user regardless of tournament ownership. Aggregate scouting signals for opposing teams are low-sensitivity for a student-team context; tournament scoping would add code without meaningful risk reduction. Recorded to prevent silent drift on revisit.
- **OPR-desc as arbitrary default sort** — strat uses both OPR and EPA. The default is a placeholder; first-tournament feedback revisits.
- **Disjoint writers invariant** — `statboticsapi` writes only to `RB_STATBOTICS_*`, `tbaapi` OPR writes only to `RB_TBA_EVENT_OPRS`, scouting surfaces are unchanged. The enricher is pure read. No shared write surface between external sync and admin CRUD.

## Operational notes

- **`POST /api/statbotics-sync`** — `ROLE_SUPERUSER`. Returns 202 on acquire, 409 if another sync is in flight (`AtomicBoolean` gate), 429 if the last successful sync was within 5 minutes. Force-sync path for tournament-day refreshes; no admin UI button.
- **`POST /api/tba-sync`** — existing P0 endpoint, unchanged response shape. Extended to additionally pull OPR under the same gate; OPR failure in a given tournament does not abort event-level sync.
- **Per-sync summary logs** — `"Statbotics sync: X tournaments, Y team-event rows written, Z failures"` and `"TBA OPR sync: X tournaments, Y team rows written, Z failures"`. Supports the adoption-measure-then-cut success criterion.
- **Rollout is safe to ship dark** — a tournament without a `tba_event_key` simply has no external sync and renders the card with scouting-only rows and `—` in OPR / EPA cells. Enabling per-tournament is an admin action (set `tba_event_key` via the P0 admin UI).
- **Deployment** — release via `/kd-pr`. RavenBrain PR merges first (V35 migration + packages + endpoint) and RavenEye PR follows (types + sync registration + components + page insertions). Off-season merge-order breakage is tolerable; enforce RB-before-RE during tournament season.

## What's not in P1

- **No admin force-sync UI** — curl-only, mirroring P0. Add a button if tournament-day lag becomes a real pain.
- **No `cacheFetch` migration** — the network-communication-refinement has fully landed on `main` and P1 adopts `cacheFetch`, the `JOBS` array sync scheduler, `tournamentWindow` helpers, and `clearDataCaches` directly.
- **No admin rate-limiting knob** — the 5-minute force-sync guard is a hard-coded constant. Making it configurable is deferred.
- **No season-wide EPA fetch** — `/v3/team_years` batching is P2 (season-arc visualization).
- **No partner-fit / synergy scoring** — P3 (R13). Per-phase EPA columns stay flat; coupling to `strategyarea` waits until weighted phase aggregation has a real consumer.

## Operational bookmark — thundering-herd watch

Event-log writes invalidate the `TeamCapabilityCache` so scouting aggregates reflect recent in-match entries. During active matches, 8–12 tablets running the 30-second `JOBS` cadence can hit the cold cache within the same sync tick. Report pages are consulted primarily between matches rather than during them, so the expected load is low and no rate-limiting or debouncing is implemented for v1. Revisit if slow `/api/team-capability` responses, request pile-ups, or timeouts during sync cycles appear in logs at a real tournament — natural remediations include a short post-invalidation debounce on the cache key or a stale-while-revalidate serve on the enricher. No code change until we see the signal.
