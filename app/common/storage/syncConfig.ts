import { cacheFetch } from "~/common/storage/cacheFetch.ts";

/**
 * Client-side accessor for the unified sync cadences and tournament-window bounds. The values
 * are served by RavenBrain's {@code /api/config/client-sync} endpoint (and a public variant for
 * unauthenticated surfaces) so the cadence constants live in one place — the server's
 * {@code raven-eye.sync.*} block — instead of being duplicated across the client.
 *
 * <p>Module shape: a small in-memory cache populated lazily on the first call to any accessor.
 * Subsequent calls within a session return the cached value immediately. The wrapper uses
 * {@link cacheFetch}, so once per session the call is a 304 against IndexedDB — virtually free.
 *
 * <p>Accessors return sensible hardcoded defaults when the endpoint hasn't yet responded
 * (cold-start / offline). This means the sync layer is never blocked waiting for config — it
 * just runs at default cadences until the real values arrive.
 */

interface FullSyncConfig {
  raveneyePollMs: number;
  frcSchedulePoll: string;
  frcScoresPoll: string;
  tbaEventPoll: string;
  tbaMatchPoll: string;
  tournamentWindowLeadHours: number;
  tournamentWindowTailHours: number;
  reportBodyTtlDays: number;
  skewOffsetMaxAgeHours: number;
}

interface PublicSyncConfig {
  tournamentWindowLeadHours: number;
  tournamentWindowTailHours: number;
}

const DEFAULTS: FullSyncConfig = {
  raveneyePollMs: 30_000,
  frcSchedulePoll: "3m",
  frcScoresPoll: "30s",
  tbaEventPoll: "1h",
  tbaMatchPoll: "1h",
  tournamentWindowLeadHours: 12,
  tournamentWindowTailHours: 10,
  reportBodyTtlDays: 60,
  skewOffsetMaxAgeHours: 12,
};

let cached: FullSyncConfig | null = null;
let inFlight: Promise<FullSyncConfig> | null = null;

/**
 * Fetches the full (authenticated) config. Returns the cached value on subsequent calls. If the
 * call fails (e.g. the user isn't logged in yet), returns {@link DEFAULTS} so callers get a
 * sensible value to work with.
 */
export async function loadFullSyncConfig(): Promise<FullSyncConfig> {
  if (cached) return cached;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const { body } = await cacheFetch<FullSyncConfig>("/api/config/client-sync");
      cached = body;
      return body;
    } catch {
      return DEFAULTS;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/**
 * Fetches only the public window bounds. Available without authentication for kiosk / home-page
 * usage. Does not populate the full cache.
 */
export async function loadPublicSyncConfig(): Promise<PublicSyncConfig> {
  try {
    const { body } = await cacheFetch<PublicSyncConfig>("/api/config/client-sync/public");
    return body;
  } catch {
    return {
      tournamentWindowLeadHours: DEFAULTS.tournamentWindowLeadHours,
      tournamentWindowTailHours: DEFAULTS.tournamentWindowTailHours,
    };
  }
}

/** Synchronous accessor returning the cached value or defaults. Never throws. */
export function getSyncConfig(): FullSyncConfig {
  return cached ?? DEFAULTS;
}

/** Convenience: the RavenEye→RavenBrain poll interval, in milliseconds. */
export function getRaveneyePollMs(): number {
  return getSyncConfig().raveneyePollMs;
}

/** Convenience: tournament-window lead/tail in hours. */
export function getTournamentWindowBounds(): {
  leadHours: number;
  tailHours: number;
} {
  const c = getSyncConfig();
  return { leadHours: c.tournamentWindowLeadHours, tailHours: c.tournamentWindowTailHours };
}

/** Convenience: report-body TTL in days. */
export function getReportBodyTtlDays(): number {
  return getSyncConfig().reportBodyTtlDays;
}

/** Test-only / "clear caches" support. */
export function __resetSyncConfigForTests(): void {
  cached = null;
  inFlight = null;
}
