---
title: "Field Map Calibration — Stage 1"
type: feat
status: active
date: 2026-04-17
origin: "/Users/tony/.claude/plans/smooth-crafting-ritchie.md"
---

# Field Map Calibration — Stage 1

**Target repos:** RavenEye (frontend, primary) and RavenBrain (backend). All file paths below are relative to the appropriate subrepo root.

## Overview

Robots upload NetworkTables telemetry (`RB_TELEMETRY_SESSION` / `RB_TELEMETRY_ENTRY`) including pose data (x, y, heading). To visually overlay a robot on the field image used by the match-strategy system, the system needs a coordinate transform from **robot field-metres → field-image pixels**. Stage 1 introduces the calibration primitive: an admin clicks the four corners of the field on the bundled image, enters field and robot dimensions, and the system stores a year-keyed calibration record plus a derived homography usable for future overlays.

A hardcoded robot pose of `(2.0 m, 2.0 m, 0°)` is rendered on-page to visually confirm the calibration is correct. Real telemetry playback is out of scope — see Stage 2 hooks at the bottom.

## Problem Frame

The match-strategy system already renders a field image with normalized 0..1 strokes on top (see `RavenEye/docs/MATCH_STRATEGY_PLAN.md:82`). To place robot poses from WPILib-native metres onto that image, the system needs a 2D homography. The field image has mild perspective, so a simple scale/translate is insufficient; a 4-point homography is the right math. Storing the four corner clicks (normalized 0..1 against the image) plus field and robot physical dimensions gives enough to derive the transform on demand.

## Requirements Trace

- **R1.** Admins can calibrate the field for a given season year by clicking four prescribed corners and entering field + robot dimensions.
- **R2.** Calibration is persisted server-side, one record per year, editable by admins.
- **R3.** After calibration, the page renders a 1-metre grid, the coordinate axes, and a robot at the hardcoded pose `(2.0 m, 2.0 m, 0°)` so the user can visually confirm correctness.
- **R4.** The coordinate transform (field metres ↔ normalized image) is implemented as a reusable pure-function module that Stage 2 telemetry playback can consume.
- **R5.** Calibration data loads on page entry if a record already exists for the selected year.
- **R6.** 2026 is the first supported year; the data model supports adding future years without schema changes.
- **R7.** UI adheres to the standing colour-blind-friendly rule (dual-encoded hue + shape/width/label, verified in dark mode).

## Scope Boundaries

- No reading of real telemetry (`RB_TELEMETRY_ENTRY`) or pose playback.
- No joining telemetry timestamps to `RB_EVENT` rows.
- No association of telemetry sessions with tournaments or matches.
- No live tracking, animation, or time scrubbing.
- No multi-field support (one calibration per year, not per venue).

### Deferred to Separate Tasks

- Schema additions to `RB_TELEMETRY_SESSION` (tournament/match linkage): Stage 2.
- Backend endpoint for pose series (`GET /api/telemetry/pose/{sessionId}`): Stage 2.
- Pulling robot dimensions from telemetry (vs. storing on calibration): Stage 2 or 3.

## Context & Research

### Coordinate convention (WPILib blue-origin)

- `(0, 0)` — blue origin: field corner closest to blue alliance's right-hand side looking from blue drivers.
- `+X` — along the long side, pointing blue → red.
- `+Y` — along the short side, right-handed (looking down). On a standard overhead image (blue left, red right, scoring table near side), `+Y` visually points *up*.
- Heading `0°` faces `+X`. Positive rotation is CCW looking down.
- Image y-axis points down. The homography handles the flip automatically because the user clicks corners in the prescribed order.

### Click order for calibration

| Click | Field coord | Name |
|-------|-------------|------|
| 1     | `(0, 0)`    | Blue origin |
| 2     | `(L, 0)`    | Red origin (same long-side row as click 1) |
| 3     | `(L, W)`    | Red far |
| 4     | `(0, W)`    | Blue far |

`L` = field length (long side, metres). `W` = field width (short side, metres). Entered on the page; 2026 defaults from the REBUILT Game Manual §5.2 below.

### Relevant Code and Patterns

