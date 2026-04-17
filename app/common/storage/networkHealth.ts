import { useEffect, useState } from "react";
import { ping } from "~/common/storage/rb.ts";

const POLL_INTERVAL_MS = 30_000;

let lastResults: boolean[] = [];
let pollTimer: ReturnType<typeof setInterval> | null = null;
let started = false;
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((fn) => fn());
}

async function runPing() {
  const ok = await ping();
  lastResults = [...lastResults, ok].slice(-2);
  notify();
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  runPing();
  pollTimer = setInterval(runPing, POLL_INTERVAL_MS);
}

export interface NetworkHealth {
  /** Result of the most recent ping, or null before the first ping completes. */
  alive: boolean | null;
  /** True only when the last two pings both failed. */
  isOffline: boolean;
  /** True once at least one ping has completed. */
  ready: boolean;
}

/**
 * Subscribes to a shared, app-wide ping loop that runs every 30 seconds.
 * The first call from any component starts the loop; the loop never stops
 * (the app is a SPA so the timer naturally dies when the tab closes).
 *
 * Components re-render whenever a new ping result arrives.
 */
export function useNetworkHealth(): NetworkHealth {
  const [, setTick] = useState(0);

  useEffect(() => {
    const tick = () => setTick((n) => n + 1);
    subscribers.add(tick);
    start();
    return () => {
      subscribers.delete(tick);
    };
  }, []);

  const alive =
    lastResults.length === 0 ? null : lastResults[lastResults.length - 1];
  const isOffline =
    lastResults.length >= 2 && lastResults.every((r) => r === false);
  const ready = lastResults.length > 0;

  return { alive, isOffline, ready };
}
