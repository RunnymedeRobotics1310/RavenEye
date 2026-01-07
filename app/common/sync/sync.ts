import type { SyncStatus } from "~/types/SyncStatus.ts";
import { repository, useSyncStatus } from "~/common/storage/db.ts";
import {
  getEventTypeList,
  getStrategyAreaList,
  getTournamentList,
  ping,
} from "~/common/storage/rb.ts";

function log(msg: string): void {
  console.log(
    "[sync] " +
      msg +
      " at " +
      new Date().toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      }),
  );
}
let syncInitialized = false;

export function doSync() {
  ping().then((alive) => {
    if (alive) {
      syncTournamentList();
      syncStrategyAreaList();
      syncEventTypeList();
    } else {
      log("Skipping - not connected");
    }
  });
}

export function initializeSyncSchedule() {
  if (syncInitialized) return;
  syncInitialized = true;

  doSync();
  setInterval(() => {
    doSync();
  }, 15000);
}

export async function syncTournamentList() {
  log("Tournament List");
  await repository.putSyncStatus({
    loading: false,
    component: "Tournament List",
    lastSync: new Date(),
    inProgress: true,
    isComplete: false,
    remaining: 0,
    error: null,
  });

  try {
    const data = await getTournamentList();
    await repository.putTournamentList(data);
    await repository.putSyncStatus({
      loading: false,
      component: "Tournament List",
      lastSync: new Date(),
      inProgress: false,
      isComplete: true,
      remaining: 0,
      error: null,
    });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    await repository.putSyncStatus({
      loading: false,
      component: "Tournament List",
      lastSync: new Date(),
      inProgress: false,
      isComplete: false,
      remaining: 0,
      error: err,
    });
  }
}

export async function syncStrategyAreaList() {
  log("Strategy Area List");
  await repository.putSyncStatus({
    loading: false,
    component: "Strategy Areas",
    lastSync: new Date(),
    inProgress: true,
    isComplete: false,
    remaining: 0,
    error: null,
  });

  try {
    const data = await getStrategyAreaList();
    await repository.putStrategyAreaList(data);
    await repository.putSyncStatus({
      loading: false,
      component: "Strategy Areas",
      lastSync: new Date(),
      inProgress: false,
      isComplete: true,
      remaining: 0,
      error: null,
    });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    await repository.putSyncStatus({
      loading: false,
      component: "Strategy Areas",
      lastSync: new Date(),
      inProgress: false,
      isComplete: false,
      remaining: 0,
      error: err,
    });
  }
}

export async function syncEventTypeList() {
  log("Event Type List");
  await repository.putSyncStatus({
    loading: false,
    component: "Event Types",
    lastSync: new Date(),
    inProgress: true,
    isComplete: false,
    remaining: 0,
    error: null,
  });

  try {
    const data = await getEventTypeList();
    await repository.putEventTypeList(data);
    await repository.putSyncStatus({
      loading: false,
      component: "Event Types",
      lastSync: new Date(),
      inProgress: false,
      isComplete: true,
      remaining: 0,
      error: null,
    });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    await repository.putSyncStatus({
      loading: false,
      component: "Event Types",
      lastSync: new Date(),
      inProgress: false,
      isComplete: false,
      remaining: 0,
      error: err,
    });
  }
}

export const useDashboardDataSyncStatus = (): SyncStatus => {
  const dummy: SyncStatus = {
    loading: false,
    component: "Dashboard Data",
    lastSync: new Date(),
    inProgress: false,
    isComplete: true,
    remaining: 0,
    error: new Error("Not yet implemented"),
  };
  return dummy;
};

export const useEventTypesSyncStatus = (): SyncStatus => {
  return useSyncStatus("Event Types");
};

export const useMatchScheduleSyncStatus = (): SyncStatus => {
  const dummy: SyncStatus = {
    loading: false,
    component: "Match Schedule",
    lastSync: new Date(),
    inProgress: false,
    isComplete: true,
    remaining: 0,
    error: new Error("Not yet implemented"),
  };
  return dummy;
};

export const useQuickCommentsSyncStatus = (): SyncStatus => {
  const dummy: SyncStatus = {
    loading: false,
    component: "Quick Comments",
    lastSync: new Date(),
    inProgress: false,
    isComplete: true,
    remaining: 0,
    error: new Error("Not yet implemented"),
  };
  return dummy;
};

export const useSequenceTypesSyncStatus = (): SyncStatus => {
  const dummy: SyncStatus = {
    loading: false,
    component: "Sequence Types",
    lastSync: new Date(),
    inProgress: false,
    isComplete: true,
    remaining: 0,
    error: new Error("Not yet implemented"),
  };
  return dummy;
};

export const useStrategyAreasSyncStatus = (): SyncStatus => {
  return useSyncStatus("Strategy Areas");
};

export const useTournamentListSyncStatus = (): SyncStatus => {
  return useSyncStatus("Tournament List");
};

export const useTrackingDataSyncStatus = (): SyncStatus => {
  const dummy: SyncStatus = {
    loading: false,
    component: "Tracking Data",
    lastSync: new Date(),
    inProgress: false,
    isComplete: true,
    remaining: 0,
    error: new Error("Not yet implemented"),
  };
  return dummy;
};

export const useOverallSyncStatus = (): SyncStatus => {
  const dashboard = useDashboardDataSyncStatus();
  const eventtype = useEventTypesSyncStatus();
  const schedule = useMatchScheduleSyncStatus();
  const comments = useQuickCommentsSyncStatus();
  const seqtype = useSequenceTypesSyncStatus();
  const stratarea = useStrategyAreasSyncStatus();
  const tournament = useTournamentListSyncStatus();
  const track = useTrackingDataSyncStatus();

  const statuses: SyncStatus[] = [
    dashboard,
    eventtype,
    schedule,
    comments,
    seqtype,
    stratarea,
    tournament,
    track,
  ];

  const loading = statuses.some((s) => s.loading);
  const lastSync = new Date(
    Math.min(...statuses.map((s) => s.lastSync.getTime())),
  );
  const inProgress = statuses.some((s) => s.inProgress);
  const isComplete = statuses.every((s) => s.isComplete);
  const remaining = statuses.reduce((acc, s) => acc + s.remaining, 0);
  const error = statuses.find((s) => s.error !== null)?.error || null;
  return {
    loading: loading,
    component: "Overall",
    lastSync: lastSync,
    inProgress: inProgress,
    isComplete: isComplete,
    remaining: remaining,
    error: error,
  };
};
