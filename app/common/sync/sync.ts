import type { SyncStatus } from "~/types/SyncStatus.ts";
import { repository } from "~/common/storage/db.ts";
import {
  getEventTypeList,
  getSequenceTypeList,
  getStrategyAreaList,
  getTournamentList,
  getScheduleForTournament,
  ping,
  saveQuickCommentRecords,
} from "~/common/storage/rb.ts";
import { useSyncStatus } from "~/common/storage/dbhooks.ts";

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

export function initializeSyncSchedule() {
  if (syncInitialized) return;
  syncInitialized = true;

  updateCommentUnsyncCount();
  doSync();
  setInterval(
    () => {
      doSync();
    },
    60 * 60 * 1000,
  );
}

export async function doManualSync() {
  const alive = await ping();
  if (alive) {
    await syncQuickComments();
  } else {
    log("Skipping Manual Sync - not connected");
  }
  await doSync();
}
async function doSync() {
  const alive = await ping();
  if (alive) {
    await Promise.all([
      syncTournamentList(),
      syncStrategyAreaList(),
      syncEventTypeList(),
      syncSequenceTypeList(),
      syncMatchSchedule(),
    ]);
  } else {
    log("Skipping - not connected");
  }
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
  // todo: fixme: group these in the repository by year so that they can be retrieved by year
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

export async function syncSequenceTypeList() {
  log("Sequence Type List");
  await repository.putSyncStatus({
    loading: false,
    component: "Sequence Types",
    lastSync: new Date(),
    inProgress: true,
    isComplete: false,
    remaining: 0,
    error: null,
  });

  try {
    const data = await getSequenceTypeList();
    await repository.putSequenceTypeList(data);
    await repository.putSyncStatus({
      loading: false,
      component: "Sequence Types",
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
      component: "Sequence Types",
      lastSync: new Date(),
      inProgress: false,
      isComplete: false,
      remaining: 0,
      error: err,
    });
  }
}

export async function syncMatchSchedule() {
  log("Match Schedule");
  await repository.putSyncStatus({
    loading: false,
    component: "Match Schedule",
    lastSync: new Date(),
    inProgress: true,
    isComplete: false,
    remaining: 0,
    error: null,
  });

  try {
    const tournaments = await repository.getTournamentList();
    const schedules = await Promise.all(
      tournaments.map((t) => getScheduleForTournament(t.id)),
    );
    const data = schedules.flat();
    await repository.putMatchSchedule(data);
    await repository.putSyncStatus({
      loading: false,
      component: "Match Schedule",
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
      component: "Match Schedule",
      lastSync: new Date(),
      inProgress: false,
      isComplete: false,
      remaining: 0,
      error: err,
    });
  }
}

export async function syncQuickComments() {
  log("Quick Comments");
  await repository.putSyncStatus({
    loading: false,
    component: "Quick Comments",
    lastSync: new Date(),
    inProgress: true,
    isComplete: false,
    remaining: 0,
    error: null,
  });

  try {
    const data = await repository.getUnsynchronizedComments();
    if (data != null && data.length > 0) {
      await repository.putSyncStatus({
        loading: false,
        component: "Quick Comments",
        lastSync: new Date(),
        inProgress: true,
        isComplete: false,
        remaining: data.length,
        error: null,
      });
      const result = await saveQuickCommentRecords(data);
      const successful = result.filter((r) => r.success).map((r) => r.comment);
      await repository.markCommentSynchronized(successful);
      const failureReasons = result
        .filter((r) => !r.success)
        .map((r) => r.reason);
      if (failureReasons.length > 0) {
        await repository.putSyncStatus({
          loading: false,
          component: "Quick Comments",
          lastSync: new Date(),
          inProgress: false,
          isComplete: false,
          remaining: 0,
          error: new Error(JSON.stringify(failureReasons)),
        });
      } else {
        await repository.putSyncStatus({
          loading: false,
          component: "Quick Comments",
          lastSync: new Date(),
          inProgress: false,
          isComplete: true,
          remaining: 0,
          error: null,
        });
      }
    } else {
      await repository.putSyncStatus({
        loading: false,
        component: "Quick Comments",
        lastSync: new Date(),
        inProgress: false,
        isComplete: true,
        remaining: 0,
        error: null,
      });
    }
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    await repository.putSyncStatus({
      loading: false,
      component: "Quick Comments",
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
  return useSyncStatus("Match Schedule");
};

/**
 * Update the count of unsynchronized quick comments.
 */
export async function updateCommentUnsyncCount() {
  const data = await repository.getUnsynchronizedComments();
  const stat = await repository.getSyncStatus("Quick Comments");
  if (stat) {
    stat.remaining = data.length;
    await repository.putSyncStatus(stat);
  } else {
    await repository.putSyncStatus({
      loading: false,
      component: "Quick Comments",
      lastSync: new Date(),
      inProgress: false,
      isComplete: false,
      remaining: 0,
      error: null,
    });
  }
}

export const useQuickCommentsSyncStatus = (): SyncStatus => {
  return useSyncStatus("Quick Comments");
};

export const useSequenceTypesSyncStatus = (): SyncStatus => {
  return useSyncStatus("Sequence Types");
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
