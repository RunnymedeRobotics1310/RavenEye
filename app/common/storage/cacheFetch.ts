import { rbfetch } from "~/common/storage/rbauth.ts";
import { API_ETAGS_STORE } from "~/common/storage/db.ts";
import { recordQualifyingResponse } from "~/common/storage/networkHealth.ts";

/**
 * Reusable HTTP cache wrapping {@link rbfetch}. Reads the most recent ETag for {@code url} from
 * IndexedDB, sends {@code If-None-Match} on the conditional GET, and returns either the parsed
 * fresh body (200) or the previous parsed body (304) without re-downloading or re-writing
 * IndexedDB.
 *
 * <p>Layering:
 *
 * <pre>
 * Page hook (e.g. useTournamentList)
 *    ↓ uses
 * rb.ts wrapper (preserves public signature)
 *    ↓ calls
 * cacheFetch(url)                            ← THIS module
 *    ↓ delegates
 * rbfetch(url, headers: If-None-Match)       ← existing 401-refresh-retry stays inside
 *    ↓ calls
 * doRbFetch → fetch
 * </pre>
 *
 * <p>The 401-refresh path inside {@link rbfetch} is unchanged; the cache wrapper only sees the
 * post-refresh result. ETag storage is keyed by URL in the {@code apiEtags} IndexedDB store.
 *
 * <p>Most cacheable endpoints return JSON arrays/objects. The body is parsed once and cached in
 * the {@code apiEtags} record alongside the ETag, so a 304 returns the cached parsed JSON
 * without forcing every caller to maintain its own per-store cache. Callers that already write
 * the parsed body into a domain store (e.g. {@code repository.putTournamentList(...)}) should do
 * so explicitly when {@code fromCache} is false; the cached body in {@code apiEtags} is the
 * source of truth for read-back when {@code fromCache} is true.
 */

let dbHandle: IDBDatabase | null = null;

async function openDb(): Promise<IDBDatabase> {
  if (dbHandle) return dbHandle;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("RavenEyeDB");
    req.onsuccess = () => {
      dbHandle = req.result;
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
  });
}

interface ApiEtagRecord {
  url: string;
  etag: string;
  body: unknown;
  lastSuccess: number;
}

async function readEtag(url: string): Promise<ApiEtagRecord | null> {
  try {
    const db = await openDb();
    return await new Promise<ApiEtagRecord | null>((resolve, reject) => {
      const tx = db.transaction([API_ETAGS_STORE], "readonly");
      const store = tx.objectStore(API_ETAGS_STORE);
      const req = store.get(url);
      req.onsuccess = () => resolve((req.result as ApiEtagRecord | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    // If IndexedDB isn't available (private browsing, fresh install during upgrade), behave
    // like a cold cache. cacheFetch falls back to a non-conditional request.
    return null;
  }
}

async function writeEtag(record: ApiEtagRecord): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([API_ETAGS_STORE], "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(API_ETAGS_STORE).put(record);
    });
  } catch {
    // Quota or unavailable — degrade silently. Next request will be a non-conditional 200.
  }
}

export interface CacheFetchResult<T> {
  /** Parsed JSON body. Comes from the network on 200 or from the IndexedDB cache on 304. */
  body: T;
  /** True when the body was read from cache (server returned 304). False on a fresh 200. */
  fromCache: boolean;
}

/**
 * Conditional GET via {@link rbfetch}, returning the parsed body and a {@code fromCache} flag.
 *
 * <p>Behavior:
 *
 * <ul>
 *   <li>Stored ETag present → adds {@code If-None-Match} to the request.
 *   <li>Server returns 304 → reads parsed body from the {@code apiEtags} cache; does not parse
 *       or write IndexedDB.
 *   <li>Server returns 200 → parses the body, persists {@code (etag, body)} to {@code apiEtags},
 *       returns the body.
 *   <li>Stored ETag present but cached body missing (cache drift) → falls back to a
 *       non-conditional request and re-fetches.
 *   <li>Network failure → throws; cache is untouched.
 * </ul>
 *
 * @param url path under {@code VITE_API_HOST}, e.g. {@code "/api/tournament"}
 * @param init optional fetch overrides; {@code If-None-Match} header is added by the wrapper
 */
export async function cacheFetch<T>(
  url: string,
  init: RequestInit = {},
): Promise<CacheFetchResult<T>> {
  const cached = await readEtag(url);
  const headers: Record<string, string> = {
    ...((init.headers as Record<string, string>) ?? {}),
  };
  // Only send If-None-Match when we actually have a cached body to fall back to.
  // A stored ETag without a cached body indicates cache drift; force a fresh fetch.
  if (cached && cached.etag && cached.body !== undefined) {
    headers["If-None-Match"] = cached.etag;
  }

  const response = await rbfetch(url, { ...init, headers });

  if (response.status === 304 && cached) {
    // 304 is itself a liveness signal — the server validated the ETag. Feed the qualifier
    // with no body (networkHealth treats undefined body as qualifying — the header checks
    // still apply, see recordQualifyingResponse).
    recordQualifyingResponse(url, response);
    return { body: cached.body as T, fromCache: true };
  }

  if (!response.ok) {
    throw new Error(
      `cacheFetch ${url} failed: ${response.status} ${response.statusText}`,
    );
  }

  const body = (await response.json()) as T;
  // Unit 8 liveness qualifier — feed the parsed body so recordQualifyingResponse can run
  // its structural non-empty check (captive-portal defense).
  recordQualifyingResponse(url, response, body);
  const etag = response.headers.get("ETag");
  if (etag) {
    await writeEtag({
      url,
      etag,
      body,
      lastSuccess: Date.now(),
    });
  }
  return { body, fromCache: false };
}

/**
 * Test-only / debug-only: clear all stored ETags. Useful for the "Clear caches" flow (Unit 7)
 * and for development when iterating on server-side ETag emission.
 */
export async function clearApiEtagCache(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([API_ETAGS_STORE], "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(API_ETAGS_STORE).clear();
    });
  } catch {
    // ignore
  }
}
