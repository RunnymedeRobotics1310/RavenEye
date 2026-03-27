# PMVA Report & Report Response Cache

## Overview

The PMVA (Post Match Video Analysis) report analyzes Team 1310's robot performance using slow-motion video playback data. Scouts watch match videos and record detailed statistics across three strategy areas. This document covers both the PMVA report design and the general-purpose report response cache introduced alongside it.

---

## Report Response Cache

### Purpose

Cache full JSON report responses in MySQL so repeated report views are fast after the first generation. This is a general-purpose cache that any report can use.

### Architecture

The cache follows the same pattern as the FRC request cache (`RB_FRC_RESPONSES`):

- **Table**: `RB_REPORT_CACHE` — stores `cachekey` (unique), `body` (LONGTEXT JSON), and `created` timestamp
- **Entity**: `ReportCacheRecord` — Micronaut Data JDBC entity
- **Repository**: `ReportCacheRepository` — CRUD + tournament-based invalidation
- **Service**: `ReportCacheService` — `get(key)`, `put(key, json)`, `invalidateForTournament(id)`, `clearAll()`

### Cache Key Convention

Cache keys follow the format: `{reportType}:{parameters}`

Examples:
- `pmva:2025onham` — PMVA report for tournament 2025onham
- Future: `mega:2025onham:1310:2025` — Mega report for tournament, team, year

### Invalidation

Cache entries are invalidated in two ways:

1. **Automatic**: When new scouting events are posted via `POST /api/event`, `ReportCacheService.invalidateForTournament()` is called for each affected tournament. This is wired in `EventApi.postEventLogs()` alongside the existing `CustomTournamentStatsService` invalidation.

2. **Manual**: Admin/Superuser can clear all cache entries via `GET /api/report/cache/clear`.

### Adding Cache to a New Report

To cache a new report type:

1. Choose a cache key format (e.g., `"myreport:" + tournamentId`)
2. In your endpoint, check cache first:
   ```java
   var cached = reportCacheService.get(cacheKey);
   if (cached.isPresent()) {
       MyReport report = objectMapper.readValue(cached.get(), MyReport.class);
       return new MyReportResponse(report, true, null);
   }
   ```
3. On cache miss, generate the report and store it:
   ```java
   var report = myReportService.generate(...);
   reportCacheService.put(cacheKey, objectMapper.writeValueAsString(report));
   ```
4. Ensure your cache key contains the tournament ID so tournament-based invalidation works automatically.

---

## PMVA Report

### Data Sources

The report consumes events from three strategy areas, all prefixed with `pmva-`:

#### Strategy Area: pmva-general
| Event Type | Type | Description |
|------------|------|-------------|
| pmva-video-link | note | YouTube link for the match |
| pmva-no-breakdown | event | Robot had no breakdown |
| pmva-breakdown | note | Robot had a breakdown |
| pmva-intake-comments | note | Comments about intake |
| pmva-shooter-comments | note | Comments about shooter |
| pmva-look-into-suggestion | note | Suggestions to investigate |
| pmva-general-comments | note | General match comments |

#### Strategy Area: pmva-load-shoot-sequence

Each load-and-shoot cycle is recorded as a batch of events ending with `pmva-shoot-end`:

| Event Type | Payload | Description |
|------------|---------|-------------|
| pmva-load | amount | Total pieces loaded (scores + misses + stuck) |
| pmva-load-hopper-full | — | Hopper was subjectively "full" |
| pmva-load-hopper-not-full | — | Hopper was not full |
| pmva-load-comments | note | Load notes |
| pmva-shoot | amount | Total shots attempted (scores + misses) |
| pmva-shoot-score | amount | Successful scores |
| pmva-shoot-miss | amount | Missed shots |
| pmva-shoot-time | amount | Unload time in seconds |
| pmva-shoot-stuck-in-hopper | amount | Pieces stuck in hopper |
| pmva-shoot-note | note | Shooting session notes |
| pmva-shoot-close | — | Shot from close position |
| pmva-shoot-mid | — | Shot from mid position |
| pmva-shoot-far | — | Shot from far position |
| pmva-shoot-moving | — | Robot was moving while shooting |
| pmva-shoot-intaking | — | Robot was shooting while intaking |
| pmva-shoot-end | — | End of sequence (delimiter) |

> **Deprecated**: The old event types (`pmva-start-load`, `pmva-load-count`, `pmva-load-rating`, `pmva-hopper-full`, `pmva-hopper-not-full`, `pmva-shoot-one`, `pmva-score-one`, `pmva-miss-one`, `pmva-unload-seconds`, `pmva-count-stuck-in-hopper`, `pmva-stuck-comments`, `pmva-unload-general-comments`, `pmva-shoot-position-*`) are no longer processed by the report service. Data captured with old event types will not appear in reports.

#### Strategy Area: pmva-shoot-while-intaking

