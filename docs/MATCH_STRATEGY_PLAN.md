# Match Strategy Plan

## Overview

The Match Strategy Plan feature lets expert scouts prepare a strategy for each FRC match: a short summary, a longer strategy note, and hand-drawn diagrams on top of the FRC field showing where each of the 6 alliance robots should go during auto, defence, endgame, etc. Diagrams can be replayed at real-time or 2x speed so strategists can walk drivers through the plan.

This document is the canonical source of truth for the feature. Any change to the schema, API, sync logic, canvas, access rules, or field-image handling **must** be reflected back into this doc in the same change.

---

## Access Control

| Action | Roles |
|---|---|
| Create plan | EXPERTSCOUT, ADMIN, SUPERUSER |
| Edit plan / drawings | EXPERTSCOUT, ADMIN, SUPERUSER |
| View plan / drawings | EXPERTSCOUT, ADMIN, SUPERUSER |
| Delete drawing | EXPERTSCOUT, ADMIN, SUPERUSER |

All strategy routes on the frontend are wrapped in `<RequireRole roles={["EXPERTSCOUT", "ADMIN", "SUPERUSER"]}>`. All backend endpoints use `@Secured({"ROLE_EXPERTSCOUT", "ROLE_ADMIN", "ROLE_SUPERUSER"})`.

Pages open in **read-only mode** by default. The user clicks **Unlock** to enter edit mode. Locking is a UI guard only — there is no server-side edit lock.

---

## Data Model

### Plan (1 per match)

One row per `(tournament_id, match_level, match_number)`. Holds the summary and long strategy text. Drawings live in a separate table.

**Table: `RB_MATCH_STRATEGY_PLAN`**

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT AUTO_INCREMENT | PK |
| `tournament_id` | VARCHAR(127) | FK → `RB_TOURNAMENT.id` |
| `match_level` | VARCHAR(32) | Practice / Qualification / Playoff |
| `match_number` | INT | |
| `short_summary` | VARCHAR(32) | Max 32 chars, enforced in UI + column width |
| `strategy_text` | TEXT | Long-form strategy notes |
| `updated_by_user_id` | BIGINT | |
| `updated_by_display_name` | VARCHAR(255) | |
| `updated_at` | TIMESTAMP(3) | |

Unique constraint: `(tournament_id, match_level, match_number)`.

### Drawing (many per plan)

Each drawing is a named diagram (e.g. "Auto", "Defence", "Endgame") with a JSON blob of strokes.

**Table: `RB_MATCH_STRATEGY_DRAWING`**

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT AUTO_INCREMENT | PK |
| `plan_id` | BIGINT | FK → `RB_MATCH_STRATEGY_PLAN.id`, `ON DELETE CASCADE` |
| `label` | VARCHAR(64) | e.g. "Auto", "Defence" |
| `strokes` | LONGTEXT | JSON — see Stroke Format below |
| `created_by_user_id` | BIGINT | Stamped once at creation |
| `created_by_display_name` | VARCHAR(255) | Stamped once; preserved on update |
| `updated_by_user_id` | BIGINT | Refreshed on every save |
| `updated_by_display_name` | VARCHAR(255) | |
| `created_at` | TIMESTAMP(3) | |
| `updated_at` | TIMESTAMP(3) | |

### Stroke Format

`strokes` is a JSON array of stroke objects:

```ts
type StrategyStroke = {
  robotSlot: "R1" | "R2" | "R3" | "B1" | "B2" | "B3";
  colorIndex: number;  // index into ROBOT_COLORS
  points: { x: number; y: number; t: number }[];
};
```

- `x` and `y` are **normalized to 0..1** against the canvas bounds so drawings render at any resolution.
- `t` is **milliseconds since the stroke's pointerdown** — enables faithful real-time and 2x playback.

---

## Backend — RavenBrain

### Flyway migration

`src/main/resources/db/migration/V23__match_strategy_plan.sql` — creates both tables above. Charset `utf8mb4 COLLATE utf8mb4_unicode_ci`, `ENGINE=InnoDB`.

### Package `ca.team1310.ravenbrain.matchstrategy`

- **`MatchStrategyPlan`** (record, `@MappedEntity("RB_MATCH_STRATEGY_PLAN")`)
- **`MatchStrategyDrawing`** (record, `@MappedEntity("RB_MATCH_STRATEGY_DRAWING")`, `strokes` as `String`)
- **`MatchStrategyPlanService`** — `@JdbcRepository` extends `CrudRepository<MatchStrategyPlan, Long>`, adds `findByTournamentIdAndMatchLevelAndMatchNumber(...)`.
- **`MatchStrategyDrawingService`** — `@JdbcRepository` extends `CrudRepository<MatchStrategyDrawing, Long>`, adds `findAllByPlanIdOrderByCreatedAtAsc(long planId)`.
- **`MatchStrategyApi`** — controller at `/api/match-strategy`.

