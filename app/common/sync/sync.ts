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
  saveEventLogRecords,
} from "~/common/storage/rb.ts";
import { useSyncStatus } from "~/common/storage/dbhooks.ts";

const TOURNAMENT_LIST = "Tournament List";
const STRATEGY_AREAS = "Strategy Areas";
const EVENT_TYPES = "Event Types";
const SEQUENCE_TYPES = "Sequence Types";
const MATCH_SCHEDULE = "Match Schedule";
const QUICK_COMMENTS = "Quick Comments";
const TRACKING_DATA = "Tracking Data";
const DASHBOARD_DATA = "Dashboard Data";

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
  updateEventUnsyncCount();
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
    await Promise.all([syncQuickComments(), syncTrackingData()]);
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
  log(TOURNAMENT_LIST);
  await repository.putSyncStatus({
    loading: false,
    component: TOURNAMENT_LIST,
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
      component: TOURNAMENT_LIST,
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
      component: TOURNAMENT_LIST,
      lastSync: new Date(),
      inProgress: false,
      isComplete: false,
      remaining: 0,
      error: err,
    });
  }
}

export async function syncStrategyAreaList() {
  log(STRATEGY_AREAS);
  await repository.putSyncStatus({
    loading: false,
    component: STRATEGY_AREAS,
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
      component: STRATEGY_AREAS,
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
      component: STRATEGY_AREAS,
      lastSync: new Date(),
      inProgress: false,
      isComplete: false,
      remaining: 0,
      error: err,
    });
  }
}

export async function syncEventTypeList() {
  log(EVENT_TYPES);
  // todo: fixme: group these in the repository by year so that they can be retrieved by year
  await repository.putSyncStatus({
    loading: false,
    component: EVENT_TYPES,
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
      component: EVENT_TYPES,
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
      component: EVENT_TYPES,
      lastSync: new Date(),
      inProgress: false,
      isComplete: false,
      remaining: 0,
      error: err,
    });
  }
}

export async function syncSequenceTypeList() {
  log(SEQUENCE_TYPES);
  await repository.putSyncStatus({
    loading: false,
    component: SEQUENCE_TYPES,
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
      component: SEQUENCE_TYPES,
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
      component: SEQUENCE_TYPES,
      lastSync: new Date(),
      inProgress: false,
      isComplete: false,
      remaining: 0,
      error: err,
    });
  }
}

export async function syncMatchSchedule() {
  log(MATCH_SCHEDULE);
  await repository.putSyncStatus({
    loading: false,
    component: MATCH_SCHEDULE,
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
      component: MATCH_SCHEDULE,
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
      component: MATCH_SCHEDULE,
      lastSync: new Date(),
      inProgress: false,
      isComplete: false,
      remaining: 0,
      error: err,
    });
  }
}

export async function syncQuickComments() {
  log(QUICK_COMMENTS);
  await repository.putSyncStatus({
    loading: false,
    component: QUICK_COMMENTS,
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
        component: QUICK_COMMENTS,
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
          component: QUICK_COMMENTS,
          lastSync: new Date(),
          inProgress: false,
          isComplete: false,
          remaining: 0,
          error: new Error(JSON.stringify(failureReasons)),
        });
      } else {
        await repository.putSyncStatus({
          loading: false,
          component: QUICK_COMMENTS,
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
        component: QUICK_COMMENTS,
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
      component: QUICK_COMMENTS,
      lastSync: new Date(),
      inProgress: false,
      isComplete: false,
      remaining: 0,
      error: err,
    });
  }
}

export async function syncTrackingData() {
  log(TRACKING_DATA);
  await repository.putSyncStatus({
    loading: false,
    component: TRACKING_DATA,
    lastSync: new Date(),
    inProgress: true,
    isComplete: false,
    remaining: 0,
    error: null,
  });

  try {
    const data = await repository.getUnsynchronizedEvents();
    if (data != null && data.length > 0) {
      await repository.putSyncStatus({
        loading: false,
        component: TRACKING_DATA,
        lastSync: new Date(),
        inProgress: true,
        isComplete: false,
        remaining: data.length,
        error: null,
      });
      const result = await saveEventLogRecords(data);
      const successful = result
        .filter((r) => r.success)
        .map((r) => r.eventLogRecord);
      await repository.markEventSynchronized(successful);
      const failureReasons = result
        .filter((r) => !r.success)
        .map((r) => r.reason);
      if (failureReasons.length > 0) {
        await repository.putSyncStatus({
          loading: false,
          component: TRACKING_DATA,
          lastSync: new Date(),
          inProgress: false,
          isComplete: false,
          remaining: 0,
          error: new Error(JSON.stringify(failureReasons)),
        });
      } else {
        await repository.putSyncStatus({
          loading: false,
          component: TRACKING_DATA,
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
        component: TRACKING_DATA,
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
      component: TRACKING_DATA,
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
    component: DASHBOARD_DATA,
    lastSync: new Date(),
    inProgress: false,
    isComplete: true,
    remaining: 0,
    error: new Error("Not yet implemented"),
  };
  return dummy;
};

export const useEventTypesSyncStatus = (): SyncStatus => {
  return useSyncStatus(EVENT_TYPES);
};

export const useMatchScheduleSyncStatus = (): SyncStatus => {
  return useSyncStatus(MATCH_SCHEDULE);
};

/**
 * Update the count of unsynchronized quick comments.
 */
export async function updateCommentUnsyncCount() {
  const data = await repository.getUnsynchronizedComments();
  const stat = await repository.getSyncStatus(QUICK_COMMENTS);
  if (stat) {
    stat.remaining = data.length;
    stat.isComplete = data.length === 0;
    await repository.putSyncStatus(stat);
  } else {
    await repository.putSyncStatus({
      loading: false,
      component: QUICK_COMMENTS,
      lastSync: new Date(),
      inProgress: false,
      isComplete: data.length === 0,
      remaining: 0,
      error: null,
    });
  }
}

/**
 * Update the count of unsynchronized quick comments.
 */
export async function updateEventUnsyncCount() {
  const data = await repository.getUnsynchronizedEvents();
  const stat = await repository.getSyncStatus(TRACKING_DATA);
  if (stat) {
    stat.remaining = data.length;
    stat.isComplete = data.length === 0;
    await repository.putSyncStatus(stat);
  } else {
    await repository.putSyncStatus({
      loading: false,
      component: TRACKING_DATA,
      lastSync: new Date(),
      inProgress: false,
      isComplete: data.length === 0,
      remaining: 0,
      error: null,
    });
  }
}

export const useQuickCommentsSyncStatus = (): SyncStatus => {
  return useSyncStatus(QUICK_COMMENTS);
};

export const useSequenceTypesSyncStatus = (): SyncStatus => {
  return useSyncStatus(SEQUENCE_TYPES);
};

export const useStrategyAreasSyncStatus = (): SyncStatus => {
  return useSyncStatus(STRATEGY_AREAS);
};

export const useTournamentListSyncStatus = (): SyncStatus => {
  return useSyncStatus(TOURNAMENT_LIST);
};

export const useTrackingDataSyncStatus = (): SyncStatus => {
  return useSyncStatus(TRACKING_DATA);
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
