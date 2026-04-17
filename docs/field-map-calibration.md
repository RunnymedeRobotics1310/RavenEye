# Field Map Calibration

## Overview

Field Map Calibration maps the bundled FRC field image to the coordinate system used by WPILib robot telemetry. An admin clicks the four corners of the playing surface on the field image and types the physical field and robot dimensions; the system derives a 2D perspective transform (a **homography**) that any other feature can reuse to project a robot pose in metres onto the field image.

Stage 1 ships the calibration primitive plus a visual sanity check: a robot is drawn at a hardcoded pose of `(2.0 m, 2.0 m, 0°)` on top of the field. Stage 2 (separate plan) consumes the transform to render real telemetry-driven pose playback; see the roadmap at the bottom of this doc.

Implementation plan: [`docs/plans/2026-04-17-001-feat-field-map-calibration-stage-1-plan.md`](plans/2026-04-17-001-feat-field-map-calibration-stage-1-plan.md).

## Coordinate Conventions

RavenEye already uses normalized `[0, 1]` image coordinates for strategy strokes (see [`MATCH_STRATEGY_PLAN.md`](MATCH_STRATEGY_PLAN.md)). The calibration extends that convention to a real-world metres reference frame.

### WPILib blue-origin (the "field" frame)

- **Origin** `(0, 0)` — corner of the field closest to the blue alliance's right-hand side (looking from the blue drivers toward red).
- **+X** along the long side of the field, pointing **blue → red**.
- **+Y** along the short side, right-handed (looking down). On a standard overhead image (blue left, red right, scoring table near), **+Y visually points up**.
- Heading `0°` faces **+X**; positive rotation is CCW looking down.

### Normalized image coords

- `(0, 0)` is the top-left of the rendered field image; `(1, 1)` is the bottom-right.
- Image Y points **down**, opposite of field +Y. The homography handles the flip automatically because the user clicks the corners in a fixed order (see below); no manual sign flip lives in the code.

### Click order (fixed)

| Click | Field coord | Name          |
|-------|-------------|---------------|
| 0 (A) | `(0,  0)`   | Blue origin   |
| 1 (B) | `(L,  0)`   | Red origin    |
| 2 (C) | `(L,  W)`   | Red far       |
| 3 (D) | `(0,  W)`   | Blue far      |

`L` = field length (long side). `W` = field width (short side). The admin types both; 2026 defaults come from the REBUILT Game Manual §5.2 (`16.54 m × 8.07 m`) — see [`fieldConstants.ts`](../app/common/field/fieldConstants.ts).

## Calibration Flow

1. Admin navigates to **Admin → Field Map Calibration**.
2. The page calls `GET /api/field-calibration/{year}`:
   - On `404`, the page seeds the form with the year's defaults and sits in the `idle` phase.
   - On `200`, the record hydrates the form and the page jumps straight to the `ready` phase.
3. Admin presses **Start**. The state machine walks `picking-corner-0 → picking-corner-1 → picking-corner-2 → picking-corner-3`; each phase expects one click on the prescribed corner.
4. On the fourth click, [`isCalibrationWellFormed`](../app/common/field/homography.ts) rejects degenerate inputs (two corners within ~1% of the image, colinear points, or a self-intersecting "bowtie" click order) and surfaces a reason-specific error. Otherwise the page transitions to `ready`.
5. `ready` computes the homography once (memoized), renders a 1-metre grid, the coordinate axes, the origin, and the Stage 1 robot pose as a visual proof that the math lines up.
6. **Save** writes to `PUT /api/field-calibration/{year}`. **Verify transform** runs 5 known field points through `fieldToImageNormalized ∘ imageNormalizedToField` and prints the round-trip delta in millimetres — any delta above ~1 mm is a red flag before Stage 2 starts feeding in real telemetry.
7. **Reset** (available during picking) clears the clicks and returns to `idle`.

## Homography Math

A 2D homography is a 3×3 matrix `H` with 8 degrees of freedom (the bottom-right entry is pinned to 1) that maps points between two planes under perspective:

```
[x']   [ h0  h1  h2 ]   [x]
[y'] = [ h3  h4  h5 ] · [y]
[w ]   [ h6  h7  1  ]   [1]
```

The mapped point is `(x'/w, y'/w)`. Four point correspondences give us 8 equations — exactly enough to solve for the 8 unknowns via Gaussian elimination. We use partial pivoting for numerical stability; no external library is involved.

### Concrete example

The identity calibration `field = [(0,0),(1,0),(1,1),(0,1)] → image = [(0,0),(1,0),(1,1),(0,1)]` produces `H = I` and any point maps to itself. Inset the image corners by 10% on each side — `[(0.1,0.1),(0.9,0.1),(0.9,0.9),(0.1,0.9)]` — and by symmetry the field centre `(0.5, 0.5)` still maps to image `(0.5, 0.5)`, but `(0, 0)` now maps to `(0.1, 0.1)`. The math lives in [`homography.ts`](../app/common/field/homography.ts).

