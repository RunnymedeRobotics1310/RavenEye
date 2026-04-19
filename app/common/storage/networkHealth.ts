import { useEffect, useState } from "react";
import { ping } from "~/common/storage/rb.ts";
import { serverNow } from "~/common/storage/serverTime.ts";

/**
 * Network-health state for the online indicator (Unit 8 rework).
 *
 * <p>Earlier design: a dedicated 30-second {@code /api/ping} poll. Every scout's device
 * made ~1,000 ping requests per day even when the app had no other work to do, and a
 * captive portal returning {@code 200 OK} for anything fooled the indicator into showing
 * "online" for up to 30 seconds.
 *
 * <p>Unit 8 design: derive {@code alive} from a {@code lastOk} timestamp updated on
 * every qualifying response (tight criteria below). A fallback {@code /api/ping} fires
 * only when nothing else has landed in the required window. Steady-state: no ping traffic.
 * Idle: one ping every {@link STALE_THRESHOLD_MS}. Captive portal: indicator stays red.
 *
 * <p><b>Qualifying response criteria (all must hold):</b>
 *
 * <ul>
 *   <li>HTTP status {@code 200}.
 *   <li>{@code Content-Type} starts with {@code application/json}.
 *   <li>URL path matches {@code /api/}.
 *   <li>The {@code X-RavenBrain-Version} header is present. Captive portals don't know to
 *       inject this header, so its presence is the strongest structural defense we have.
 *   <li>Body parses as JSON and is non-empty (at least one own property or a non-empty
 *       array). {@link ping} additionally checks the body shape matches {@code {pong: true,
 *       version: string}} for the {@code /api/ping} path specifically.
 * </ul>
 */

/** Threshold for indicator freshness. Older than this → status is offline until next signal. */
const STALE_THRESHOLD_MS = 15_000;

/** Fallback-ping interval when no other request has qualified as liveness. */
const FALLBACK_TICK_MS = 15_000;

let lastOkAt: number | null = null;
let fallbackTimer: ReturnType<typeof setInterval> | null = null;
let started = false;
let readyInternal = false;
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((fn) => fn());
}

/**
 * Record that a response met the liveness criteria. Called by {@code rb.ts} and
 * {@code cacheFetch.ts} on every response so the indicator tracks real activity rather
 * than a dedicated polling loop.
 */
export function recordQualifyingResponse(
  url: string,
  response: Response,
  body?: unknown,
): void {
  if (response.status !== 200) return;
  if (!/\/api\//.test(url)) return;
  const ct = response.headers.get("content-type");
  if (!ct || !ct.startsWith("application/json")) return;
  if (!response.headers.get("X-RavenBrain-Version")) return;
  if (!bodyQualifies(url, body)) return;
  lastOkAt = serverNow();
  readyInternal = true;
  notify();
}

function bodyQualifies(url: string, body: unknown): boolean {
  if (body === undefined) {
    // Caller didn't parse a body (e.g., a 304). Treat as qualifying — a 304 only happens
    // when the server proved the ETag matches, which itself proves the server is alive
    // for the path we care about. The other header-level checks above still apply.
    return true;
  }
  if (body === null) return false;
  if (Array.isArray(body)) return body.length > 0;
  if (typeof body === "object") {
    // /api/ping specifically: require {pong: true, version: string}.
    if (/\/api\/ping\b/.test(url)) {
      const rec = body as Record<string, unknown>;
      return rec.pong === true && typeof rec.version === "string";
    }
    return Object.keys(body as object).length > 0;
  }
  return false;
}

/** Fire a fallback ping and feed its result through {@link recordQualifyingResponse}. */
async function runFallbackPing() {
  // ping() already reads X-RavenBrain-Version and feeds recordServerTime; it returns true
  // only for a 200, and its own call site wires up recordQualifyingResponse via the rb.ts
  // integration added in this unit.
  await ping();
}

function ensureFallbackTimer() {
  if (fallbackTimer || typeof window === "undefined") return;
  fallbackTimer = setInterval(() => {
    const now = serverNow();
    const since = lastOkAt === null ? Infinity : now - lastOkAt;
    if (since >= STALE_THRESHOLD_MS) {
      runFallbackPing();
    }
  }, FALLBACK_TICK_MS);
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  // Kick a ping on startup so the indicator has a value inside the first 15s.
  runFallbackPing();
  ensureFallbackTimer();
}

export interface NetworkHealth {
  /** True when a qualifying response landed within the stale threshold. */
  alive: boolean | null;
  /** True when lastOk is older than the threshold (captive portal, offline, or quiet). */
  isOffline: boolean;
  /** True once at least one qualifying response has been observed OR the first ping fired. */
  ready: boolean;
}

function snapshot(): NetworkHealth {
  if (lastOkAt === null) {
    return { alive: readyInternal ? false : null, isOffline: readyInternal, ready: readyInternal };
  }
  const since = serverNow() - lastOkAt;
  const alive = since < STALE_THRESHOLD_MS;
  return { alive, isOffline: !alive, ready: true };
}

/** Non-hook accessor for the shared network-health state. */
export function getNetworkHealth(): NetworkHealth {
  start();
  return snapshot();
}

/**
 * Subscribe from React. Re-renders whenever a qualifying response arrives or the fallback
 * ping completes. Multiple components share one timer; the loop never stops (SPA lifetime).
 */
export function useNetworkHealth(): NetworkHealth {
  const [, setTick] = useState(0);

  useEffect(() => {
    const tick = () => setTick((n) => n + 1);
    subscribers.add(tick);
    start();
    // Re-render periodically so the UI flips to "offline" when lastOk ages out even
    // without any new response. Aligns with the fallback tick so we're not adding timers.
    const uiTick = setInterval(tick, STALE_THRESHOLD_MS);
    return () => {
      subscribers.delete(tick);
      clearInterval(uiTick);
    };
  }, []);

  return snapshot();
}