- **Auth + user-id extraction idiom:** `RavenBrain/src/main/java/ca/team1310/ravenbrain/matchstrategy/MatchStrategyApi.java:100-127` (handler signature with `Authentication`) and `:204-208` (`resolveUser(authentication)` → `userService.findByLogin(authentication.getName())`).
- **Service + repo split pattern to follow:** `ca.team1310.ravenbrain.strategyarea` — separate `StrategyArea` entity, `StrategyAreaRepository` (`@JdbcRepository`), `StrategyAreaService` (`@Singleton` wrapping the repo). *Do not* follow `MatchStrategyPlanService`'s combined service-plus-repo pattern.
- **Test infrastructure:** `RavenBrain/src/test/java/ca/team1310/ravenbrain/matchstrategy/MatchStrategyApiTest.java` — `@MicronautTest`, `HttpClient` injection, `TestUserHelper`, Testcontainers auto-provisioned via `io.micronaut.test-resources`.
- **Normalized 0..1 coords precedent:** `RavenEye/docs/MATCH_STRATEGY_PLAN.md:82` — strategy strokes already use the same normalization convention.
- **Field image helper (already exists):** `RavenEye/app/common/strategy/fieldImage.ts:31-38` exports `fieldImageForYear(year: number)` with sensible year-fallback logic. Reuse as-is; no modification needed.
- **`rb.ts` fetch idiom:** `RavenEye/app/common/storage/rb.ts:1011-1019` (`getTeamSummaryReport`) — `rbfetch`, typed cast, `throw new Error(...)` on non-OK. Stage 1's `getFieldCalibration` diverges on 404 only (see Unit 5).
- **Strategy canvas (avoided):** `StrategyCanvas.tsx` and `StrategyReadOnlyCanvas.tsx` — HTML canvas-based. Unsuitable for this feature because DOM click events with normalized SVG coordinates are easier to reason about and test than canvas coordinate math.
- **Dark mode convention:** `RavenEye/app/assets/css/global.css:88` (`@media (prefers-color-scheme: dark)`) overrides CSS custom property values on `:root`.

### Institutional Learnings

No directly applicable entries in `docs/solutions/`. This is the first coordinate-transform feature in the project.

### External References

- **2026 REBUILT Game Manual §5.2** (cited in prior design): field playing surface 651.2 in × 317.7 in ≈ **16.54 m × 8.07 m**. User can override on the page.
- **4-point homography math:** standard 8-unknowns linear system. Reference: Hartley & Zisserman *Multiple View Geometry* §4.1 (DLT). Any homography cookbook; no library dependency needed.

## Key Technical Decisions

- **Normalized [0..1] image coords, not pixels** — decouples calibration from image pixel resolution and mirrors the existing strategy-strokes convention.
- **Per-year, one-record-per-year schema** (`UNIQUE(year)`) — matches the "one field image per year" reality; Stage 2 can add venue linkage if needed.
- **Four separate corner columns, not JSON** — trivial with Micronaut Data, no custom converter, queryable if ever needed.
- **Split Service + Repo (StrategyArea pattern)** — clearer layering than the combined MatchStrategyPlanService approach and easier to unit-test the service in isolation later.
- **`upsert` implemented as `findByYear().map(update).orElseGet(insert)`** — avoids relying on MySQL `ON DUPLICATE KEY` and keeps audit fields stamped server-side.
- **`getFieldCalibration` returns `null` on 404**, not throws — first page load is legitimately "no calibration yet" and must be a normal empty state, not an error path. Diverges from the default `rb.ts` idiom; commented inline.
- **SVG overlay with `viewBox="0 0 1 1"` + `preserveAspectRatio="none"`**, over (not instead of) an `<img>` — click coordinates land in normalized 0..1 space for free. CSS must pin SVG and image to the same rendered rect (see Unit 6 approach).
- **Homography degeneracy check** — validate that the 4 clicks form a convex quadrilateral with minimum edge length before computing the transform. Surface a helpful error otherwise rather than producing NaN-filled overlays.
- **No frontend test runner** — RavenEye has none (`package.json` has no test script). Math verification is an in-page "Verify transform" button that round-trips known points and displays delta in millimetres. Doc-comment sanity checks supplement but do not substitute.
- **Colour-blind palette is dual-encoded** — hue + shape (triangle for robot front), hue + width (X axis thicker than Y), hue + label (letter labels on corners).

## Open Questions

### Resolved During Planning

- **What homography library?** — None. A ~60-line pure-JS Gaussian-elimination solver handles the 8×9 system; keeps the "minimal external deps" constraint.
- **Where does the plan document live?** — `RavenEye/docs/plans/` (primary-repo convention). The `docs/plans/` directory is created by this plan's first landing.
- **Role gate for PUT?** — `ROLE_ADMIN` or `ROLE_SUPERUSER` (matches `StrategyAreaApi` precedent). GET is `IS_AUTHENTICATED` (calibration data is not sensitive within the team).
- **GET 404 vs 200-with-null?** — 404 on the wire, `null` at the helper layer. See Key Technical Decisions.

### Deferred to Implementation

