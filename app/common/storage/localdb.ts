import { useEffect, useState } from "react";
import type { SyncStatus } from "~/types/SyncStatus.ts";
import type { RBTournament } from "~/types/RBTournament.ts";

const DB_NAME = "RavenEyeDB";
const DB_VERSION = 2;
const SYNC_STATUS_STORE = "syncStatus";
const TOURNAMENT_LIST_STORE = "tournamentList";

export class Repository {
  private db: IDBDatabase | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(SYNC_STATUS_STORE)) {
          db.createObjectStore(SYNC_STATUS_STORE, { keyPath: "component" });
        }
        if (!db.objectStoreNames.contains(TOURNAMENT_LIST_STORE)) {
          db.createObjectStore(TOURNAMENT_LIST_STORE, { autoIncrement: true });
        }
      };
    });
  }

  async putSyncStatus(status: SyncStatus): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SYNC_STATUS_STORE], "readwrite");
      const store = transaction.objectStore(SYNC_STATUS_STORE);

      // Handle Date serialization if necessary, but IndexedDB supports Dates
      // Handle Error serialization - Error objects don't serialize well to IndexedDB
      const dataToStore = {
        ...status,
        error: status.error
          ? { message: status.error.message, name: status.error.name }
          : null,
      };

      const request = store.put(dataToStore);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncStatus(component: string): Promise<SyncStatus | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SYNC_STATUS_STORE], "readonly");
      const store = transaction.objectStore(SYNC_STATUS_STORE);
      const request = store.get(component);

      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }

        // Reconstruct Error if it exists
        if (result.error && typeof result.error === "object") {
          const err = new Error(result.error.message);
          err.name = result.error.name;
          result.error = err;
        }
        resolve(result as SyncStatus);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async putTournamentList(list: RBTournament[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TOURNAMENT_LIST_STORE], "readwrite");
      const store = transaction.objectStore(TOURNAMENT_LIST_STORE);

      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        for (const item of list) {
          store.add(item);
        }
        resolve();
      };
      clearRequest.onerror = () => reject(clearRequest.error);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getTournamentList(): Promise<RBTournament[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TOURNAMENT_LIST_STORE], "readonly");
      const store = transaction.objectStore(TOURNAMENT_LIST_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as RBTournament[]);
      request.onerror = () => reject(request.error);
    });
  }
}

export const repository = new Repository();

export function useTournamentList() {
  const [list, setList] = useState<RBTournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const data = await repository.getTournamentList();
        if (isMounted) {
          setList(data);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load tournament list", err);
      }
    };

    load();
    const interval = setInterval(load, 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { list, loading };
}

export function useSyncStatus(component: string): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>({
    loading: true,
    component,
    lastSync: new Date(0),
    inProgress: false,
    isComplete: false,
    remaining: 0,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const data = await repository.getSyncStatus(component);
        if (isMounted && data) {
          setStatus(data);
        }
      } catch (err) {
        console.error(`Failed to load sync status for ${component}`, err);
      }
    };

    load();

    const interval = setInterval(load, 1000); // Poll for changes

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [component]);

  return status;
}
