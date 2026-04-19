import { cacheFetch } from "~/common/storage/cacheFetch.ts";
import { rbfetch } from "~/common/storage/rbauth.ts";
import {
  reportBodies,
  reportMetadataStore,
  type ReportBodyRecord,
  type ReportMetadataRecord,
} from "~/common/storage/reportCache.ts";
import { serverNow } from "~/common/storage/serverTime.ts";
import { getReportBodyTtlDays } from "~/common/storage/syncConfig.ts";

/**
 * Report caching layer (Unit 6). Backs the reports-in-IndexedDB model:
 *
 * <ul>
 *   <li>{@link syncReportMetadata} pulls the season-wide {@code [{cachekey, created}]} list
 *       from {@code GET /api/report/metadata} and writes it to {@code reportMetadataStore}.
 *       Runs on the sync-tick loop at the tournament-window cadence when the user has reports
 *       access. Via {@link cacheFetch} the call is a 304 in steady state.
 *   <li>{@link pullReportBody} fetches a specific cached report by its cachekey and writes the
 *       body to {@code reportBodies} along with the current {@code created} version from the
 *       metadata table. Called by the {@code useReportBody(key)} hook (added by the report page
 *       migrations) on first open and again when the metadata version bumps.
 *   <li>{@link prewarmOneReportBody} pulls one body per tick whose local {@code versionStored}
 *       is behind the server {@code created}. Low-priority; runs only when the rest of the tick
 *       did no other network work.
 *   <li>{@link evictExpiredReportBodies} runs inside the sync-tick eviction pass (added in
 *       Unit 7) and deletes bodies whose {@code pulledAt} is older than
 *       {@code raven-eye.sync.report-body-ttl-days}.
 * </ul>
 *
 * <p>Endpoint-to-URL rule: a cachekey like {@code "pmva:v5:2026onto"} maps to the already-
 * existing server endpoint that produces it. Rather than hard-code every mapping here, the
 * body-pull helpers accept a URL directly; the {@code useReportBody} hook owns the cachekey →
 * URL translation, which is a per-report-page concern.
 */

/** Call the metadata endpoint; writes every tuple to IndexedDB. */
export async function syncReportMetadata(): Promise<void> {
  const { body } = await cacheFetch<ReportMetadataRecord[]>("/api/report/metadata");
  await reportMetadataStore.putAll(body);
}

/** Read all metadata tuples from IndexedDB. */
export async function listReportMetadata(): Promise<ReportMetadataRecord[]> {
  return reportMetadataStore.getAll();
}

/** Read one metadata tuple from IndexedDB. */
export async function getReportMetadata(
  cachekey: string,
): Promise<ReportMetadataRecord | null> {
  return reportMetadataStore.get(cachekey);
}

/** Read one body from IndexedDB. */
export async function getCachedReportBody(
  cachekey: string,
): Promise<ReportBodyRecord | null> {
  return reportBodies.get(cachekey);
}

/**
 * Fetch a report body from the server, store it in IndexedDB, return the record. Caller supplies
 * the {@code url} (the specific report endpoint) and the {@code version} timestamp that the body
 * corresponds to (typically the {@code created} from the matching metadata tuple). {@link cacheFetch}
 * is not used here — the existing report endpoints already emit weak ETags via Unit 1, but the
 * client wants each body in its own IndexedDB record, not in the shared apiEtags cache.
 */
export async function pullReportBody(
  cachekey: string,
  url: string,
  version: number,
): Promise<ReportBodyRecord> {
  const resp = await rbfetch(url, {});
  if (!resp.ok) {
    throw new Error(
      `Failed to fetch report body for ${cachekey} at ${url}: ${resp.status}`,
    );
  }
  const body = await resp.json();
  const record: ReportBodyRecord = {
    cachekey,
    body,
    versionStored: version,
    pulledAt: serverNow(),
  };
  await reportBodies.put(record);
  return record;
}

/**
 * Find one metadata tuple whose body is missing or stale and pull it. Returns true when it did
 * work (caller can gate other low-priority jobs on that). The URL lookup uses the same
 * cachekey → URL mapping the hooks use, passed in by the registered job so reportSync.ts does
 * not have to know every endpoint shape.
 */
export async function prewarmOneReportBody(
  cacheKeyToUrl: (cachekey: string) => string | null,
): Promise<boolean> {
  const metadata = await listReportMetadata();
  for (const m of metadata) {
    const existing = await getCachedReportBody(m.cachekey);
    const serverVersion = new Date(m.created).getTime();
    if (existing && existing.versionStored >= serverVersion) continue;
    const url = cacheKeyToUrl(m.cachekey);
    if (!url) continue;
    await pullReportBody(m.cachekey, url, serverVersion);
    return true;
  }
  return false;
}

/** Evict report bodies older than the configured TTL. Returns the count evicted. */
export async function evictExpiredReportBodies(): Promise<number> {
  const ttlMs = getReportBodyTtlDays() * 24 * 60 * 60 * 1000;
  const cutoff = serverNow() - ttlMs;
  const all = await reportBodies.getAll();
  const victims = all.filter((b) => b.pulledAt < cutoff).map((b) => b.cachekey);
  if (victims.length === 0) return 0;
  await reportBodies.deleteMany(victims);
  return victims.length;
}