- Exact CSS rules for `.field-map` container (approach is set; precise flex/grid tuning happens on-screen).
- Whether the "Verify transform" button reuses the same homography object or recomputes — minor perf detail.
- Precise error-message copy for degenerate-quad rejection — wording finalized when UX lands.
- Whether the field image aspect ratio matches 2.05:1 closely enough to skip letterboxing workarounds — verified visually during Unit 7 testing.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
┌───────────────────────── Browser (admin) ──────────────────────────┐
│                                                                    │
│   FieldMapCalibrationPage                                          │
│   ├── Year + dimensions form                                       │
│   ├── FieldCalibrationOverlay (img + svg siblings, pinned)         │
│   │      click → normalized (nx, ny) → page state                  │
│   └── on all-4-clicks: computeHomography(fieldCorners, imgCorners) │
│          │                                                         │
│          ▼                                                         │
│   homography.ts (pure)                                             │
│   ├── computeHomography(src, dst)                                  │
│   ├── applyHomography(h, p)                                        │
│   ├── fieldToImageNormalized(cal)                                  │
│   └── imageNormalizedToField(cal)                                  │
│          │                                                         │
│          ▼                                                         │
│   Render grid, axes, robot at (2.0, 2.0, 0°) as SVG polygons       │
│          │                                                         │
│          ▼ PUT /api/field-calibration/{year}                       │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
┌───────────────────────── RavenBrain ───────────────────────────────┐
│   FieldCalibrationApi  ──(AuthN, role guard)──▶ resolveUser()      │
│          │                                                         │
│          ▼                                                         │
│   FieldCalibrationService.upsert(cal, userId)                      │
│          │ findByYear().map(update).orElseGet(insert)              │
│          ▼                                                         │
│   FieldCalibrationRepository  ──▶ RB_FIELD_CALIBRATION (MySQL)     │
└────────────────────────────────────────────────────────────────────┘
```

## Implementation Units

- [ ] **Unit 1: Database migration for `RB_FIELD_CALIBRATION`**

**Goal:** Add the schema that stores one calibration record per season year.

**Requirements:** R2, R6

**Dependencies:** None

**Files:**
- Create: `RavenBrain/src/main/resources/db/migration/V27__field_calibration.sql`

**Approach:**
- `year INT NOT NULL UNIQUE` enforces one-per-year at the DB layer.
- Four corners stored as eight `DOUBLE NOT NULL` columns (`corner0_x` … `corner3_y`), normalized 0..1.
- `updated_at TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)` gives free audit.
- `updated_by_user_id BIGINT NULL` — nullable because first-run seeding (future) may skip it.
- No FK to `RB_USER` — matches existing patterns in peer tables (avoids cascade churn).

**Patterns to follow:**
- `RavenBrain/src/main/resources/db/migration/V23__match_strategy_plan.sql` for column ordering and audit-field style.

**Test scenarios:**
- *Integration:* `./gradlew build` runs Flyway and migration applies cleanly on a fresh Testcontainers MySQL.
- *Integration:* `UNIQUE(year)` rejects a second insert for the same year with a constraint violation.

**Verification:**
- `./gradlew build` succeeds.
- Fresh schema shows `RB_FIELD_CALIBRATION` with 11 columns plus the two audit fields.

---

- [ ] **Unit 2: Backend `fieldcalibration` package (entity, repo, service, API)**

**Goal:** Provide REST endpoints for reading and upserting a calibration record.

**Requirements:** R1, R2, R5, R6

**Dependencies:** Unit 1

**Files:**
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/fieldcalibration/FieldCalibration.java`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/fieldcalibration/FieldCalibrationRepository.java`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/fieldcalibration/FieldCalibrationService.java`
- Create: `RavenBrain/src/main/java/ca/team1310/ravenbrain/fieldcalibration/FieldCalibrationApi.java`

**Approach:**
- `FieldCalibration` — `@MappedEntity("RB_FIELD_CALIBRATION")` record. Corners as eight `double` fields, not nested objects, to keep Micronaut Data mapping trivial.
- `FieldCalibrationRepository` — `@JdbcRepository(dialect = MYSQL)` extending `CrudRepository<FieldCalibration, Long>` with `Optional<FieldCalibration> findByYear(int year)`.
- `FieldCalibrationService` — `@Singleton`, thin wrapper. Key method: `upsert(FieldCalibration cal, long userId)` implemented as `findByYear(cal.year).map(existing -> save(copyWithAudit(existing, cal, userId))).orElseGet(() -> save(cal.withAudit(userId)))` — avoids relying on MySQL ON DUPLICATE KEY and ensures audit fields are always stamped server-side.
- `FieldCalibrationApi` — `@Controller("/api/field-calibration")`:
  - `GET /{year}`: `@Secured(SecurityRule.IS_AUTHENTICATED)`. Returns 404 if no record.
  - `PUT /{year}`: `@Secured({"ROLE_ADMIN", "ROLE_SUPERUSER"})`. Body is `FieldCalibration`. `userId` is resolved server-side from `Authentication` — never trusted from the request body.
- Mirror the `Authentication` → `User` idiom from `MatchStrategyApi.java:100-127, 204-208` (`resolveUser(authentication)` → `userService.findByLogin(authentication.getName())`).
- Mirror the **split** service/repo pattern from `ca.team1310.ravenbrain.strategyarea`, not the combined pattern in `MatchStrategyPlanService`.

**Patterns to follow:**
- Package structure: `ca.team1310.ravenbrain.strategyarea` (StrategyArea.java, StrategyAreaRepository.java, StrategyAreaService.java, StrategyAreaApi.java).
- Auth + user resolution: `ca.team1310.ravenbrain.matchstrategy.MatchStrategyApi`.

