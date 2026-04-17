---
date: 2026-04-17
topic: team-capability-rankings
---

# Team Capability Rankings — Reducing Reliance on TBA + Statbotics

## Problem Frame

Team 1310's strat team currently jumps between three tools during a tournament: **RavenEye** (our own schedule, scouting, reports), **thebluealliance.com** (match livestream URLs, team metadata), and **statbotics.io** (EPA metrics for pick-list building). The split forces context-switching during the highest-pressure moments — alliance selection, pre-match opponent sizing, and in-season self-review.

RavenEye has the finer-grained scouting data neither external site can see (qualitative event logs, quick comments, robot alerts) but no cross-team view that surfaces it. The team has deliberately stopped scouting whatever TBA/Statbotics already capture, so the right answer is **fusion**, not reinvention: consume the public quantitative feeds, layer our qualitative scouting on top, and present the combined view inside RavenEye.

The endgame is to fold TBA/Statbotics into RavenEye so those sites become reference material, not primary tools, during tournaments.

## Roadmap

| Phase | Focus | Deliverable |
|---|---|---|
| P0 | TBA data foundation | Dedicated RB_TBA_* tables + sync; webcasts read from TBA first, manual entries override |
| P1 | Tournament Teams card | New card on team-schedule page ranking all teams at the tournament by Statbotics EPA + our scouting signals |
| P2 | Own-team season arc | 1310's per-phase EPA trajectory across the season on team-summary page |
| P3 | Pick-list intelligence | Partner-fit scoring, pick-list annotations, match win-probability predictions |

Each phase builds on the prior. P0 is ready to plan now; P1–P3 are scoped here for continuity but will get their own requirements docs when each is up next.

## Requirements

**TBA Data Foundation (P0)**
- R1. Introduce dedicated `RB_TBA_*` tables separate from existing RavenBrain schema so TBA data has clean provenance and room to grow alongside Statbotics.
- R2. Build a TBA API client mirroring the existing `FrcCachingClient` pattern (caching, error handling, auth via `X-TBA-Auth-Key` header).
- R3. Sync TBA data for tournaments RavenEye already tracks. Event-level sync is enough for P0 — match/team sync arrives in later phases.
- R4. Tournament webcasts shown in RavenEye read TBA-first, with manually-entered webcasts overriding TBA when present (escape hatch for tournament-day fixes).
- R5. Retain the existing admin UI for manual webcast entry; no functionality is removed in P0. The admin UI also indicates which source (`From TBA` vs `Manual override`) is currently active for each tournament so admins can spot staleness and confirm TBA coverage without editing.
- R5a. When TBA is unreachable, RavenBrain serves the last-known-good cached webcasts with a staleness indicator; RavenEye surfaces "data may be stale — last updated *X*" in any UI that renders TBA-sourced content. Applies to Statbotics in later phases by the same pattern.

**Tournament Teams Card (P1)**
- R6. Add a "Tournament Teams" card to the existing team-schedule page (not a new page) listing every team at the selected tournament.
- R7. Columns include Statbotics overall EPA, per-phase EPA breakdown (auto / teleop / endgame or current-season equivalents), and scouting-derived signals from our own data.
- R8. Sortable by any column. Each row links to the existing team-summary page for drill-down.
- R9. Works during active tournaments. The card re-reads from the local RavenBrain cache on the same cadence as the schedule card. Upstream Statbotics/TBA syncs run on a slower, cache-respecting schedule (mirroring the existing FRC caching pattern), so external-API rate limits are respected regardless of how many tablets are open.
- R10. Degrades gracefully when Statbotics has no data for a team (e.g. Week 1 events) and when our scouting coverage is thin.

**Own-Team Season Arc (P2)**
- R11. Add a season-arc visualization to the team-summary page for our own team: per-phase EPA trajectory across every event in the current season.

**Pick-List Intelligence (P3)**
- R13. Partner-fit / synergy scoring: predicted alliance EPA if 1310 paired with team X, surfaced in the Tournament Teams card.
- R14. Pick-list annotations: strat team can star teams and rank their own pick order; annotations persist per tournament.
- R15. Match win-probability predictions displayed on the team-schedule rows for upcoming matches.

## Success Criteria

- **P0**: Webcast URLs appear automatically on tournament pages for events TBA knows about; manual overrides still work; admin does not need to hand-enter webcasts for typical tournaments.
- **P1**: During the next in-person tournament after P1 ships, the strat team uses RavenEye's Tournament Teams card as the primary reference for pick-list building. TBA and Statbotics stay open only as cross-checks.
- **P2**: Coach can show 1310's season arc at an end-of-season review without exporting to another tool.
- **P3**: Strat team builds their alliance-selection pick list entirely inside RavenEye, including ranking and annotations.

## Scope Boundaries

