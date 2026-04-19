import { API_ETAGS_STORE } from "~/common/storage/db.ts";
import { reportBodies, reportMetadataStore } from "~/common/storage/reportCache.ts";

/**
 * Clears all <em>read-only cache</em> IndexedDB stores. Used by the Unit 7 logout / username-
 * change flow to keep cached role-gated data from leaking across sessions without touching the
 * outbound tracking queues.
 *
 * <p>Stores wiped:
 *
 * <ul>
 *   <li>{@code apiEtags} — every stored ETag + parsed body. Forces a fresh 200 on the next
 *       read so the new session sees its own data rather than a predecessor's cached response.
 *   <li>{@code reportMetadata} and {@code reportBodies} — reports-in-IndexedDB (Unit 6).
 *   <li>{@code tournamentList}, {@code strategyAreas}, {@code eventTypes},
 *       {@code sequenceTypes}, {@code matchSchedule}, {@code robotAlerts},
 *       {@code teamTournamentIds}, {@code customStatsCache}, {@code strategyPlans},
 *       {@code strategyDrawings} — all reference data and cached report aggregates.
 * </ul>
 *
 * <p>Stores NOT wiped (outbound tracking queues — never touched by role-change or username-
 * change flows; only the dedicated "Clear caches and log out (discard pending events)" variant
 * touches these, implemented separately):
 *
 * <ul>
 *   <li>{@code commentsNew} + {@code commentsSynced}
 *   <li>{@code eventsNew} + {@code eventsSynced}
 *   <li>{@code robotAlertsNew} + {@code robotAlertsSynced}
 *   <li>{@code syncStatus} — cosmetic; let the next sync refresh it.
 * </ul>
 */

const DB_NAME = "RavenEyeDB";

const READ_ONLY_CACHE_STORES: string[] = [
  API_ETAGS_STORE,
  "tournamentList",
  "strategyAreas",
  "eventTypes",
  "sequenceTypes",
  "matchSchedule",
  "robotAlerts",
  "teamTournamentIds",
  "customStatsCache",
  "strategyPlans",
  "strategyDrawings",
];

let dbHandle: IDBDatabase | null = null;

async function openDb(): Promise<IDBDatabase> {
  if (dbHandle) return dbHandle;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME);
    req.onsuccess = () => {
      dbHandle = req.result;
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Wipe every read-only cache store. Outbound tracking queues are preserved.
 *
 * <p>Fault-tolerant: if a store is missing (first-run during a DB upgrade, manual IndexedDB
 * deletion via DevTools) the clear for that store is silently skipped. The function returns
 * without throwing in any reasonable failure mode so the logout flow it feeds is never blocked
 * by a cache-clear glitch.
 */
export async function clearDataCaches(): Promise<void> {
  try {
    const db = await openDb();
    const available = Array.from(db.objectStoreNames);
    const toWipe = READ_ONLY_CACHE_STORES.filter((n) => available.includes(n));
    if (toWipe.length === 0) return;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(toWipe, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      for (const name of toWipe) {
        tx.objectStore(name).clear();
      }
    });
    // Report stores are opened separately (see reportCache.ts); clear them via their module.
    await reportMetadataStore.clear();
    await reportBodies.clear();
  } catch (err) {
    // Logout flow must not fail because the cache couldn't be wiped. Log and move on — the
    // next session will see stale cache for at most one request, then overwrite.
    console.warn("clearDataCaches failed", err);
  }
}
