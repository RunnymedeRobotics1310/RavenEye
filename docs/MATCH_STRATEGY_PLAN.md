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
| View plan / drawings (read-only) | DRIVE_TEAM, EXPERTSCOUT, ADMIN, SUPERUSER |
| Delete drawing | EXPERTSCOUT, ADMIN, SUPERUSER |

Frontend strategy routes use `<RequireRole roles={["MEMBER", "DATASCOUT", "DRIVE_TEAM", "EXPERTSCOUT", "ADMIN", "SUPERUSER"]}>`. Backend GET endpoints use `@Secured({"ROLE_DRIVE_TEAM", "ROLE_EXPERTSCOUT", "ROLE_ADMIN", "ROLE_SUPERUSER"})`. Write endpoints (POST/DELETE) use `@Secured({"ROLE_EXPERTSCOUT", "ROLE_ADMIN", "ROLE_SUPERUSER"})`.

Pages open in **read-only mode** by default. The user clicks **Unlock** to enter edit mode. Locking is a UI guard only — there is no server-side edit lock.

> **Pre-launch only:** The "Match Strategy" nav link on the home page is temporarily hidden from scouts — only `DRIVE_TEAM`, `ADMIN`, and `SUPERUSER` see it (see `routes/home-page.tsx` — the `canStrategize` check). The routes themselves remain open via direct URL. This restriction must be reverted to include `roles.isExpertScout` before launch.

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
  arrow?: boolean;     // true → arrowhead at tip, false → plain line
};
```

- `x` and `y` are **normalized to 0..1** against the **canvas/field**, which always has the same aspect ratio as the field background image. This keeps strokes aligned with the image under any window size — no letterbox drift.
- `t` is **milliseconds since the stroke's pointerdown** — enables faithful real-time and 2x playback.
- `arrow` controls the stroke's rendering style. If absent (strokes saved before this field existed), the stroke is treated as **arrow = true** for backward compatibility.

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

All mounted on `/api/match-strategy`. GET endpoints allow `ROLE_DRIVE_TEAM`, `ROLE_EXPERTSCOUT`, `ROLE_ADMIN`, `ROLE_SUPERUSER`. Write endpoints (POST/DELETE) allow `ROLE_EXPERTSCOUT`, `ROLE_ADMIN`, `ROLE_SUPERUSER`.

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

Strategy plans and drawings are treated as scouting data by the config-sync UI:
- **Source endpoint** `GET /api/config-sync/scouting-data` includes `plans` + `drawings` alongside `events`, `comments`, `alerts`.
- **Target service** truncates `RB_MATCH_STRATEGY_DRAWING` + `RB_MATCH_STRATEGY_PLAN` (in that order — drawings → plans to respect the FK) when `clearExistingScoutingData=true`, then inserts rows from the source payload with preserved IDs. Plans are inserted before drawings. When tournaments are also being cleared, the two strategy tables are truncated before `RB_SCHEDULE` and `RB_TOURNAMENT`.
- `SyncResult` now carries `matchStrategyPlans` + `matchStrategyDrawings` counts; the config-sync admin UI displays these alongside the other scouting-data counts.

---

## Frontend — RavenEye

### Types (`app/types/`)

- `MatchStrategyPlan.ts`
- `MatchStrategyDrawing.ts`
- `StrategyStroke.ts`

### IndexedDB (extend `app/common/storage/db.ts`)

`DB_VERSION` = 13. Two new object stores:

| Store | KeyPath | Purpose |
|---|---|---|
| `strategyPlans` | `localKey` (= `${tournamentId}\|${level}\|${matchNumber}`) | All plans, each with a `dirty` flag |
| `strategyDrawings` | `localId` (`srv-${serverId}` once synced, `new-${uuid}` before first sync) | All drawings, each with a `dirty` flag and a `pendingDelete` flag; `planLocalKey` index for lookup by match |

Each record carries its own `dirty` flag rather than a separate "new" store — the upload-sync pass finds dirty records and pushes them; after a successful save the record is rewritten with `dirty = false` (and for drawings, the `localId` is renamed from `new-${uuid}` to `srv-${serverId}`). A `pendingDelete` flag on drawings defers server deletion until the next sync.

Repository methods: `putStrategyPlan`, `getStrategyPlan`, `getStrategyPlansForTournament`, `getDirtyStrategyPlans`, `putStrategyDrawing`, `getStrategyDrawing`, `getStrategyDrawingsForPlan`, `getDirtyStrategyDrawings`, `getPendingDeleteStrategyDrawings`, `deleteStrategyDrawingLocal`, `renameStrategyDrawing`.

### API wrappers (`app/common/storage/rb.ts`)

- `getStrategyPlansForTournament(tid)`
- `getStrategyPlan(tid, level, match)`
- `saveStrategyPlan(plan)` → returns server plan with id
- `saveStrategyDrawing(drawing)` → returns server drawing with id + timestamps
- `deleteStrategyDrawing(id)`

### Sync (`app/common/sync/sync.ts`)

New sync component `STRATEGY_PLANS`:

- `syncStrategyPlans()` — single entry point that first **uploads** pending deletions, dirty plans, and dirty drawings, then **downloads** server copies for active tournaments (without overwriting locally-dirty records). Both directions share one `STRATEGY_PLANS` sync-status row.
- **Triggers** (consistent with the rest of the app — *no* per-edit push):
  - Called from `doManualSync()` alongside `syncTrackingData` when the user taps **Sync Now**.
  - Called every 3 minutes from `initializeSyncSchedule()` as `autoSyncStrategyPlans()` (piggybacks on the existing `SCHEDULE_SYNC_INTERVAL`, same guards: requires a session + an active tournament + a reachable server).
- `refreshStrategyPlanForMatch(tournamentId, matchLevel, matchNumber)` — fetches one specific plan from the server via `GET /api/match-strategy/{tid}/{level}/{match}` and merges it into IndexedDB. **Bypasses the active-tournament filter**, so past tournaments still refresh correctly. Respects locally-dirty records. Driven by a reusable `<SyncCountdown intervalMs={30_000} onSync={...} />` component in the plan editor header — it fires on mount and every 30 s, and displays "next sync in Ns" beside the sync status so users can see how fresh the data is. This is what lets a second device see the first device's work without a manual sync on past or current tournaments alike.
- `useStrategyPlansSyncStatus()` hook; included in `useManualSyncStatus` aggregation and surfaced on the Sync Central page via `SyncStrategyPlans.tsx`.
- `updateStrategyPlansUnsyncCount()` updates the unsync counter (called from `initializeSyncSchedule`).

### Routes (`app/routes.ts`)

| Path | Page |
|---|---|
| `/strategy` | Tournament selection (`routes/strategy/strategy-home-page.tsx`) |
| `/strategy/:tournamentId` | Match selection (`routes/strategy/strategy-matches-page.tsx`) |
| `/strategy/:tournamentId/:level/:matchNumber` | Plan editor (`routes/strategy/strategy-plan-page.tsx`) |

All three wrapped in `<RequireRole roles={["MEMBER", "DATASCOUT", "DRIVE_TEAM", "EXPERTSCOUT", "ADMIN", "SUPERUSER"]}>`.

A "Match Strategy" link is added to `routes/home-page.tsx`, gated by the role check in the access-control section above (currently DRIVE_TEAM/ADMIN/SUPERUSER only during pre-launch).

### Tournament picker (`/strategy`)

The strategy home page is split into two sections:
- **Active Tournaments** — the team's active or upcoming tournaments (via `useActiveTeamTournaments()`), shown as primary buttons.
- **Current Season** — every tournament in the latest season present in IndexedDB (derived as `max(season)` across all locally-cached tournaments), grouped by week in collapsible `<details>` sections (matching the tournament-streams page pattern), sorted by start date within each week, shown as secondary buttons. The current week's section is open by default. Useful for planning against past matches.

### Match picker (`/strategy/:tournamentId`)

Reads the match schedule from IndexedDB via `useMatchSchedule()`, groups matches by `level`, and renders a grid per level. **Auto-fetches** the schedule from RavenBrain (once per page load) when no matches are cached locally for the selected tournament — this is the path that makes past tournaments usable without a prior sync. Falls back to a manual "Fetch Schedule" button with an error banner if the server is unreachable. Uses the same `fetchTournamentSchedule` / `getScheduleForTournament` / `mergeMatchSchedule` pattern as `app/common/track/MatchForm.tsx`.

---

## Plan Editor UI

iPad-landscape optimized (1024×768 reference viewport):

- **Header** — match identifier, "LOCKED" badge, Unlock button (only visible if user has edit role), save-status indicator ("Saved locally" / "Syncing…" / "Synced to server").
- **Left column (narrow)** — Short Summary input (`maxLength=32`, live character counter), Strategy textarea, drawing list with labels + creator names, "+ New Drawing" button.
- **Right column (dominant)** — canvas with field background. Above the canvas, a single-row **toolbar** (drawing-tool layout) groups buttons into clusters separated by vertical dividers:
  - **Tools**: Arrow / Line / Eraser (mutually exclusive drawing tools, inline SVG icons)
  - **Navigate**: Pan + zoom controls `[Pan] [−] [150%] [+]` — tap the percentage to reset to 100%
  - **History**: Undo (context-aware label — "Undo Arrow" / "Undo Line" / "Undo Erase" / "Undo Clear", plain "Undo" when the stack is empty) + Clear
  - **Playback**: Play (cycling speed: click to play at 1×, click again to play at 2×, again for 3×, then back to 1×) + Stop
  - **View**: Fullscreen (CSS overlay, `position: fixed; inset: 0; z-index: 1000`, `overflow: hidden`, `display: flex; flex-direction: column` — metadata + palette + toolbar take natural heights, the canvas wrapper uses `flex: 1 1 0` via its `fillHeight` prop so it fills all remaining vertical space and the view **never scrolls**. Esc exits.) + a Lock/Unlock toggle that **appears only while in fullscreen** (since the page-header Lock button is obscured by the overlay) + Labels toggle (hides text labels on every toolbar button to compact the row; icon-only mode with `title` tooltips for hover). The labels toggle's own state is persisted to `localStorage` under `raveneye_strategy_toolbar_labels` (values: `"show"` | `"hide"`).

  The Pan tool button is always visible. The zoom `+` / `−` / `%` buttons are **hidden on touch-primary devices** (iPads, phones) — those users pinch to zoom. Detection: `matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints > 1`.

  Above the toolbar: the drawing label + stroke count, and the robot-slot palette (6 swatches R1/R2/R3/B1/B2/B3 prefilled with team numbers from the schedule). In **fullscreen mode** the label and the palette share a single row to save vertical space; otherwise they stack. Order from top to bottom: metadata row → (palette row, windowed mode only) → toolbar → canvas.

  **Palette interaction (double-tap to solo):**
  - Tap a team whose button is *not* selected → switch colour (clears any solo).
  - Tap the currently-selected team again → **solo** that team: only its strokes remain visible on the canvas. All five other team buttons render with dotted borders + reduced opacity to mark them as hidden.
  - Tap the soloed team again → show everyone (solo cleared; selection unchanged).
  - Tap a different team while soloed → that team becomes the new selection and solo is cleared.

  Solo mode filters rendering, erase hit-testing, and playback: while soloed, only the soloed team's strokes are drawn, erasable, and played back. Solo state is session-scoped — it's reset automatically whenever the user locks the plan, switches to a different drawing, or changes active drawing.

### Tools

- **Arrow** — new strokes get an arrowhead at the tip.
- **Line** — new strokes are plain lines (`arrow: false` on the stroke).
- **Eraser** — tap on (or within ~14 CSS px of) an existing stroke to delete it. Hit-test iterates strokes back-to-front (topmost wins) and measures distance from the pointer to each segment between consecutive points. A red dashed highlight indicates the stroke under the pointer on devices that support hover. No confirmation dialog — Undo reverses the erase.
- **Pan** — single-pointer drag moves the viewport. Disabled at zoom = 1×. **Hold Space** on desktop to temporarily engage Pan mode (Photoshop convention) without switching tools — release Space to return to your previous tool. Space-hold is suppressed when focus is in an input/textarea.

The stroke-style toggle sets the mode for *new* strokes only; existing strokes preserve their own `arrow` flag.

**Default tool**: "line". The last-selected tool (arrow / line / erase) is persisted to `localStorage` under the key `raveneye_strategy_draw_tool` and restored next time the user opens the plan editor. On first use (or if `localStorage` is unavailable), the editor starts in Line mode.

### Undo stack

An in-memory per-drawing history stack tracks three kinds of entries:

- `{ kind: "add", at, stroke }` — reversed by removing the stroke at `at`.
- `{ kind: "erase", at, stroke }` — reversed by splicing the stroke back in at `at`.
- `{ kind: "clear", strokes }` — reversed by restoring the snapshot.

Pressing Undo pops the latest entry and applies the inverse, then re-persists the drawing (marking it dirty for sync). The stack is session-scoped (never persisted) and **reset** when the user switches to a different drawing. Accidentally erased strokes are recoverable via Undo as long as the user hasn't switched drawings or reloaded the page.

### Components (`app/common/strategy/`)

- `StrategyCanvas.tsx` — edit canvas (supports `tool: "draw" | "erase"`)
- `StrategyReadOnlyCanvas.tsx` — same renderer, no pointer capture
- `RobotSlotPalette.tsx` — 6 swatches with team numbers from `useMatchSchedule()`
- `DrawingList.tsx` — list + active selection + "+ New Drawing"
- `colors.ts` — `ROBOT_COLORS` palette
- `fieldImage.ts` — `fieldImageForYear(year)` helper
- `icons.tsx` — inline SVG toolbar icons (Arrow, Line, Eraser, Undo)

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

### Zoom & Pan

The canvas supports zooming in and panning across the field. All strokes stay pixel-perfect because they're stored in normalised 0..1 field coordinates and the zoom/pan transform is applied at render-time via `ctx.scale` + `ctx.translate`.

- **Zoom range**: `MIN_ZOOM = 1.0` to `MAX_ZOOM = 4.0`. Cannot shrink past full size.
- **Discrete zoom steps** (toolbar `+`/`−` buttons): 1.0, 1.5, 2.0, 2.5, 3.0, 4.0. The label button (`100%` / `150%` / …) resets to 100%.
- **Pan clamping**: `panX`, `panY` ∈ `[0, 1 − 1/zoom]` so the viewport can never show blank space outside the field.
- **Continuous zoom** (pinch-gesture): smoothly scales between MIN and MAX; zoom is anchored at the gesture's starting centroid so the content under the user's fingers stays put.
- **Erase hit radius** is divided by zoom so tap precision stays consistent on screen at any zoom level.

**Persistence** (global, in `localStorage`):

| Key | Type |
|---|---|
| `raveneye_strategy_zoom` | number, 1.0–4.0 |
| `raveneye_strategy_pan_x` | number, 0–(1−1/z) |
| `raveneye_strategy_pan_y` | number, 0–(1−1/z) |

Values are clamped on load in case they were saved under a previous zoom that's now stricter.

**Interaction model:**

| Device | Zoom | Pan |
|---|---|---|
| Desktop (`pointer: fine`) / touch laptop | Toolbar `+`/`−` buttons | Pan tool (drag with mouse) **or hold Space + drag** |
| Touch-primary (iPad / phone: `pointer: coarse` + `maxTouchPoints > 1`) | Two-finger pinch | Two-finger drag |

The zoom `+`/`−` toolbar buttons are **hidden on touch-primary devices** (pinch is expected). The Pan tool button remains visible on all devices — it's cheap toolbar space and harmless on touch, where two-finger drag is still preferred.

Two-finger gestures work regardless of the active tool: when a second pointer arrives, any in-progress single-pointer stroke is cancelled (not committed) and the canvas enters gesture mode until the pointer count drops below 2.

### Playback

The canvas exposes an imperative `play(speed: number)` method that re-renders strokes point-by-point, honoring the recorded `t` deltas scaled by `1 / speed`, using `requestAnimationFrame`. The plan editor wraps this in a cycling **Play** button whose state rotates 1× → 2× → 3× → 1× on each click; each click immediately plays at the shown speed, then advances the state for the next click.

---

## Alliance-Coded Palette

`ROBOT_COLORS` mirrors FRC alliance conventions — R1/R2/R3 are three shades of **red**; B1/B2/B3 are three shades of **blue**:

| Slot | Index | Hex | Note |
|---|---|---|---|
| R1 | 0 | `#FF5252` | Bright red |
| R2 | 1 | `#F06292` | Bright pink |
| R3 | 2 | `#7F0000` | Dark red / maroon |
| B1 | 3 | `#80DEEA` | Bright cyan |
| B2 | 4 | `#1976D2` | Standard blue |
| B3 | 5 | `#0D47A1` | Dark navy |

