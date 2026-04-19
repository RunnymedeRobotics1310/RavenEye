/**
 * Centralized clock-skew tolerance.
 *
 * RavenBrain emits `X-RavenBrain-Time` (epoch milliseconds) on every response. This module
 * consumes that header and maintains a bounded offset between the device clock and the server
 * clock. Time-sensitive code (JWT expiration checks, "N minutes ago" displays, tournament-window
 * membership) calls {@link serverNow} instead of {@link Date.now} so it remains correct on
 * devices whose clocks are wrong (manual time, dead-battery reset, no NTP).
 *
 * <p>Rules:
 *
 * <ul>
 *   <li>Cold start: offset = 0.
 *   <li>Each update is clamped to ±5 minutes vs. the current offset. A single bad header
 *       therefore moves the offset by at most 5 minutes; the next real header drifts it back
 *       toward truth.
 *   <li>Last-good offset is held for 12 hours (matches the JWT access-token lifetime). After
 *       12 hours without a fresh header the offset reverts to 0 — the device is offline anyway
 *       and the JWT is expiring on the server clock, so the local check converges with reality.
 * </ul>
 *
 * No persistence. Offset is in-memory only — recomputed cheaply from the next response.
 *
 * The four sites that must use {@link serverNow} (per the network-communication-refinement
 * brainstorm R22-R23):
 * <ol>
 *   <li>{@code rbauth.ts} JWT {@code exp} check in {@code validateRavenBrainJwt}
 *   <li>{@code rbauth.ts} JWT {@code exp} check in {@code isJwtExpired}
 *   <li>{@code tournament-streams-page.tsx} relative-time display
 *   <li>{@code sync.ts} tournament-window membership (Unit 4)
 * </ol>
 *
 * Everything else (local UI countdown timers, polling intervals, drill-event timeouts, strategy
 * draw tool persistence) keeps {@link Date.now} — those don't compare against server timestamps,
 * so clock skew has no effect.
 */

/** Header name the server emits. Must match {@code ServerTimeFilter.HEADER} in RavenBrain. */
export const SERVER_TIME_HEADER = "X-RavenBrain-Time";

/** Last-good offset is dropped after this many milliseconds without a fresh header. */
const MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours; matches JWT access-token lifetime

/** Maximum allowed change to the offset in a single update. Bounds blast radius of bad headers. */
const MAX_DELTA_MS = 5 * 60 * 1000; // ±5 minutes

let offsetMs = 0;
let lastUpdateMs = 0;

/**
 * Record a server-time header from a response. Called by the {@code rbfetch} layer for every
 * response. Silently no-ops when the header is absent (e.g., responses from a misconfigured proxy
 * or non-RavenBrain origins).
 */
export function recordServerTime(headers: Headers | undefined): void {
  if (!headers) return;
  const raw = headers.get(SERVER_TIME_HEADER);
  if (!raw) return;
  const serverMs = Number(raw);
  if (!Number.isFinite(serverMs) || serverMs <= 0) return;

  const localMs = Date.now();
  const proposed = serverMs - localMs;
  const delta = proposed - offsetMs;
  const clamped =
    delta > MAX_DELTA_MS
      ? offsetMs + MAX_DELTA_MS
      : delta < -MAX_DELTA_MS
        ? offsetMs - MAX_DELTA_MS
        : proposed;
  offsetMs = clamped;
  lastUpdateMs = localMs;
}

/**
 * Returns the server-skew-corrected current time in milliseconds.
 *
 * <p>If the last-good offset is older than {@link MAX_AGE_MS}, falls back to {@link Date.now}.
 * Otherwise returns {@code Date.now() + offsetMs}.
 */
export function serverNow(): number {
  if (lastUpdateMs === 0) return Date.now();
  if (Date.now() - lastUpdateMs > MAX_AGE_MS) return Date.now();
  return Date.now() + offsetMs;
}

/** True when {@code timestampMs} is in the past relative to {@link serverNow}. */
export function isExpired(timestampMs: number): boolean {
  return serverNow() > timestampMs;
}

/**
 * Whole minutes between {@code timestampMs} and {@link serverNow}, never negative. Used by
 * "synced N minutes ago" style displays to avoid confusing past-future flips on skewed devices.
 */
export function minutesAgo(timestampMs: number): number {
  return Math.max(0, Math.round((serverNow() - timestampMs) / 60000));
}

/**
 * Test-only: reset module state. Not exported through the package's public surface; access via
 * {@code import { __resetServerTimeForTests } from "./serverTime"} when needed.
 */
export function __resetServerTimeForTests(): void {
  offsetMs = 0;
  lastUpdateMs = 0;
}
