/**
 * IndexedDB-backed stores for Unit 6's reports-in-IndexedDB layer. Kept in a separate module
 * from the main {@code db.ts} repository so the reports feature can evolve without touching
 * unrelated schema. Stores are created in the same {@code RavenEyeDB} database via a version
 * bump alongside {@code apiEtags} (Unit 3).
 */

const DB_NAME = "RavenEyeDB";
const REPORT_METADATA_STORE = "reportMetadata";
const REPORT_BODIES_STORE = "reportBodies";

/** Server-projected metadata tuple: cachekey plus "last rebuild" timestamp (ISO-8601 string). */
export interface ReportMetadataRecord {
  cachekey: string;
  /** ISO-8601 server timestamp — {@code RB_REPORT_CACHE.created} rendered for the client. */
  created: string;
}

/** Cached report body record. */
export interface ReportBodyRecord {
  cachekey: string;
  /** Parsed JSON body exactly as returned by the report endpoint. */
  body: unknown;
  /** Epoch-millis copy of the server's {@code created} at the time this body was pulled. */
  versionStored: number;
  /** Epoch-millis (serverNow-corrected) when this body was written locally. Drives TTL eviction. */
  pulledAt: number;
}

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

export const reportMetadataStore = {
  async putAll(records: ReportMetadataRecord[]): Promise<void> {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([REPORT_METADATA_STORE], "readwrite");
      const store = tx.objectStore(REPORT_METADATA_STORE);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      store.clear();
      for (const r of records) store.put(r);
    });
  },

  async getAll(): Promise<ReportMetadataRecord[]> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([REPORT_METADATA_STORE], "readonly");
      const req = tx.objectStore(REPORT_METADATA_STORE).getAll();
      req.onsuccess = () => resolve(req.result as ReportMetadataRecord[]);
      req.onerror = () => reject(req.error);
    });
  },

  async get(cachekey: string): Promise<ReportMetadataRecord | null> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([REPORT_METADATA_STORE], "readonly");
      const req = tx.objectStore(REPORT_METADATA_STORE).get(cachekey);
      req.onsuccess = () =>
        resolve((req.result as ReportMetadataRecord | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  },

  async clear(): Promise<void> {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([REPORT_METADATA_STORE], "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(REPORT_METADATA_STORE).clear();
    });
  },
};

export const reportBodies = {
  async put(record: ReportBodyRecord): Promise<void> {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([REPORT_BODIES_STORE], "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(REPORT_BODIES_STORE).put(record);
    });
  },

  async get(cachekey: string): Promise<ReportBodyRecord | null> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([REPORT_BODIES_STORE], "readonly");
      const req = tx.objectStore(REPORT_BODIES_STORE).get(cachekey);
      req.onsuccess = () =>
        resolve((req.result as ReportBodyRecord | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  },

  async getAll(): Promise<ReportBodyRecord[]> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([REPORT_BODIES_STORE], "readonly");
      const req = tx.objectStore(REPORT_BODIES_STORE).getAll();
      req.onsuccess = () => resolve(req.result as ReportBodyRecord[]);
      req.onerror = () => reject(req.error);
    });
  },

  async deleteMany(cachekeys: string[]): Promise<void> {
    if (cachekeys.length === 0) return;
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([REPORT_BODIES_STORE], "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      const store = tx.objectStore(REPORT_BODIES_STORE);
      for (const k of cachekeys) store.delete(k);
    });
  },

  async clear(): Promise<void> {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([REPORT_BODIES_STORE], "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(REPORT_BODIES_STORE).clear();
    });
  },
};

/** Store names, exported for the DB upgrade hook in db.ts. */
export const REPORT_STORES = {
  METADATA: REPORT_METADATA_STORE,
  BODIES: REPORT_BODIES_STORE,
};
