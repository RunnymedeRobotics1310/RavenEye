# Team Report — Scoring & Fuel Pickup Bar Charts

## Context

The team summary report currently shows tabular stats (Quick Comments, Robot Alerts, shoot-to-home, fuel pickup counts) but no visual per-match breakdowns. Strat team wants two new per-tournament bar chart sections under Quick Comments on the team summary page:

1. **Average Scores and Misses** — bars per match showing `scoring-number-success` and `scoring-number-miss` averages, with header showing tournament-wide averages and a hover overlay per bar group.
2. **Average Fuel Pickups** — bars per match showing `pickup-number` averages, with header showing tournament-wide average and a hover overlay per bar.

One chart per tournament per section. Aggregation rules (confirmed with user):
- When a match has multiple records of the same event type, per-match value = **mean** of amounts (not sum).
- Include **Qualification + Playoff** matches only. Label as `Q<n>` / `E<n>`.
- "Total Match Score" in overlays = the **team's alliance score** (look up whether the team was on red or blue from `RB_SCHEDULE`, then pick `redScore`/`blueScore`).
- Drill tournaments (`DRILL-*`) are excluded, consistent with existing stats.
- The three event types (`scoring-number-success`, `scoring-number-miss`, `pickup-number`) already exist in the DB — no migration needed.