**Test scenarios:** *(covered in Unit 3 — kept together so the API and its tests land as one PR)*

**Verification:**
- `./gradlew compileJava` clean.
- Endpoints respond as spec'd in manual smoke test (curl).

---

- [ ] **Unit 3: Backend tests for `FieldCalibrationApi`**

**Goal:** Exercise happy-path CRUD and auth enforcement against a real Testcontainers MySQL.

**Requirements:** R1, R2 (auth)

**Dependencies:** Unit 2

**Files:**
- Create: `RavenBrain/src/test/java/ca/team1310/ravenbrain/fieldcalibration/FieldCalibrationApiTest.java`

**Approach:**
- `@MicronautTest`, inject `HttpClient`, `FieldCalibrationService`, `TestUserHelper`.
- Each test builds its user via `TestUserHelper` with the required role.
- Assertions use JUnit 5 + Micronaut `HttpResponse` inspection.

**Execution note:** Test-first — write the auth-enforcement cases before implementing the service, then fill in happy-path assertions.

**Patterns to follow:**
- `RavenBrain/src/test/java/ca/team1310/ravenbrain/matchstrategy/MatchStrategyApiTest.java` — identical injection set, identical HttpClient usage pattern.

**Test scenarios:**
- *Happy path:* PUT as ADMIN creates a record; GET as MEMBER retrieves the same corners and dimensions.
- *Happy path:* Second PUT as ADMIN for the same year updates the existing record (no constraint violation); `updatedAt` advances and `updatedByUserId` reflects the second user.
- *Happy path:* PUT as SUPERUSER also succeeds (both roles permitted).
- *Error path:* GET with no auth → 401.
- *Error path:* GET for a year with no record → 404 (expected, not an error in the product sense but verified at the API).
- *Error path:* PUT as MEMBER → 403.
- *Error path:* PUT as DATASCOUT → 403.
- *Error path:* PUT with no auth → 401.
- *Error path:* PUT with mismatched `year` in body vs. path → 400 (or treat body year as authoritative — pick one and document inline).
- *Integration:* server-stamped `updatedByUserId` matches the authenticated caller's id, even if the request body tries to supply a different value.

**Verification:**
- `./gradlew test --tests "ca.team1310.ravenbrain.fieldcalibration.FieldCalibrationApiTest"` green.
- No Testcontainers leaks (container stops between runs).

---

- [ ] **Unit 4: Frontend homography math module**

**Goal:** Pure-function coordinate-transform module usable by Stage 1's page and Stage 2's playback.

**Requirements:** R4

**Dependencies:** None (self-contained)

**Files:**
- Create: `RavenEye/app/common/field/homography.ts`

**Approach:**
- Exports: `type Point`, `type Homography = number[]` (9 elements, row-major 3×3), `computeHomography(src, dst)`, `applyHomography(h, p)`, `fieldToImageNormalized(cal)`, `imageNormalizedToField(cal)`.
- `computeHomography`: build the 8×9 system from 4 correspondences, row-reduce via Gaussian elimination, normalize `h33 = 1`. No external library.
- Both convenience factories derive field corners in metres from `cal` and return a memoizable `(p) => p` function.
- **Degeneracy check (exported as `isCalibrationWellFormed(corners, minEdgeNormalized = 0.01)`):**
  - All four points pairwise distinct and separated by at least `minEdgeNormalized` in normalized units.
  - The four points in click order form a convex (non-self-intersecting) quadrilateral — verified by sign-consistency of the cross products of consecutive edges.
  - Returns `{ ok: true } | { ok: false, reason: "colinear" | "too-close" | "self-intersecting" }` so the UI can surface a specific message.
- Page code calls `isCalibrationWellFormed` before calling `computeHomography` and never feeds a degenerate quad into the solver.
- Sanity-check comment block at the top of the file: "identity corners round-trip" and "unit-square maps to unit-square" manually traced — lightweight compensation for the missing test runner.

**Patterns to follow:**
- `RavenEye/app/common/strategy/` modules for the "pure TS helpers with no React dependencies" style.

**Test scenarios:**
- RavenEye has no test runner, so these scenarios are executed as (a) the in-page Verify button in Unit 7, and (b) hand-traced in the module's doc comment:
  - *Happy path:* Identity quad (corners = `{(0,0),(1,0),(1,1),(0,1)}`, field `1×1`) maps `(0.5, 0.5)` to `(0.5, 0.5)`.
  - *Happy path:* Field corners round-trip to image corners exactly (within 1e-9).
  - *Happy path:* Inverse composed with forward is the identity (within 1e-9) for a representative perspective quad.
  - *Edge case:* `isCalibrationWellFormed` rejects 4 colinear points with `reason: "colinear"`.
  - *Edge case:* `isCalibrationWellFormed` rejects two points within `minEdgeNormalized` with `reason: "too-close"`.
  - *Edge case:* `isCalibrationWellFormed` rejects a self-intersecting bowtie ordering with `reason: "self-intersecting"`.