### Endpoints

All mounted on `/api/match-strategy` with `@Secured({"ROLE_EXPERTSCOUT", "ROLE_ADMIN", "ROLE_SUPERUSER"})`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/{tournamentId}` | List all plans for a tournament (drawings embedded) |
| `GET` | `/{tournamentId}/{level}/{matchNumber}` | Fetch a single plan + drawings, or 404 |
| `POST` | `/` | **Upsert plan**. Creates if missing (matched by the unique key), else updates fields. Last-write-wins. |
| `POST` | `/drawing` | **Upsert drawing**. Creates when `id == null`, else updates strokes/label. Creator fields stamped once on insert. Last-write-wins per drawing. |
| `DELETE` | `/drawing/{id}` | Delete a drawing |

### Auth extraction

Write endpoints take `Authentication authentication` as a parameter. Current user is resolved via `authentication.getName()` → `UserService.findByLogin()` to get `id` and `displayName`. The pattern matches `UserApi.me()`.

### Config-sync

The two new tables must be included in the truncation list in `ca.team1310.ravenbrain.sync` (config-sync UI). Strategy plans are **truncated only** during config-sync, never copied across instances — they are user-generated data specific to the target tournament.

---

## Frontend — RavenEye

### Types (`app/types/`)

- `MatchStrategyPlan.ts`
- `MatchStrategyDrawing.ts`
- `StrategyStroke.ts`

### IndexedDB (extend `app/common/storage/db.ts`)

`DB_VERSION` = 13. Three new object stores:

| Store | KeyPath | Purpose |
|---|---|---|
| `strategyPlans` | `localKey` (= `${tournamentId}\|${level}\|${matchNumber}`) | Mirror of server plans |
| `strategyPlansNew` | (out-of-line, keyed by `localKey`) | Dirty plans awaiting sync |
| `strategyDrawings` | `localId` (server id as string, or `new-${uuid}` before first sync) | All drawings with `dirty` flag + `planLocalKey` index |

Repository methods mirror the existing `captureEvent` / `getUnsynchronizedEvents` / `markEventSynchronized` triplet (see `db.ts` — event-log pattern).

### API wrappers (`app/common/storage/rb.ts`)

- `getStrategyPlansForTournament(tid)`
- `getStrategyPlan(tid, level, match)`
- `saveStrategyPlan(plan)` → returns server plan with id
- `saveStrategyDrawing(drawing)` → returns server drawing with id + timestamps
- `deleteStrategyDrawing(id)`

### Sync (`app/common/sync/sync.ts`)

New sync component `STRATEGY_PLANS`:

- `syncStrategyPlansUpload()` — push dirty plans, dirty drawings, and pending drawing deletions to the server. Called from `doManualSync()`, alongside `syncTrackingData`.
- `syncStrategyPlansDownload()` — pull server copies for active tournaments. Called from `doServerDataSync()`, alongside `syncMatchSchedule`.
- `useStrategyPlansSyncStatus()` hook; included in `useManualSyncStatus` aggregation.

### Routes (`app/routes.ts`)

| Path | Page |
|---|---|
| `/strategy` | Tournament selection (`routes/strategy/strategy-home-page.tsx`) |
| `/strategy/:tournamentId` | Match selection (`routes/strategy/strategy-matches-page.tsx`) |
| `/strategy/:tournamentId/:level/:matchNumber` | Plan editor (`routes/strategy/strategy-plan-page.tsx`) |

All three wrapped in `<RequireRole roles={["EXPERTSCOUT", "ADMIN", "SUPERUSER"]}>`.

A "Match Strategy" link is added to `routes/home-page.tsx`, shown only when `useRole()` reports `isExpertScout || isAdmin || isSuperuser`.

### Shared selection UI

Tournament + match selection reuses patterns from `app/common/track/` (`CompStart.tsx`, `MatchForm.tsx`, `useMatchSchedule()`). Strategy pages use thin wrappers that navigate to `/strategy/...` instead of touching the scouting-session session storage.

---

## Plan Editor UI

iPad-landscape optimized (1024×768 reference viewport):

- **Header** — match identifier, "LOCKED" badge, Unlock button (only visible if user has edit role), save-status indicator ("Saved locally" / "Syncing…" / "Synced to server").
- **Left column (narrow)** — Short Summary input (`maxLength=32`, live character counter), Strategy textarea, drawing list with labels + creator names, "+ New Drawing" button.
- **Right column (dominant)** — canvas with field background, robot-slot palette (6 swatches R1/R2/R3/B1/B2/B3 prefilled with team numbers from the schedule), tools: Clear, Undo, Play, Play 2×.

### Components (`app/common/strategy/`)

- `StrategyCanvas.tsx` — edit canvas
- `StrategyReadOnlyCanvas.tsx` — same renderer, no pointer capture
- `RobotSlotPalette.tsx` — 6 swatches with team numbers from `useMatchSchedule()`
- `DrawingList.tsx` — list + active selection + "+ New Drawing"
- `colors.ts` — `ROBOT_COLORS` palette
- `fieldImage.ts` — `fieldImageForYear(year)` helper

### Input handling

The canvas uses **HTML Pointer Events** (`pointerdown` / `pointermove` / `pointerup`), which unify:

- **Finger touch** (iPad, touch laptops)
- **Apple Pencil / stylus**
- **Mouse / trackpad**

All three input methods fire identical events, so a single code path handles all of them.

Implementation notes:
- `touch-action: none` CSS on the canvas so iOS Safari doesn't intercept drawing gestures as pan/zoom.
- `setPointerCapture()` on `pointerdown` so a stroke doesn't drop if the finger/pen strays slightly outside the canvas.
- Coordinates normalized to 0..1 against canvas bounding rect.
- `t` recorded as `performance.now() - strokeStartMs` per point.
- Rendered with quadratic-curve smoothing between points.

### Playback

The canvas exposes an imperative `play(speed: 1 | 2)` method that re-renders strokes point-by-point, honoring the recorded `t` deltas scaled by `1 / speed`, using `requestAnimationFrame`.

---

## Colorblind-Friendly Palette

`ROBOT_COLORS` is the Okabe-Ito-inspired palette:

| Slot | Index | Hex | Note |
|---|---|---|---|
| R1 | 0 | `#E69F00` | Orange |
| R2 | 1 | `#D55E00` | Vermillion |
| R3 | 2 | `#CC79A7` | Reddish purple |
| B1 | 3 | `#0072B2` | Blue |
| B2 | 4 | `#56B4E9` | Sky blue |
| B3 | 5 | `#009E73` | Bluish green |