All charts must be colour-blind-friendly (Paul Tol's "vibrant" palette plus redundant pattern fills — this is a standing requirement for every RavenEye screen).

---

## Backend

### Files

- `RavenBrain/src/main/java/ca/team1310/ravenbrain/report/TeamReportService.java` — new records, computation, `TeamReport` extension, `ScheduleService` injection.

### New record types (inside `TeamReportService`)

```java
public record ScoringMatchDatum(
    String matchLabel,      // "Q7", "E3"
    int matchNumber,
    TournamentLevel level,
    Integer teamMatchScore, // team's alliance score — nullable if match not yet scored
    double avgSuccess,
    double avgMiss) {}

public record ScoringBarChart(
    String tournamentId,
    double overallAvgSuccess,  // mean of avgSuccess across matches with data
    double overallAvgMiss,
    List<ScoringMatchDatum> matches) {}   // each datum carries the team's alliance score

public record PickupMatchDatum(
    String matchLabel,
    int matchNumber,
    TournamentLevel level,
    Integer teamMatchScore, // team's alliance score — nullable if match not yet scored
    double avgPickups) {}

public record PickupBarChart(
    String tournamentId,
    double overallAvgPickups,
    List<PickupMatchDatum> matches) {}    // each datum carries the team's alliance score
```

**Team alliance score:** Every `*MatchDatum` explicitly carries `teamMatchScore`, looked up from `RB_SCHEDULE` by tournament + level + match number, then resolved to `redScore` or `blueScore` depending on which alliance the team was on (scan `red1..red4` / `blue1..blue4` slots).

### `TeamReport` extension

Two new fields: `List<ScoringBarChart> scoringCharts` and `List<PickupBarChart> pickupCharts`.

### Computation algorithm

1. Fetch `scoring-number-success`, `scoring-number-miss`, and `pickup-number` events via `EventLogService.listEventsByTeamAndEventType`.
2. Filter out `tournamentId.startsWith("DRILL-")` and any event whose `level` is not `Qualification` or `Playoff`.
3. Group by `tournamentId` → then by `(level, matchNumber)`. Collect all `amount` values.
4. For each tournament, load the schedule once via `ScheduleService.findAllByTournamentIdOrderByMatch` and index by `(level, matchNumber)` for alliance-score lookup.
5. For each `(level, matchNumber)` key:
   - `avgSuccess = mean(successAmounts)` (0 if empty), `avgMiss = mean(missAmounts)`.
   - `teamMatchScore` = red or blue score depending on team's alliance slot.
   - `matchLabel = (level == Qualification ? "Q" : "E") + matchNumber`.
6. Sort matches by level (Qualification first, then Playoff), then matchNumber ascending.
7. `overallAvgSuccess = mean(avgSuccess across matches)`; same for `overallAvgMiss` / `overallAvgPickups`.
8. Round all averages to 2 decimals via `BigDecimal.setScale(2, HALF_UP)`.
9. Only emit tournaments with at least one match datum.

---

## Frontend

### Types (`RavenEye/app/types/TeamSummaryReport.ts`)

Mirror the backend records exactly:

```ts
export type BarChartMatchLevel = "Qualification" | "Playoff";

export interface ScoringMatchDatum {
  matchLabel: string;
  matchNumber: number;
  level: BarChartMatchLevel;
  teamMatchScore: number | null;
  avgSuccess: number;
  avgMiss: number;
}

export interface ScoringBarChart {
  tournamentId: string;
  overallAvgSuccess: number;
  overallAvgMiss: number;
  matches: ScoringMatchDatum[];
}

export interface PickupMatchDatum {
  matchLabel: string;
  matchNumber: number;
  level: BarChartMatchLevel;
  teamMatchScore: number | null;
  avgPickups: number;
}

export interface PickupBarChart {
  tournamentId: string;
  overallAvgPickups: number;
  matches: PickupMatchDatum[];
}

export interface TeamSummaryReport {
  // ...existing fields...
  scoringCharts: ScoringBarChart[];
  pickupCharts: PickupBarChart[];
}
```

### Page layout (`RavenEye/app/routes/report/summary-report-page.tsx`)

Two new `<section className="card">` blocks immediately after the Quick Comments card (before Robot Alerts). Each renders a `<div className="chart-block">` per tournament with title, header averages, and `<BarChart>`.

Scoring chart uses two series:

```tsx
<BarChart
  series={[
    { key: "success", label: "Scores", colorVar: "--chart-success", pattern: "solid" },
    { key: "miss",    label: "Misses", colorVar: "--chart-miss",    pattern: "hatch" },
  ]}
  data={chart.matches.map((m) => ({
    label: m.matchLabel,
    values: { success: m.avgSuccess, miss: m.avgMiss },
    tooltip: [
      { label: "Match", value: m.matchLabel },
      { label: "Total Match Score", value: m.teamMatchScore?.toString() ?? "—" },
      { label: "Avg Scores", value: m.avgSuccess.toFixed(2) },
      { label: "Avg Misses", value: m.avgMiss.toFixed(2) },
    ],
  }))}
/>
```

Pickup chart uses one series (`--chart-pickup`).

### `BarChart` component (`RavenEye/app/routes/report/BarChart.tsx`)

Self-contained inline SVG, no external dependencies. Follows the `BracketSvg.tsx` precedent.

**API:**

```tsx
interface BarChartSeries {
  key: string;
  label: string;
  colorVar: string;        // CSS custom property name, e.g. "--chart-success"
  pattern?: "solid" | "hatch";
}

interface BarChartTooltipRow { label: string; value: string; }

interface BarChartDatum {
  label: string;
  values: Record<string, number>;
  tooltip: BarChartTooltipRow[];
}

interface BarChartProps {
  series: BarChartSeries[];
  data: BarChartDatum[];
  yAxisLabel?: string;
}
```

**Rendering:**

- Fixed `viewBox="0 0 800 320"`, `preserveAspectRatio="xMidYMid meet"`, scales responsively in the card.
- Left gutter 48px (y-axis), bottom gutter 56px (x-axis labels).
- Y axis: auto-ceiling via `niceCeiling()` (nearest 1/2/5/10 multiple), 5 gridlines with labels.
- X axis: one group per datum. If `series.length === 2`, draws two bars side-by-side with a 2px gap.
- Transparent full-height hover `<rect>` per datum group for a generous touch/hover target.
- Tooltip is an absolutely positioned `<div>` (not SVG), dl/dt/dd rows, with a close button for touch.

**Colour-blind-friendly palette** (defined as CSS custom properties in `components.css`):

| Purpose | Light | Dark |
|---|---|---|
| `--chart-success` | `#0077BB` (blue) | `#33BBEE` (cyan) |
| `--chart-miss`    | `#EE7733` (orange) | `#EE7733` (orange) |
| `--chart-pickup`  | `#009988` (teal) | `#44BB99` (lighter teal) |

Paul Tol's "vibrant" qualitative palette — safe for deuteranopia, protanopia, and tritanopia. Dark-mode overrides via `@media (prefers-color-scheme: dark)`.

**Redundant non-colour channel:** the `miss` series also uses a diagonal hatch `<pattern>` overlay, so users who can't distinguish the two hues can still tell the bars apart. Legend swatches use a matching CSS `repeating-linear-gradient` so the legend also communicates the pattern.

---

## Critical files

| File | What |
|---|---|
| `RavenBrain/src/main/java/ca/team1310/ravenbrain/report/TeamReportService.java` | New records, computation, `ScheduleService` injection |
| `RavenEye/app/types/TeamSummaryReport.ts` | Mirror the backend types |
| `RavenEye/app/routes/report/summary-report-page.tsx` | New sections + wiring |
| `RavenEye/app/routes/report/BarChart.tsx` | Reusable SVG bar chart |
| `RavenEye/app/assets/css/components.css` | Chart colour CSS vars + layout |

---

## Verification

### Backend

1. `cd RavenBrain && ./gradlew compileJava` — must compile clean.
2. `./gradlew test` — run existing suite; add a new test (future work) seeding events + a matching `RB_SCHEDULE` row, asserting chart shape/averages/label/score and that `DRILL-*` + Practice events are excluded.
3. Manual smoke: `MICRONAUT_ENVIRONMENTS=local ./gradlew run`, hit `/api/report/team/<id>`, eyeball the JSON.

### Frontend

1. `cd RavenEye && npm run typecheck` — must pass.
2. `npm run dev` → log in → open team summary page for a team with data → confirm:
   - Sections render under Quick Comments with correct header averages.
   - One chart per tournament, bars per match, correct `Q<n>` / `E<n>` labels.
   - Hover/tap shows the overlay with correct fields including "Total Match Score".
   - Dark mode picks up the dark palette via `@media (prefers-color-scheme: dark)`.
   - Mobile (iPhone-sized viewport) renders without horizontal scroll.
   - Legend swatches show the hatch pattern for the miss series.
3. Empty-state: a team with no scoring/pickup events doesn't render either section.