Strokes instantly read as belonging to their alliance. Within each alliance the three shades vary in luminance (light / medium / dark) — this is the key to colorblind safety, since viewers with red-green colour vision deficiency still perceive brightness independently of hue and can distinguish the three reds (or three blues) apart.

---

## Field Image Assets

Static PNGs shipped with the frontend under `app/assets/<year>/field.png` — one file per game year.

`fieldImageForYear(year: number): string` in `app/common/strategy/fieldImage.ts` returns the bundled URL for the matching year's image, falling back to the most recent bundled year if the requested year isn't available. Year is derived from `RBTournament.season` (or `startTime`) — see `app/types/RBTournament.ts`.

Discovery is automatic via Vite's **eager `import.meta.glob`** pattern `../../assets/*/field.png`, so every matching file is bundled at build time and indexed by the four-digit year directory.

**To add a new year**: drop `field.png` into `app/assets/YYYY/`. No code change is required — Vite picks it up on the next build/HMR cycle.

---

## Save & Sync Semantics

All edits write to IndexedDB first and mark the record dirty; the upload sync pushes dirty records to the server opportunistically.

| Trigger | Action |
|---|---|
| Short summary / strategy text keystroke | Write to IDB immediately, mark plan dirty. The server push waits for the next interval tick or a manual Sync Now — no per-edit debounce. |
| Stroke completed (`pointerup`) | Write updated drawing blob to IDB, mark drawing dirty |
| "+ New Drawing" clicked | Insert drawing into IDB with `localId = new-${uuid}`, mark dirty |
| Stroke undone (Undo button) | Remove last stroke from drawing, write to IDB, mark dirty |
| Drawing cleared | Empty drawing's strokes array, write to IDB, mark dirty |
| Drawing label edited | Write to IDB, mark dirty |
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