- **Out of scope** for the entire initiative: TBA media galleries, awards, district/world-wide leaderboards, cross-season historical archives, event-insight pages for events we don't attend.
- **Out of scope** for P1: a dedicated pick-list hub (Approach B). The card-on-schedule model is the P1 answer; if it proves insufficient, the dedicated hub is revisited in P3.
- **Out of scope** for the whole initiative: computing our own EPA. Statbotics is the source of truth for quantitative per-phase metrics; our scouting supplements qualitatively.
- **Out of scope** for P0: matches, teams, team media, or any TBA data beyond what the webcast migration needs. Schema expansion happens per phase.

## Key Decisions

- **Dedicated RB_TBA_* layer over stuffing into existing tables**: keeps data source provenance explicit and gives room for Statbotics and other sources without tangling.
- **Manual webcast entries override TBA**: preserves the tournament-day escape hatch when TBA is stale or wrong.
- **Statbotics as the primary quantitative source; RavenEye scouting layers qualitative signals**: reflects the team's deliberate decision to stop scouting what public feeds already capture.
- **Approach A ("extend team-schedule page") over Approach B ("new pick-list hub") for P1**: lowest UI risk, fastest path to user value, and the underlying data layer supports a graduation to Approach B later if the card-on-schedule model proves insufficient.
- **Approach A over Approach C ("backend-first, UI later")**: visible value ships sooner; data-layer correctness is validated against a real UI rather than in isolation.
- **TBA sync runs as a new task inside the existing FRC sync orchestration** (`ca.team1310.ravenbrain.frcapi.service`), inheriting the same cadence rather than running on a separate scheduler.
- **CB-safe UI is a project-wide standing convention**, not a per-phase requirement: every new card, badge, chart, or status indicator must use the Paul Tol vibrant palette plus a redundant non-colour channel. Applies across P1–P3 without being restated per phase.

## Dependencies / Assumptions

- **TBA API key is a P0 prereq**. Tony will register at `thebluealliance.com/account` and add the key to RavenBrain config alongside existing `FRC_USER` / `FRC_KEY`.
- **Statbotics API is free and unauthenticated** for the metrics we need. Unverified — confirmed in planning.
- **Scouting coverage is "most/all teams"** at tournaments we attend. Rankings must still degrade gracefully for thin-coverage teams.
- **Existing `strategyarea` / `eventtype` data model does not currently carry an explicit per-phase column**. Planning decides whether to extend `strategyarea` codes by convention, add a phase column, or introduce a separate phase lookup table.
- **Hydra production server** already has the plumbing to hold another API key as an env var (established pattern).

## Outstanding Questions

### Resolve Before Planning

None — P0 is ready to plan.

### Deferred to Planning

**For P0 (resolve during `/ce:plan` for P0)**:
- [Affects R1][Technical] Detailed `RB_TBA_*` schema — minimal P0 shape is probably `RB_TBA_EVENT` (keyed by TBA event key, holds webcasts JSON), plus a raw-response cache table mirroring `RB_FRC_RESPONSES` for debuggability.
- [Affects R1, R3][Technical] Mapping from `RB_TOURNAMENT.id` to TBA event key — likely a new `tba_event_key` column on `RB_TOURNAMENT` (nullable, populated manually or derived from the existing FRC event code). Behaviour when unset: skip TBA sync and fall back to manual webcasts.
- [Affects R2][Needs research] TBA API v3 specifics — endpoint paths, rate limits, conditional-request (ETag / Last-Modified) support.
- [Affects R4, R5][Technical] Where do manually-entered webcasts live post-P0 — stay in `RB_TOURNAMENT.webcasts` (added in V21) with service-layer merge at read time, or migrate to a new override table with a `source='manual'|'tba'` discriminator? Includes behaviour for historical entries on prior-season tournaments.

**For future P1-P3 requirements docs (not blocking P0 planning)**:
- [Affects R6, R7][Needs research] Statbotics API capabilities for 2026 season — per-phase EPA breakdown availability, response shape, rate limits, and game-specific phase naming.
- [Affects R7][Product] Which scouting signals appear on the Tournament Teams card — quick-comment counts, robot-alert counts, average scoring/pickup events, or a composite? Strat team input needed before P1 requirements doc.
- [Affects R7][Technical] How "auto / tower / shooting / endgame" map to the existing `strategyarea` / `eventtype` model — reuse `strategyarea_id` groupings or introduce a phase-level concept.
- [Affects R10][Product] Empty-state and low-coverage UX matrix — defines what a row looks like for each of the four (Statbotics-present × scouting-coverage) combinations. Strat team input needed before P1 requirements doc.
- [Affects P3][Product] Does P3 need a dedicated pick-list page (Approach B) or does it extend the P1 Tournament Teams card? Reassess based on P1 adoption signals.

## Next Steps

-> `/ce:plan` for P0 implementation planning (TBA data layer + webcast migration)
