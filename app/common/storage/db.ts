import type { SyncStatus } from "~/types/SyncStatus.ts";
import type { RBTournament } from "~/types/RBTournament.ts";
import type { StrategyArea } from "~/types/StrategyArea.ts";
import type { EventType } from "~/types/EventType.ts";
import type { SequenceType } from "~/types/SequenceType.ts";

import type { RBScheduleRecord } from "~/types/RBScheduleRecord.ts";

const DB_NAME = "RavenEyeDB";
const DB_VERSION = 6;
const SYNC_STATUS_STORE = "syncStatus";
const TOURNAMENT_LIST_STORE = "tournamentList";
const STRATEGY_AREAS_STORE = "strategyAreas";
const EVENT_TYPES_STORE = "eventTypes";
const SEQUENCE_TYPES_STORE = "sequenceTypes";
const MATCH_SCHEDULE_STORE = "matchSchedule";

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

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(SYNC_STATUS_STORE)) {
          db.createObjectStore(SYNC_STATUS_STORE, { keyPath: "component" });
        }
        if (!db.objectStoreNames.contains(TOURNAMENT_LIST_STORE)) {
          db.createObjectStore(TOURNAMENT_LIST_STORE, { autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(STRATEGY_AREAS_STORE)) {
          db.createObjectStore(STRATEGY_AREAS_STORE, { autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(EVENT_TYPES_STORE)) {
          db.createObjectStore(EVENT_TYPES_STORE, { autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(SEQUENCE_TYPES_STORE)) {
          db.createObjectStore(SEQUENCE_TYPES_STORE, { autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(MATCH_SCHEDULE_STORE)) {
          db.createObjectStore(MATCH_SCHEDULE_STORE, { autoIncrement: true });
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

  async putStrategyAreaList(list: StrategyArea[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STRATEGY_AREAS_STORE], "readwrite");
      const store = transaction.objectStore(STRATEGY_AREAS_STORE);

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

  async getStrategyAreaList(): Promise<StrategyArea[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STRATEGY_AREAS_STORE], "readonly");
      const store = transaction.objectStore(STRATEGY_AREAS_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as StrategyArea[]);
      request.onerror = () => reject(request.error);
    });
  }

  async putEventTypeList(list: EventType[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([EVENT_TYPES_STORE], "readwrite");
      const store = transaction.objectStore(EVENT_TYPES_STORE);

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

  async getEventTypeList(): Promise<EventType[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([EVENT_TYPES_STORE], "readonly");
      const store = transaction.objectStore(EVENT_TYPES_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as EventType[]);
      request.onerror = () => reject(request.error);
    });
  }

  async putSequenceTypeList(list: SequenceType[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SEQUENCE_TYPES_STORE], "readwrite");
      const store = transaction.objectStore(SEQUENCE_TYPES_STORE);

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

  async getSequenceTypeList(): Promise<SequenceType[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SEQUENCE_TYPES_STORE], "readonly");
      const store = transaction.objectStore(SEQUENCE_TYPES_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as SequenceType[]);
      request.onerror = () => reject(request.error);
    });
  }

  async putMatchSchedule(list: RBScheduleRecord[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MATCH_SCHEDULE_STORE], "readwrite");
      const store = transaction.objectStore(MATCH_SCHEDULE_STORE);

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

  async getMatchSchedule(): Promise<RBScheduleRecord[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MATCH_SCHEDULE_STORE], "readonly");
      const store = transaction.objectStore(MATCH_SCHEDULE_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as RBScheduleRecord[]);
      request.onerror = () => reject(request.error);
    });
  }
}

export const repository = new Repository();
