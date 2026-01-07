import type { SyncStatus } from "~/types/SyncStatus.ts";
import { repository, useSyncStatus } from "~/common/storage/localdb.ts";
import { rbfetch, ping } from "~/common/storage/auth.ts";

let syncInitialized = false;

export function doSync() {
  ping()
    .then(() => {
      syncTournamentList();
      syncStrategyAreaList();
    })
    .catch((error) => {
      // Don't worry if you can't sync - user may not be connected
      console.log("[sync] Skipping - not connected");
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
  console.log(
    "[sync] Tournament List at " +
      new Date().toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      }),
  );
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
    const resp = await rbfetch("/api/tournament", {});
    if (resp.ok) {
      const data = await resp.json();
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
    } else {
      const err = new Error("Failed to fetch tournaments");
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
  console.log(
    "[sync] Strategy Area List at " +
      new Date().toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      }),
  );
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
    const resp = await rbfetch("/api/strategy-areas", {});
    if (resp.ok) {
      const data = await resp.json();
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
    } else {
      const err = new Error("Failed to fetch strategy areas");
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

export const useDashboardDataSyncStatus = (): SyncStatus => {
  const dummy: SyncStatus = {
    loading: false,
    component: "Dashboard Data",
    lastSync: new Date(),
    inProgress: false,
    isComplete: true,
    remaining: 0,
    error: null,
  };
  return dummy;
};

export const useEventTypesSyncStatus = (): SyncStatus => {
  const dummy: SyncStatus = {
    loading: false,
    component: "Event Types",
    lastSync: new Date(),
    inProgress: false,
    isComplete: true,
    remaining: 0,
    error: null,
  };
  return dummy;
};

export const useMatchScheduleSyncStatus = (): SyncStatus => {
  const dummy: SyncStatus = {
    loading: false,
    component: "Match Schedule",
    lastSync: new Date(),
    inProgress: false,
    isComplete: true,
    remaining: 0,
    error: null,
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
    error: null,
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
    error: null,
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
    isComplete: false,
    remaining: 1310,
    error: null,
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
  const result: SyncStatus = {
    loading: loading,
    component: "Overall",
    lastSync: lastSync,
    inProgress: inProgress,
    isComplete: isComplete,
    remaining: remaining,
    error: error,
  };
  return result;
};