Red-alliance slots lean warm; blue-alliance slots lean cool. All six are distinguishable under the common forms of color vision deficiency.

---

## Field Image Assets

Static PNGs shipped with the frontend under `app/assets/fields/`:

- `field-2026.png`, `field-2025.png`, … (per game year)
- `field-default.png` — neutral grid fallback used when a year-specific image isn't yet bundled

`fieldImageForYear(year: number): string` returns the URL for the matching image with a fallback to the default. Year is derived from `RBTournament.startTime` (existing `app/types/RBTournament.ts`).

To add a new year: drop `field-YYYY.png` into `app/assets/fields/` and update `fieldImage.ts`.

---

## Save & Sync Semantics

All edits write to IndexedDB first and mark the record dirty; the upload sync pushes dirty records to the server opportunistically.

| Trigger | Action |
|---|---|
| Short summary / strategy text keystroke | Debounced 500ms, write to IDB, mark plan dirty |
| Stroke completed (`pointerup`) | Write updated drawing blob to IDB, mark drawing dirty |
| "+ New Drawing" clicked | Insert drawing into IDB with `localId = new-${uuid}`, mark dirty |
| Drawing deleted | Record pending-delete in IDB; sync issues `DELETE` on next upload |
| Successful upload | Replace `localId` with server id, clear dirty flag, stamp `updatedAt` |

### Concurrency

- **Plan fields** (summary / strategy text) — last-write-wins. The server stamps `updated_at` and `updated_by_*` on every save.
- **Drawings** — each drawing is independent.
  - Two users creating drawings on the same plan concurrently: both succeed (separate rows).
  - Two users editing the same drawing concurrently: last save wins. The `created_by_*` fields are preserved from the original insert; `updated_by_*` reflects the most recent save.

Because the app is offline-first and WiFi at tournaments is unreliable, there is no distributed lock. The **Unlock** button is purely a local UI guard.

---

## Verification

See the implementation plan at `~/.claude/plans/declarative-stargazing-phoenix.md` for the full verification checklist. Quick summary:

- `cd RavenBrain && ./gradlew build && ./gradlew test --tests "ca.team1310.ravenbrain.matchstrategy.*"`
- `cd RavenEye && npm run typecheck && npm run build`
- Manual: log in as EXPERTSCOUT, create a plan, draw on each of the 6 robot slots, create a second drawing, play back at 1x and 2x, reload to confirm read-only, go offline and re-edit to confirm local save, come back online to confirm sync.
- Input matrix: finger on iPad, Apple Pencil, mouse on touchscreen laptop, trackpad — all should produce indistinguishable strokes.
