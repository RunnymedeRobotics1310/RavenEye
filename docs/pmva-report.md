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

#### Strategy Area: pmva-fill-then-empty-hopper

**Sequence: pmva-load-hopper**

| Event Type | Type | Description |
|------------|------|-------------|
| pmva-start-load | start | Begin load sequence |
| pmva-load-count | qty | Number of balls loaded |
| pmva-load-rating | qty | Load quality rating (1-5) |
| pmva-load-comments | note | Comments about the load |
| pmva-hopper-full | end | Hopper was filled |
| pmva-hopper-not-full | end | Hopper was not filled |

**Sequence: pmva-unload-hopper**

| Event Type | Type | Description |
|------------|------|-------------|
| pmva-shoot-one | start | Begin unload sequence (first shot) |
| pmva-score-one | event | Ball scored |
| pmva-miss-one | event | Ball missed |
| pmva-count-stuck-in-hopper | qty | Balls stuck in hopper |
| pmva-unload-seconds | qty | Seconds from start to end of unload |
| pmva-stuck-comments | note | Comments about stuck balls |
| pmva-unload-general-comments | note | General unload comments |
| pmva-shoot-position-close | end | Shot from close position |
| pmva-shoot-position-mid | end | Shot from mid position |
| pmva-shoot-position-far | end | Shot from far position |
| pmva-shoot-position-varied | end | Shot from varied positions |

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
│   │   ├── avgFillCount, maxFillCount, hopperFilledPercentage, avgLoadRating
│   │   └── loadComments
│   ├── shootingAll: ShootingStats      (aggregate across all positions)
│   ├── shootingClose: ShootingStats?   (null if no data)
│   ├── shootingMid: ShootingStats?
│   ├── shootingFar: ShootingStats?
│   └── shootingVaried: ShootingStats?
└── swi: SwiSection
    ├── avgSequencesPerMatch, avgScoresPerSequence, avgScorePercentPerSequence
    ├── avgStuckPerSequence, avgDurationSeconds
    ├── perMatch: [{matchId, level, sequenceCount, totalScores, totalMisses, hitRate, avgDurationSeconds}]
    └── stuckComments, generalComments, positionComments
```

Where ShootingStats contains:
- position, sequenceCount, perMatch (per-match breakdown)
- avgScorePerMatch, avgHitRate, avgUnloadSeconds
- shotsPerSecond, scoresPerSecond, avgStuckPerSequence
- stuckComments, generalComments

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
- **BarChart**: CSS-based bar charts using flex layout and percentage heights
- **CommentAccordion**: Native `<details>/<summary>` elements
- **StarRating**: Unicode star characters for the 0-5 load rating
- **ShootingSection**: Reusable section rendered for each shooting position

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
- `assets/css/components.css` — Bar chart, accordion, star rating styles