### Why four corners, not two

A simple scale+translate (two corners) would be sufficient if the field image were a perfect orthographic view. In practice the bundled images have mild perspective and barrel distortion; a 4-corner homography handles the perspective component exactly and is close enough on the lens distortion for overlay purposes.

### Reference

Hartley & Zisserman, *Multiple View Geometry in Computer Vision*, §4.1 (DLT — Direct Linear Transform).

## Data Model

One row per season year. `UNIQUE(year)` enforces the "one calibration per year" invariant at the DB layer.

**Table: `RB_FIELD_CALIBRATION`**

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT AUTO_INCREMENT | PK |
| `year` | INT | `UNIQUE`. FRC season year, e.g. `2026`. |
| `field_length_m` | DOUBLE | L in metres (long side). |
| `field_width_m` | DOUBLE | W in metres (short side). |
| `robot_length_m` | DOUBLE | Robot footprint length. |
| `robot_width_m` | DOUBLE | Robot footprint width. |
| `corner0_x`..`corner3_y` | DOUBLE × 8 | Normalized `[0, 1]` image coords, indexed by click order. |
| `updated_at` | TIMESTAMP(3) | Stamped on insert and on update. |
| `updated_by_user_id` | BIGINT NULL | Resolved server-side from the auth principal. |

The backend record exposes flat `corner{0..3}{X,Y}` fields; the frontend wraps those in a nested `corners: [{x,y},...]` tuple via helpers in [`rb.ts`](../app/common/storage/rb.ts) (search for "Field Calibration"). The nested shape fits the homography math and iteration better; the flat shape keeps the Micronaut Data mapping trivial with no custom converters.

## API

| Method | Path | Auth | Returns |
|---|---|---|---|
| `GET` | `/api/field-calibration/{year}` | `IS_AUTHENTICATED` | `200` `FieldCalibration` or `404` |
| `PUT` | `/api/field-calibration/{year}` | `ROLE_ADMIN`, `ROLE_SUPERUSER` | `200` `FieldCalibration` |

`PUT` is **upsert**, not create-only. The service looks the record up by year, updates it if found, otherwise inserts — this avoids depending on MySQL `ON DUPLICATE KEY` semantics. The path-year is authoritative; any `year`, `updatedAt`, or `updatedByUserId` in the request body is ignored. The service always stamps audit fields server-side from the `Authentication` principal.

Frontend contract (see [`rb.ts`](../app/common/storage/rb.ts)):

- `getFieldCalibration(year)` resolves to `FieldCalibration | null` — `null` on 404. This **diverges** from the default `rb.ts` throw-on-non-OK idiom because first-page-load legitimately has no record and must be a normal empty state.
- `saveFieldCalibration(year, cal)` follows the default idiom (throws on any non-OK).

## Colour-Blind Palette Rationale

Per the project's standing rule, overlays must be readable by colour-blind users. The palette in [`global.css`](../app/assets/css/global.css) uses **Paul Tol's "Bright"** set, which is deuteranopia- and protanopia-safe, and **dual-encodes** every identification channel so colour is never the sole signal:

| Element | Colour channel | Non-colour channel |
|---|---|---|
| X axis | `--field-axis-x` (blue in light mode) | Thicker stroke than Y |
| Y axis | `--field-axis-y` (orange) | Thinner stroke than X |
| Field grid | `--field-grid` (25% opacity) | Thin stroke, 1-metre spacing |
| Corner markers | `--field-corner` | `A` `B` `C` `D` text labels |
| Origin | same as X axis | `0,0` text label |
| Robot body | `--robot-body` (teal) | 4-sided polygon |
| Robot front | `--robot-front` (yellow) | Triangle shape inside the body |

Dark-mode overrides live in the same file; toggle the OS dark mode with the calibration page open to verify the palette updates live.

## Stage 2 Roadmap (out of scope for this doc; recorded for continuity)

- Add `tournament_id`, `match_level`, `match_number` to `RB_TELEMETRY_SESSION` for linkage to scouting data.
- Add `GET /api/telemetry/pose/{sessionId}?startTs=…&endTs=…` returning a time-ordered pose series parsed from `RB_TELEMETRY_ENTRY` (`.../pose/x`, `.../pose/y`, `.../pose/angle`).
- Replace the hardcoded `(2.0, 2.0, 0°)` Stage 1 pose with a telemetry-driven pose keyed on the event-log timestamp.
- Move robot dimensions from `RB_FIELD_CALIBRATION` to a self-publishing NetworkTables entry on the robot.
- Install a frontend test runner (vitest leans tiny and Vite-native) if the homography math surface grows.