**Verification:**
- `npm run typecheck` clean.
- Verify button in Unit 7 shows round-trip deltas under 1 mm for 2026 field dimensions.

---

- [ ] **Unit 5: Frontend shared primitives (type, constants, `rb.ts` helpers)**

**Goal:** Shared types, year defaults, and API client helpers the calibration page and future Stage 2 playback will consume.

**Requirements:** R4, R5, R6

**Dependencies:** Unit 2 (API shape)

**Files:**
- Create: `RavenEye/app/types/FieldCalibration.ts`
- Create: `RavenEye/app/common/field/fieldConstants.ts`
- Modify: `RavenEye/app/common/storage/rb.ts`

**Approach:**
- `FieldCalibration.ts`: interface with `year`, `fieldLengthM`, `fieldWidthM`, `robotLengthM`, `robotWidthM`, and a 4-tuple `corners: [{x,y},{x,y},{x,y},{x,y}]` documented with the click-order mapping in a leading comment. Optional `updatedAt` and `updatedByUserId`.
- `fieldConstants.ts`: `FIELD_DIMENSIONS_BY_YEAR: Record<number, { lengthM: number; widthM: number }>` with `2026: { lengthM: 16.54, widthM: 8.07 }` per the Game Manual. `DEFAULT_ROBOT_DIMENSIONS_M = { lengthM: 0.84, widthM: 0.84 }`.
- `rb.ts` additions:
  - `getFieldCalibration(year: number): Promise<FieldCalibration | null>` — **returns `null` on 404**, throws on any other non-OK. This is an intentional divergence from the default `rbfetch`-and-throw idiom and is commented as such inline. Rationale: first page load legitimately has no record and must not look like an error.
  - `saveFieldCalibration(year: number, cal: FieldCalibration): Promise<FieldCalibration>` — follows the standard idiom (throws on non-OK).

**Patterns to follow:**
- `RavenEye/app/common/storage/rb.ts:1011-1019` (`getTeamSummaryReport`) for the standard non-OK-throws idiom.
- `RavenEye/app/types/` for type-file style (interface-per-file, no defaults bundled in).

**Test scenarios:**
- *Happy path:* `getFieldCalibration(2026)` returns the saved record after Unit 7's page saves one.
- *Edge case:* `getFieldCalibration(2099)` returns `null` (no record exists), not a thrown error.
- *Error path:* `getFieldCalibration` on 500 throws a useful `Error` (not swallowed).
- *Integration:* `saveFieldCalibration` round-trips through `PUT /api/field-calibration/{year}` and the response matches the sent body (modulo audit fields).

**Verification:**
- `npm run typecheck` clean.
- Manual DevTools: console call to `getFieldCalibration(9999)` resolves to `null`.

---

- [ ] **Unit 6: `FieldCalibrationOverlay` component + overlay CSS**

**Goal:** Render the field image with a click-capturing, normalized-coordinate SVG overlay. Render picked corners during calibration and grid + axes + robot when calibration is ready.

**Requirements:** R1, R3, R7

**Dependencies:** Units 4, 5

**Files:**
- Create: `RavenEye/app/routes/admin/field-map-calibration/FieldCalibrationOverlay.tsx`
- Modify: `RavenEye/app/assets/css/components.css`

**Approach:**
- Component props: `imageUrl`, `fieldL`, `fieldW`, `robotL`, `robotW`, `corners`, `phase`, `onCornerClick`.
- DOM: `<div className="field-map"> <img /> <svg viewBox="0 0 1 1" preserveAspectRatio="none" /> </div>`.
- **CSS alignment — critical:** the SVG and image must occupy the *same rendered rect*, otherwise click coordinates drift. Approach:
  ```
  .field-map {
    position: relative;
    width: 100%;                /* parent controls size */
    aspect-ratio: 16.54 / 8.07; /* 2026 field; param if it varies later */
  }
  .field-map img,
  .field-map svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
  }
  ```
  Setting `aspect-ratio` on the container avoids letterboxing inside `object-fit: contain`: the container is sized to the field aspect, the image fills it exactly, and the SVG sits directly on top with the same rect. If the bundled `field.png` does not match the field aspect ratio closely, Unit 7's verification will surface the mismatch visually.
- Click handler: `rect = e.currentTarget.getBoundingClientRect(); onCornerClick({ x: (e.clientX - rect.left)/rect.width, y: (e.clientY - rect.top)/rect.height })`.
- Picked-corner indicator: `<circle r="0.006" />` + adjacent `<text>` with letters `A`, `B`, `C`, `D`.
- Ready-state rendering (all four clicks complete OR loaded from server): grid polylines at integer-metre lines, X and Y axis lines (X thicker than Y), origin marker, robot polygon via `fieldToImageNormalized(cal)` applied to the 4 robot-rect corners, front-indicator triangle inside the polygon.
- Robot-rect corners helper (local to the component):
  ```
  robotCornersInField(cx, cy, heading, l, w):
    local = [(-hl,-hw),(+hl,-hw),(+hl,+hw),(-hl,+hw)]
    rotate each by heading around (cx, cy)
    return rotated+translated field points
  ```
  Each field point goes through `fieldToImageNormalized` to produce the normalized polygon.
