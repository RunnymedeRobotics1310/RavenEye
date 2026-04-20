import type { SyncStatus } from "~/types/SyncStatus.ts";
import type { RBTournament } from "~/types/RBTournament.ts";
import type { StrategyArea } from "~/types/StrategyArea.ts";
import type { EventType } from "~/types/EventType.ts";
import type { SequenceType } from "~/types/SequenceType.ts";

import type { RBScheduleRecord } from "~/types/RBScheduleRecord.ts";
import type { RBQuickComment } from "~/types/RBQuickComment.ts";
import type { RBEventLogRecord } from "~/types/RBEventLogRecord.ts";
import type { RBRobotAlert } from "~/types/RBRobotAlert.ts";
import type { CustomTournamentStats } from "~/types/TeamSummaryReport.ts";
import type { StrategyStroke } from "~/types/StrategyStroke.ts";
import type { TeamCapability } from "~/types/TeamCapability.ts";

const DB_NAME = "RavenEyeDB";
// Bumped to 16 for the team-capability object store (P1 Unit 6).
const DB_VERSION = 16;
const SYNC_STATUS_STORE = "syncStatus";
const TOURNAMENT_LIST_STORE = "tournamentList";
const STRATEGY_AREAS_STORE = "strategyAreas";
const EVENT_TYPES_STORE = "eventTypes";
const SEQUENCE_TYPES_STORE = "sequenceTypes";
const MATCH_SCHEDULE_STORE = "matchSchedule";
const NEW_COMMENT_STORE = "commentsNew";
const SYNC_COMMENT_STORE = "commentsSynced";
const NEW_EVENT_STORE = "eventsNew";
const SYNC_EVENT_STORE = "eventsSynced";
const NEW_ALERT_STORE = "robotAlertsNew";
const SYNC_ALERT_STORE = "robotAlertsSynced";
const ROBOT_ALERTS_STORE = "robotAlerts";
const TEAM_TOURNAMENT_IDS_STORE = "teamTournamentIds";
const CUSTOM_STATS_CACHE_STORE = "customStatsCache";
const STRATEGY_PLAN_STORE = "strategyPlans";
const STRATEGY_DRAWING_STORE = "strategyDrawings";
// Team capability rows, keyed by tournamentId. One record per tournament holds the full array
// of TeamCapability rows emitted by GET /api/team-capability/{tournamentId}. Overwrite-on-write
// by the sync job; readers (Units 7 & 8) pull straight from IndexedDB to stay offline-capable.
const TEAM_CAPABILITY_STORE = "teamCapability";
// HTTP cache metadata: one record per URL holding the most recent ETag returned by RavenBrain.
// Keyed by URL path so cacheFetch can build conditional GETs (If-None-Match) and short-circuit
// IndexedDB writes on 304. List-style endpoints (tournament list, strategy areas, ...) get one
// entry per URL; per-entity endpoints (report body) get one entry per URL+key. See cacheFetch.ts.
export const API_ETAGS_STORE = "apiEtags";

/**
 * Minimal typed reference to a single match in a tournament — the three
 * fields that uniquely identify a strategy plan. Mirrors the pattern of
 * `ScoutingSessionId` but with only the match-identifying fields (no
 * alliance / team / user). Used as both the input to, and the parsed
 * output from, the strategy-plan local-key serialisation below.
 */
export interface StrategyPlanMatchRef {
  tournamentId: string;
  matchLevel: string;
  matchNumber: number;
}

const LOCAL_KEY_SEPARATOR = "|";

export function strategyPlanLocalKey(ref: StrategyPlanMatchRef): string {
  return (
    ref.tournamentId +
    LOCAL_KEY_SEPARATOR +
    ref.matchLevel +
    LOCAL_KEY_SEPARATOR +
    ref.matchNumber
  );
}

export function parseStrategyPlanLocalKey(key: string): StrategyPlanMatchRef {
  const parts = key.split(LOCAL_KEY_SEPARATOR);
  return {
    tournamentId: parts[0] ?? "",
    matchLevel: parts[1] ?? "",
    matchNumber: parseInt(parts[2] ?? "0", 10),
  };
}