| Event Type | Type | Description |
|------------|------|-------------|
| pmva-swi-start | start | Begin SWI sequence |
| pmva-swi-score-one | event | Ball scored during SWI |
| pmva-swi-miss-one | event | Ball missed during SWI |
| pmva-swi-stuck-count | qty | Stuck balls during SWI |
| pmva-swi-stuck-comments | note | Comments about stuck balls |
| pmva-swi-general-comments | note | General SWI comments |
| pmva-swi-position-comments | note | Position-specific comments |
| pmva-swi-duration-seconds | qty (end) | Duration of SWI sequence |

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/report/pmva/tournaments` | List tournament IDs with PMVA data |
| GET | `/api/report/pmva/{tournamentId}` | Generate PMVA report (cached) |
| GET | `/api/report/cache/clear` | Clear all report cache entries (ADMIN+) |

All endpoints require `ROLE_EXPERTSCOUT`, `ROLE_ADMIN`, or `ROLE_SUPERUSER` (except cache clear which requires `ROLE_ADMIN` or `ROLE_SUPERUSER`).

### Report Structure (JSON)

```
PmvaReport
├── matchCount: int
├── general: GeneralSection
│   ├── breakdownCount, noBreakdownCount, breakdownPercentage
│   ├── breakdownMatches: [{matchId, level, note, videoLink}]
│   └── breakdownNotes, intakeComments, shooterComments, generalComments, suggestions
├── hopper: HopperSection
│   ├── loading: LoadingStats
│   │   ├── avgFillCount, hopperFilledPercentage
│   │   ├── maxFillExcludingIntaking, hopperFilledRating (0-5 stars)
│   │   └── loadComments, shootComments
│   ├── shootingAll: ShootingView         (all sequences)
│   ├── shootingClose: ShootingView?      (null if no data)
│   ├── shootingMid: ShootingView?
│   ├── shootingFar: ShootingView?
│   ├── shootingMoving: ShootingView?
│   └── shootingIntaking: ShootingView?
└── swi: SwiSection
    ├── avgSequencesPerMatch, avgScoresPerSequence, avgScorePercentPerSequence
    ├── avgStuckPerSequence, avgDurationSeconds
    ├── perMatch: [{matchId, level, sequenceCount, totalScores, totalMisses, hitRate, avgDurationSeconds}]
    └── stuckComments, generalComments, positionComments
```

Where ShootingView contains:
- filter, sequenceCount, avgCyclesPerMatch, maxCyclesPerMatch
- matchCycles: [{matchId, level, cycleCount, totalShots, totalScores, totalMisses, totalStuck}]
- sequenceShots: [{matchId, level, sequenceIndex, shots, scores, misses, stuck, unloadSeconds, shotsPerSecond, scoresPerSecond}]

Shooting views are shown 6 times: all (unfiltered), close, mid, far, moving, intaking. Filters overlap — a sequence tagged close+moving appears in both views.

### Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/report/pmva` | Tournament selector | Lists tournaments with PMVA data |
| `/report/pmva/:tournamentId` | Report page | Three-card report with charts |

### Robustness

The report is designed to handle edge cases gracefully:
- **No data**: Shows "No PMVA data recorded for this tournament"
- **Zero denominators**: All divisions use `safeDivide()` returning 0.0
- **Unclosed sequences**: Silently discarded (logged at debug level)
- **Missing event types**: Unknown events within sequences are skipped
- **Empty comments**: Accordion sections hidden when no comments exist
- **Position-specific stats**: Sub-sections hidden when no sequences exist for that position

### Frontend Components

The report page uses inline helper functions (no separate component files):
- **MatchCyclesChart**: SVG bar chart showing cycle count per match with avg/max horizontal lines
- **HitsMissesChart**: SVG grouped bar chart (shots, scores, misses, stuck per match)
- **ShotsLineChart**: SVG multi-line chart (shots/scores/misses per sequence with mouse-over tooltips)
- **TimeLineChart**: SVG multi-line chart (unload time, shots/sec, scores/sec per sequence with tooltips)
- **CommentAccordion**: Native `<details>/<summary>` elements
- **StarRating**: Star icons for the 0-5 hopper filled rating
- **ShootingSection**: Reusable section rendered for each of 6 shooting views (all, close, mid, far, moving, intaking)

### Key Files

**Backend (RavenBrain)**:
- `report/cache/` — ReportCacheRecord, ReportCacheRepository, ReportCacheService
- `report/pmva/` — PmvaReport (DTOs), PmvaReportService (generation logic)
- `report/ReportApi.java` — PMVA endpoints + cache clear endpoint
- `eventlog/EventApi.java` — Cache invalidation hook
- `db/migration/V18__report_cache.sql` — Cache table schema

**Frontend (RavenEye)**:
- `types/PmvaReport.ts` — TypeScript interfaces
- `common/storage/rb.ts` — API wrapper functions
- `routes/report/pmva-report-tournaments-page.tsx` — Tournament selector
- `routes/report/pmva-report-page.tsx` — Main report page
- `assets/css/components.css` — SVG chart, tooltip, accordion, star rating styles