- Front-indicator triangle: base on the front edge narrowed to ~40% centred, apex pointing inward ~20% of robot length. All three vertices lie inside the robot polygon so the outer shape stays a quadrilateral.

**Patterns to follow:**
- Overall component-file style: peer components in `RavenEye/app/routes/admin/**`.
- CSS custom-property conventions: existing `global.css` / `components.css` patterns, `:root` defaults plus `@media (prefers-color-scheme: dark)` overrides.

**Test scenarios:**
- *Happy path:* In `idle` phase with zero clicks, SVG shows no overlay elements; clicks produce normalized coords in 0..1.
- *Happy path:* After four clicks, overlay renders grid, axes, origin marker, robot polygon, and front triangle.
- *Happy path:* Loading an existing calibration skips `idle`/`picking-*` and shows the ready overlay directly.
- *Edge case:* Window resize: click at the same pixel produces the same normalized coord as before resize (verified by clicking, resizing, clicking same on-screen feature again).
- *Edge case:* A click registered just inside the corner of the image yields a normalized coord ≥0 and ≤1 (no negative or >1 values due to CSS overflow).
- *Integration:* Hardcoded pose `(2.0 m, 2.0 m, 0°)` renders as a quad centred at the `(2, 2)` grid intersection with its front edge facing +X.

**Verification:**
- Visual: 1-metre grid aligns with real field features (alliance wall, scoring zone corners) within a few px.
- Visual: robot front faces the red alliance side in the overlay.
- Colour-blind check: page is readable in deuteranopia simulator (Coblis or Chrome Vision Simulator) in both light and dark modes.

---

- [ ] **Unit 7: `FieldMapCalibrationPage` + route + Verify button**

**Goal:** The admin page that drives the calibration flow, wires form state to the overlay, persists to the API, and provides user-facing math verification.

**Requirements:** R1, R2, R3, R5

**Dependencies:** Units 2, 4, 5, 6

**Files:**
- Create: `RavenEye/app/routes/admin/field-map-calibration/calibration-page.tsx`
- Modify: `RavenEye/app/routes.ts`

**Approach:**
- Route: add `route("admin/field-map-calibration", "./routes/admin/field-map-calibration/calibration-page.tsx")` immediately after the `admin/match-videos` routes (around `routes.ts:54-55`).
- Page wraps content in `RequireLogin` and lays out four cards: Year, Field dimensions, Robot dimensions, Calibrate corners (holding the overlay plus Reset/Save/Verify buttons).
- State machine: `idle → picking-corner-0 → picking-corner-1 → picking-corner-2 → picking-corner-3 → ready`. Load path jumps straight to `ready` when a record exists.
- On mount: call `getFieldCalibration(selectedYear)`. `null` → `idle` state with defaults pre-filled. Record → hydrate state and jump to `ready`.
- On fourth click: call `isCalibrationWellFormed(corners)`. If `ok: false`, show reason-specific inline error and stay in `picking-corner-3` (user resets or re-clicks). If `ok: true`, transition to `ready` and compute the homography via `useMemo` keyed on `calibration`.
- Hardcoded pose constant at the top of the file: `const STAGE_1_FIXED_POSE = { xm: 2.0, ym: 2.0, headingDeg: 0 };`. Degrees-to-radians conversion happens at the call site to the overlay.
- Field image URL: `fieldImageForYear(selectedYear)` from `RavenEye/app/common/strategy/fieldImage.ts` — already exists with year-fallback logic.
- **Verify button** (in the ready state): runs four round-trips through `fieldToImageNormalized` composed with `imageNormalizedToField` on known field points `(0,0)`, `(L,0)`, `(L,W)`, `(0,W)`, and `(L/2, W/2)`. Displays each delta as millimetres. Expected: all deltas well under 1 mm for a well-formed calibration. Surfaces numerical problems before they become mysterious playback bugs in Stage 2.
- Save button: `saveFieldCalibration(year, {...})`, disabled unless `ready`.
- Reset button: clears clicks and returns to `idle`. No confirm dialog — Save is the only durable action.

**Patterns to follow:**
- `RavenEye/app/routes/admin/match-videos/*` for page structure and `RequireLogin` usage.
- Page-level `useMemo` for derived transforms (StrategyCanvas and peers do similar).