export interface StoredStrategyPlan {
  localKey: string;
  id: number | null;
  tournamentId: string;
  matchLevel: string;
  matchNumber: number;
  shortSummary: string;
  strategyText: string | null;
  updatedByUserId: number;
  updatedByDisplayName: string;
  updatedAt: string;
  dirty: boolean;
}

export interface StoredStrategyDrawing {
  localId: string; // `srv-${serverId}` once synced; `new-${uuid}` while pending
  planLocalKey: string;
  id: number | null;
  planId: number | null;
  label: string;
  strokes: StrategyStroke[];
  createdByUserId: number | null;
  createdByDisplayName: string | null;
  updatedByUserId: number | null;
  updatedByDisplayName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  dirty: boolean;
  pendingDelete: boolean;
}

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
          db.createObjectStore(TOURNAMENT_LIST_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STRATEGY_AREAS_STORE)) {
          db.createObjectStore(STRATEGY_AREAS_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(EVENT_TYPES_STORE)) {
          db.createObjectStore(EVENT_TYPES_STORE, { keyPath: "eventtype" });
        }
        if (!db.objectStoreNames.contains(SEQUENCE_TYPES_STORE)) {
          db.createObjectStore(SEQUENCE_TYPES_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(MATCH_SCHEDULE_STORE)) {
          db.createObjectStore(MATCH_SCHEDULE_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(NEW_COMMENT_STORE)) {
          db.createObjectStore(NEW_COMMENT_STORE);
        }
        if (!db.objectStoreNames.contains(SYNC_COMMENT_STORE)) {
          db.createObjectStore(SYNC_COMMENT_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(NEW_EVENT_STORE)) {
          db.createObjectStore(NEW_EVENT_STORE);
        }
        if (!db.objectStoreNames.contains(SYNC_EVENT_STORE)) {
          db.createObjectStore(SYNC_EVENT_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(NEW_ALERT_STORE)) {
          db.createObjectStore(NEW_ALERT_STORE);
        }
        if (!db.objectStoreNames.contains(SYNC_ALERT_STORE)) {
          db.createObjectStore(SYNC_ALERT_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(ROBOT_ALERTS_STORE)) {
          db.createObjectStore(ROBOT_ALERTS_STORE, { autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(TEAM_TOURNAMENT_IDS_STORE)) {
          db.createObjectStore(TEAM_TOURNAMENT_IDS_STORE, { autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(CUSTOM_STATS_CACHE_STORE)) {
          db.createObjectStore(CUSTOM_STATS_CACHE_STORE, { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains(STRATEGY_PLAN_STORE)) {
          db.createObjectStore(STRATEGY_PLAN_STORE, { keyPath: "localKey" });
        }
        if (!db.objectStoreNames.contains(STRATEGY_DRAWING_STORE)) {
          const drawingStore = db.createObjectStore(STRATEGY_DRAWING_STORE, {
            keyPath: "localId",
          });
          drawingStore.createIndex("planLocalKey", "planLocalKey", {
            unique: false,
          });
        }
        if (!db.objectStoreNames.contains(API_ETAGS_STORE)) {
          db.createObjectStore(API_ETAGS_STORE, { keyPath: "url" });
        }
        // Unit 6: reports-in-IndexedDB stores. See app/common/storage/reportCache.ts.
        if (!db.objectStoreNames.contains("reportMetadata")) {
          db.createObjectStore("reportMetadata", { keyPath: "cachekey" });
        }
        if (!db.objectStoreNames.contains("reportBodies")) {
          db.createObjectStore("reportBodies", { keyPath: "cachekey" });
        }
        // P1 Unit 6: team-capability rows, one array per tournamentId. Populated by the
        // JOBS scheduler; read by Units 7 (schedule page) and 8 (strategy page).
        if (!db.objectStoreNames.contains(TEAM_CAPABILITY_STORE)) {
          db.createObjectStore(TEAM_CAPABILITY_STORE, { keyPath: "tournamentId" });
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

  async mergeMatchSchedule(list: RBScheduleRecord[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MATCH_SCHEDULE_STORE], "readwrite");
      const store = transaction.objectStore(MATCH_SCHEDULE_STORE);
      for (const item of list) {
        store.put(item);
      }
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

  async captureComment(item: RBQuickComment): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([NEW_COMMENT_STORE], "readwrite");

      const store = transaction.objectStore(NEW_COMMENT_STORE);
      const storeRequest = store.add(item, unsyncCommentKey(item));
      storeRequest.onsuccess = () => resolve();
      storeRequest.onerror = () => reject(storeRequest.error);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getUnsynchronizedComments(): Promise<RBQuickComment[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([NEW_COMMENT_STORE], "readonly");
      const store = transaction.objectStore(NEW_COMMENT_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as RBQuickComment[]);
      request.onerror = () => reject(request.error);
    });
  }

  async markCommentSynchronized(items: RBQuickComment[]): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [NEW_COMMENT_STORE, SYNC_COMMENT_STORE],
        "readwrite",
      );
      const newStore = transaction.objectStore(NEW_COMMENT_STORE);
      const syncStore = transaction.objectStore(SYNC_COMMENT_STORE);

      items.forEach((item) => {
        const key = unsyncCommentKey(item);
        const newStoreReq = newStore.get(key);
        newStoreReq.onsuccess = () => {
          syncStore.put(item);
          newStore.delete(key);
        };
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async captureEvent(item: RBEventLogRecord): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([NEW_EVENT_STORE], "readwrite");

      const store = transaction.objectStore(NEW_EVENT_STORE);
      const storeRequest = store.add(item, unsyncEventKey(item));
      storeRequest.onsuccess = () => resolve();
      storeRequest.onerror = () => reject(storeRequest.error);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getUnsynchronizedEvents(): Promise<RBEventLogRecord[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([NEW_EVENT_STORE], "readonly");
      const store = transaction.objectStore(NEW_EVENT_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as RBEventLogRecord[]);
      request.onerror = () => reject(request.error);
    });
  }

  async markEventSynchronized(items: RBEventLogRecord[]): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [NEW_EVENT_STORE, SYNC_EVENT_STORE],
        "readwrite",
      );
      const newStore = transaction.objectStore(NEW_EVENT_STORE);
      const syncStore = transaction.objectStore(SYNC_EVENT_STORE);

      items.forEach((item) => {
        const key = unsyncEventKey(item);
        const newStoreReq = newStore.get(key);
        newStoreReq.onsuccess = () => {
          syncStore.put(item);
          newStore.delete(key);
        };
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async captureRobotAlert(item: RBRobotAlert): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([NEW_ALERT_STORE], "readwrite");

      const store = transaction.objectStore(NEW_ALERT_STORE);
      const storeRequest = store.add(item, unsyncAlertKey(item));
      storeRequest.onsuccess = () => resolve();
      storeRequest.onerror = () => reject(storeRequest.error);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getUnsynchronizedRobotAlerts(): Promise<RBRobotAlert[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([NEW_ALERT_STORE], "readonly");
      const store = transaction.objectStore(NEW_ALERT_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as RBRobotAlert[]);
      request.onerror = () => reject(request.error);
    });
  }

  async markRobotAlertSynchronized(items: RBRobotAlert[]): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [NEW_ALERT_STORE, SYNC_ALERT_STORE],
        "readwrite",
      );
      const newStore = transaction.objectStore(NEW_ALERT_STORE);
      const syncStore = transaction.objectStore(SYNC_ALERT_STORE);

      items.forEach((item) => {
        const key = unsyncAlertKey(item);
        const newStoreReq = newStore.get(key);
        newStoreReq.onsuccess = () => {
          syncStore.put(item);
          newStore.delete(key);
        };
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async putRobotAlerts(list: RBRobotAlert[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([ROBOT_ALERTS_STORE], "readwrite");
      const store = transaction.objectStore(ROBOT_ALERTS_STORE);

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

  async getRobotAlerts(): Promise<RBRobotAlert[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([ROBOT_ALERTS_STORE], "readonly");
      const store = transaction.objectStore(ROBOT_ALERTS_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as RBRobotAlert[]);
      request.onerror = () => reject(request.error);
    });
  }

  async getRobotAlertsForTeam(teamNumber: number): Promise<RBRobotAlert[]> {
    const all = await this.getRobotAlerts();
    return all.filter((a) => a.teamNumber === teamNumber);
  }

  async putTeamTournamentIds(ids: string[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [TEAM_TOURNAMENT_IDS_STORE],
        "readwrite",
      );
      const store = transaction.objectStore(TEAM_TOURNAMENT_IDS_STORE);

      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        for (const id of ids) {
          store.add(id);
        }
        resolve();
      };
      clearRequest.onerror = () => reject(clearRequest.error);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getTeamTournamentIds(): Promise<string[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [TEAM_TOURNAMENT_IDS_STORE],
        "readonly",
      );
      const store = transaction.objectStore(TEAM_TOURNAMENT_IDS_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(request.error);
    });
  }

  async putCustomStatsCache(
    teamId: number,
    stats: CustomTournamentStats[],
  ): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [CUSTOM_STATS_CACHE_STORE],
        "readwrite",
      );
      const store = transaction.objectStore(CUSTOM_STATS_CACHE_STORE);
      store.put({ key: teamId, stats, cachedAt: Date.now() });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getCustomStatsCache(
    teamId: number,
  ): Promise<{ stats: CustomTournamentStats[]; cachedAt: number } | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [CUSTOM_STATS_CACHE_STORE],
        "readonly",
      );
      const store = transaction.objectStore(CUSTOM_STATS_CACHE_STORE);
      const request = store.get(teamId);
      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }
        resolve({ stats: result.stats, cachedAt: result.cachedAt });
      };
      request.onerror = () => reject(request.error);
    });
  }

  // -------- Match Strategy Plans --------

  async putStrategyPlan(stored: StoredStrategyPlan): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STRATEGY_PLAN_STORE], "readwrite");
      tx.objectStore(STRATEGY_PLAN_STORE).put(stored);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getStrategyPlan(localKey: string): Promise<StoredStrategyPlan | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STRATEGY_PLAN_STORE], "readonly");
      const req = tx.objectStore(STRATEGY_PLAN_STORE).get(localKey);
      req.onsuccess = () =>
        resolve((req.result as StoredStrategyPlan | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  }

  async getStrategyPlansForTournament(
    tournamentId: string,
  ): Promise<StoredStrategyPlan[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STRATEGY_PLAN_STORE], "readonly");
      const req = tx.objectStore(STRATEGY_PLAN_STORE).getAll();
      req.onsuccess = () => {
        const all = (req.result as StoredStrategyPlan[]) ?? [];
        resolve(all.filter((p) => p.tournamentId === tournamentId));
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getDirtyStrategyPlans(): Promise<StoredStrategyPlan[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STRATEGY_PLAN_STORE], "readonly");
      const req = tx.objectStore(STRATEGY_PLAN_STORE).getAll();
      req.onsuccess = () => {
        const all = (req.result as StoredStrategyPlan[]) ?? [];
        resolve(all.filter((p) => p.dirty));
      };
      req.onerror = () => reject(req.error);
    });
  }

  // -------- Match Strategy Drawings --------

  async putStrategyDrawing(stored: StoredStrategyDrawing): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STRATEGY_DRAWING_STORE], "readwrite");
      tx.objectStore(STRATEGY_DRAWING_STORE).put(stored);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getStrategyDrawing(
    localId: string,
  ): Promise<StoredStrategyDrawing | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STRATEGY_DRAWING_STORE], "readonly");
      const req = tx.objectStore(STRATEGY_DRAWING_STORE).get(localId);
      req.onsuccess = () =>
        resolve((req.result as StoredStrategyDrawing | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  }

  async getStrategyDrawingsForPlan(
    planLocalKey: string,
  ): Promise<StoredStrategyDrawing[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STRATEGY_DRAWING_STORE], "readonly");
      const store = tx.objectStore(STRATEGY_DRAWING_STORE);
      const index = store.index("planLocalKey");
      const req = index.getAll(IDBKeyRange.only(planLocalKey));
      req.onsuccess = () => {
        const all = (req.result as StoredStrategyDrawing[]) ?? [];
        resolve(all.filter((d) => !d.pendingDelete));
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getDirtyStrategyDrawings(): Promise<StoredStrategyDrawing[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STRATEGY_DRAWING_STORE], "readonly");
      const req = tx.objectStore(STRATEGY_DRAWING_STORE).getAll();
      req.onsuccess = () => {
        const all = (req.result as StoredStrategyDrawing[]) ?? [];
        resolve(all.filter((d) => d.dirty && !d.pendingDelete));
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getPendingDeleteStrategyDrawings(): Promise<StoredStrategyDrawing[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STRATEGY_DRAWING_STORE], "readonly");
      const req = tx.objectStore(STRATEGY_DRAWING_STORE).getAll();
      req.onsuccess = () => {
        const all = (req.result as StoredStrategyDrawing[]) ?? [];
        resolve(all.filter((d) => d.pendingDelete));
      };
      req.onerror = () => reject(req.error);
    });
  }

  async deleteStrategyDrawingLocal(localId: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STRATEGY_DRAWING_STORE], "readwrite");
      tx.objectStore(STRATEGY_DRAWING_STORE).delete(localId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Replace a drawing's localId with a new one (used when a `new-*` localId
   * is upgraded to `srv-<serverId>` after first successful sync).
   */
  async renameStrategyDrawing(
    oldLocalId: string,
    replacement: StoredStrategyDrawing,
  ): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STRATEGY_DRAWING_STORE], "readwrite");
      const store = tx.objectStore(STRATEGY_DRAWING_STORE);
      if (oldLocalId !== replacement.localId) {
        store.delete(oldLocalId);
      }
      store.put(replacement);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // -------- Team Capability (P1 Unit 6) --------

  /**
   * Overwrite the team-capability rows for a single tournament. One record in the store holds
   * the full array under the tournamentId key; the sync job re-writes the whole array on every
   * refresh (readers Units 7 & 8 always see a consistent snapshot).
   */
  async putTeamCapability(
    tournamentId: string,
    rows: TeamCapability[],
  ): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([TEAM_CAPABILITY_STORE], "readwrite");
      tx.objectStore(TEAM_CAPABILITY_STORE).put({ tournamentId, rows });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Read the cached team-capability rows for a tournament. Returns an empty array when the
   * sync has not populated this tournament yet (cold IndexedDB / first-visit offline).
   */
  async getTeamCapability(tournamentId: string): Promise<TeamCapability[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([TEAM_CAPABILITY_STORE], "readonly");
      const req = tx.objectStore(TEAM_CAPABILITY_STORE).get(tournamentId);
      req.onsuccess = () => {
        const record = req.result as
          | { tournamentId: string; rows: TeamCapability[] }
          | undefined;
        resolve(record?.rows ?? []);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async clearCustomStatsCache(teamId: number): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [CUSTOM_STATS_CACHE_STORE],
        "readwrite",
      );
      const store = transaction.objectStore(CUSTOM_STATS_CACHE_STORE);
      store.delete(teamId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

/**
 * Construct a stable key for the comment in the sync table. We do not need it in the other table.
 * @param item RBQuickComment item
 */
const unsyncCommentKey = (item: RBQuickComment): string => {
  // re-parse date
  if (item.timestamp instanceof Date) {
    /* empty */
  } else {
    item.timestamp = new Date(item.timestamp);
  }
  return "user(" + item.userId + ")-" + item.timestamp.getTime();
};

const unsyncEventKey = (item: RBEventLogRecord): string => {
  // re-parse date
  if (item.timestamp instanceof Date) {
    /* empty */
  } else {
    item.timestamp = new Date(item.timestamp);
  }
  return (
    "user(" +
    item.userId +
    ")-" +
    item.timestamp.getTime() +
    "-" +
    item.eventType
  );
};

const unsyncAlertKey = (item: RBRobotAlert): string => {
  // re-parse date
  if (item.createdAt instanceof Date) {
    /* empty */
  } else {
    item.createdAt = new Date(item.createdAt);
  }
  return "user(" + item.userId + ")-" + item.createdAt.getTime();
};

export const repository = new Repository();