**Test scenarios:**
- *Happy path:* Load page as ADMIN with no existing calibration → defaults populate, state is `idle`, overlay is clickable.
- *Happy path:* Click four corners in order → page reaches `ready`; overlay shows grid, axes, robot at `(2, 2, 0°)`.
- *Happy path:* Save → success. Reload page → calibration is restored, state starts in `ready`, robot is at `(2, 2, 0°)` in the same place.
- *Happy path:* Verify button shows sub-millimetre deltas for all five test points.
- *Happy path:* Change year to a year with no calibration → state resets to `idle` (not stuck on the previous year's calibration).
- *Edge case:* Click four colinear points → error message appears, page stays in `picking-corner-3`, Save is disabled.
- *Edge case:* Click two corners at the same pixel → error message appears, Save is disabled.
- *Edge case:* Click four bowtie-ordered corners → error message appears with `self-intersecting` reason.
- *Edge case:* Resize the window mid-calibration → picked corners stay visually attached to the features they were clicked on.
- *Error path:* API returns 500 on Save → user sees an error banner; calibration is not lost from local state (can retry).
- *Error path:* Non-admin user navigates to the page → they see the page but Save errors with 403 on attempt (acceptable for Stage 1; Stage 2 may hide the page entirely).
- *Integration:* PUT payload `updatedByUserId` field is ignored if set by the client; server-stamped value is what comes back on GET.
- *Integration:* Field image aspect ratio roughly matches the 2026 field (16.54 × 8.07 ≈ 2.05:1) — 1-metre grid lines up with visible field features without visible skew.

**Verification:**
- `npm run typecheck` clean.
- Manual: full calibration flow for 2026 end-to-end in dev (`npm run dev` + local `docker compose up -d`).
- Verify button reports sub-millimetre round-trip deltas.
- Dark-mode pass and colour-blind simulator pass (per R7).
- On iPhone 5-ish viewport (360 px wide), the page does not horizontally scroll; calibration clicks still land where expected (lower UX priority per project constraints but worth eyeballing).

---

- [ ] **Unit 8: CSS custom properties for field + robot palette**

**Goal:** Introduce the colour-blind-friendly palette variables used by the overlay, in both light and dark modes.

**Requirements:** R7

**Dependencies:** None (can land before or with Unit 6)

**Files:**
- Modify: `RavenEye/app/assets/css/components.css` (or `global.css` if the shop is for page-level vs. component-level; pick to match surrounding conventions — existing CSS structure dictates)

**Approach:**
- Add to `:root` (light defaults):

  | Property | Light value |
  |----------|-------------|
  | `--field-grid` | `rgba(0, 0, 0, 0.25)` |
  | `--field-axis-x` | `#0077BB` |
  | `--field-axis-y` | `#EE7733` |
  | `--field-corner` | `#CC3311` |
  | `--robot-body` | `#009988` |
  | `--robot-front` | `#EEDD00` |

- Override in `@media (prefers-color-scheme: dark)`:

  | Property | Dark value |
  |----------|------------|
  | `--field-grid` | `rgba(255, 255, 255, 0.25)` |
  | `--field-axis-x` | `#33BBEE` |
  | `--field-axis-y` | `#EE7733` |
  | `--field-corner` | `#EE3377` |
  | `--robot-body` | `#44BB99` |
  | `--robot-front` | `#EEDD00` |

- All overlay SVG elements use `var(--…)` rather than hardcoded hex, so the palette can be tweaked in one place.
- Dual-encoding, enforced by Unit 6's markup (not by CSS): X axis thicker than Y axis; robot-front is a triangle (shape) plus the `--robot-front` fill (colour); corner markers carry `A/B/C/D` text labels; origin marker has a `0,0` label.

**Patterns to follow:**
- `RavenEye/app/assets/css/global.css:88` for the `@media (prefers-color-scheme: dark)` override convention.

**Test scenarios:** `Test expectation: none — this unit introduces design tokens only; behavioural coverage lives in Unit 6 (rendering) and Unit 7 (dark-mode + colour-blind verification).`

**Verification:**
- `npm run typecheck` clean (CSS doesn't affect it, but confirms nothing else broke).
- Manual: toggle system dark mode with the calibration page open; palette updates live.

---

- [ ] **Unit 9: Design doc**

**Goal:** Per the standing rule, create a RavenEye design doc explaining the feature for future maintainers (especially students).

**Requirements:** Housekeeping — supports long-term maintainability.

**Dependencies:** Unit 7 (doc is written after the design has settled)

**Files:**
- Create: `RavenEye/docs/field-map-calibration.md`

**Approach:**
- Sections: Overview, Coordinate Conventions (with ASCII/diagram), Calibration Flow, Homography Math (link to Hartley-Zisserman), Data Model, API, Colour-blind Palette Rationale, Stage 2 Roadmap.
- Cross-link to this plan: `See docs/plans/2026-04-17-001-feat-field-map-calibration-stage-1-plan.md` for implementation unit history.
- Keep the math section readable to a student — concrete example with numbers, not just matrix notation.

**Patterns to follow:**
- `RavenEye/docs/MATCH_STRATEGY_PLAN.md` — voice, depth, length.

**Test scenarios:** `Test expectation: none — documentation only.`

**Verification:**
- A student (or a non-author teammate) can read the doc and explain what the feature does and where its boundaries are.

---

## System-Wide Impact

- **Interaction graph:** New endpoints under `/api/field-calibration/*` only; no changes to existing request handlers or middleware. Frontend adds a new admin route; no existing routes change.
- **Error propagation:** `getFieldCalibration` surfaces 404 as `null` — callers must handle that case (Stage 2 playback should also tolerate `null` and either prompt for calibration or use a fallback).
- **State lifecycle risks:** None — calibration is a single row per year with no concurrent writers in practice (one team admin at a time). Server-side `updated_at` is advisory, not a pessimistic lock.
- **API surface parity:** No analogous interfaces to update (no other coordinate transforms exist).
- **Integration coverage:** Unit 3 covers auth boundaries; Unit 7's Verify button covers the pure-math round-trip under realistic calibration; Unit 6's visual grid-alignment is the integration proof that the whole stack agrees on coordinates.
- **Unchanged invariants:** `RB_TELEMETRY_SESSION`, `RB_TELEMETRY_ENTRY`, `RB_EVENT`, match-strategy strokes, and the existing strategy canvas are **not** touched. The existing normalized-0..1 convention for strategy strokes is *consistent with* the new calibration convention but the two are not yet coupled; Stage 2 will bridge them.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| User clicks 4 degenerate points (colinear, overlapping, bowtie) and overlay fills with NaN | `isCalibrationWellFormed` gate before `computeHomography`; reason-specific error UI (Units 4, 7) |
| SVG and image drift under window resize or unusual image aspect ratio → clicks land in the wrong place | Container with explicit `aspect-ratio` + absolutely-positioned overlapping SVG (Unit 6); manual resize test in Unit 7 scenarios |
| `field.png` aspect ratio differs from the configured field dimensions → 1-metre grid looks off even with perfect math | Unit 7 verification step explicitly compares grid to visible field features; if the bundled image is mis-proportioned, replace it (separate task) |
| Homography numerical stability on near-degenerate (but not caught) quads | Verify button in Unit 7 displays round-trip deltas; any delta above ~1 mm is a red flag investigators can see |
| No frontend test runner means regressions in the homography module could slip in silently | Doc-comment traced examples + always-visible Verify button in the admin UI; Stage 2 plan should include installing a test runner if the math surface grows |
| Second PUT for same year hits `UNIQUE(year)` constraint violation if service logic is wrong | Service uses `findByYear().map(update).orElseGet(insert)` (Unit 2); Unit 3 explicitly tests second PUT |
| User navigates away mid-calibration and loses clicks | Acceptable for Stage 1 (admin can re-click quickly); no browser-unload warning |

## Documentation / Operational Notes

- New admin-only page — no user-visible impact for scouts.
- No feature flag; the page simply appears in the admin nav once deployed.
- Migration is additive and backward-compatible; rollback is manual SQL (`DROP TABLE RB_FIELD_CALIBRATION`) but not expected.
- Update `RavenEye/docs/field-map-calibration.md` in the same PR (Unit 9).

## Sources & References

- **Origin document:** [/Users/tony/.claude/plans/smooth-crafting-ritchie.md](/Users/tony/.claude/plans/smooth-crafting-ritchie.md)
- **Related code (backend):** `RavenBrain/src/main/java/ca/team1310/ravenbrain/strategyarea/`, `RavenBrain/src/main/java/ca/team1310/ravenbrain/matchstrategy/MatchStrategyApi.java`
- **Related code (frontend):** `RavenEye/app/common/strategy/fieldImage.ts`, `RavenEye/app/common/storage/rb.ts`, `RavenEye/app/routes/admin/match-videos/`
- **Related docs:** `RavenEye/docs/MATCH_STRATEGY_PLAN.md` (normalized-0..1 coord precedent, line 82)
- **External:** 2026 REBUILT Game Manual §5.2 (field dimensions); Hartley & Zisserman, *Multiple View Geometry*, §4.1 (DLT homography)

## Stage 2 Hooks (out of scope — recorded for continuity)

- Add `tournament_id`, `match_level`, `match_number` to `RB_TELEMETRY_SESSION` for linkage to scouting data.
- Add `GET /api/telemetry/pose/{sessionId}?startTs=…&endTs=…` returning a time-ordered pose series parsed from `RB_TELEMETRY_ENTRY` (`.../pose/x`, `.../pose/y`, `.../pose/angle`).
- Replace the hardcoded `(2.0, 2.0, 0°)` pose with a telemetry-driven pose keyed on the event-log timestamp.
- Move robot dimensions from `RB_FIELD_CALIBRATION` to a self-publishing NT entry on the robot.
- Install a frontend test runner (vitest leans tiny and Vite-native) if the math surface area grows in Stage 2+.
