import type { SyncStatus } from "~/types/SyncStatus.ts";
import { repository } from "~/common/storage/db.ts";
import {
  getEventTypeList,
  getSequenceTypeList,
  getStrategyAreaList,
  getTournamentList,
  getSchedulesForTournaments,
  ping,
  saveQuickCommentRecords,
  saveEventLogRecords,
  saveRobotAlertRecords,
  getRobotAlertListBulk,
} from "~/common/storage/rb.ts";
import { useSyncStatus } from "~/common/storage/dbhooks.ts";

const TOURNAMENT_LIST = "Tournament List";
const STRATEGY_AREAS = "Strategy Areas";
const EVENT_TYPES = "Event Types";
const SEQUENCE_TYPES = "Sequence Types";
const MATCH_SCHEDULE = "Match Schedule";
const QUICK_COMMENTS = "Quick Comments";
const TRACKING_DATA = "Tracking Data";
const ROBOT_ALERTS = "Robot Alerts";
const ROBOT_ALERT_LIST = "Robot Alert List";
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

async function runSync(
  component: string,
  work: () => Promise<void>,
): Promise<void> {
  log(component);
  await repository.putSyncStatus({
    loading: false,
    component,
    lastSync: new Date(),
    inProgress: true,
    isComplete: false,
    remaining: 0,
    error: null,
  });
  try {
    await work();
    await repository.putSyncStatus({
      loading: false,
      component,
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
      component,
      lastSync: new Date(),
      inProgress: false,
      isComplete: false,
      remaining: 0,
      error: err,
    });
  }
}

const SCHEDULE_SYNC_INTERVAL = 3 * 60 * 1000; // 3 minutes
const ACTIVE_TOURNAMENT_CUTOFF = 36 * 60 * 60 * 1000; // 36 hours

let syncInitialized = false;

export function initializeSyncSchedule() {
  if (syncInitialized) return;
  syncInitialized = true;

  updateCommentUnsyncCount();
  updateEventUnsyncCount();
  updateRobotAlertUnsyncCount();

  setInterval(autoSyncMatchSchedule, SCHEDULE_SYNC_INTERVAL);
}

async function hasActiveTournament(): Promise<boolean> {
  const tournaments = await repository.getTournamentList();
  const cutoff = Date.now() - ACTIVE_TOURNAMENT_CUTOFF;
  return tournaments.some((t) => new Date(t.endTime).getTime() > cutoff);
}

async function autoSyncMatchSchedule(): Promise<void> {
  const active = await hasActiveTournament();
  if (!active) return;

  const alive = await ping();
  if (!alive) return;

  await syncMatchSchedule();
}

export async function doManualSync() {
  const alive = await ping();
  if (alive) {
    await Promise.all([
      syncQuickComments(),
      syncTrackingData(),
      syncRobotAlerts(),
    ]);
  } else {
    log("Skipping Manual Sync - not connected");
  }
}

export async function doServerDataSync() {
  const alive = await ping();
  if (alive) {
    await Promise.all([
      syncTournamentList(),
      syncStrategyAreaList(),
      syncEventTypeList(),
      syncSequenceTypeList(),
      syncMatchSchedule(),
      syncRobotAlertList(),
    ]);
  } else {
    log("Skipping Server Data Sync - not connected");
  }
}

export async function syncTournamentList() {
  await runSync(TOURNAMENT_LIST, async () => {
    const data = await getTournamentList();
    await repository.putTournamentList(data);
  });
}

export async function syncStrategyAreaList() {
  await runSync(STRATEGY_AREAS, async () => {
    const data = await getStrategyAreaList();
    await repository.putStrategyAreaList(data);
  });
}

export async function syncEventTypeList() {
  // todo: fixme: group these in the repository by year so that they can be retrieved by year
  await runSync(EVENT_TYPES, async () => {
    const data = await getEventTypeList();
    await repository.putEventTypeList(data);
  });
}

export async function syncSequenceTypeList() {
  await runSync(SEQUENCE_TYPES, async () => {
    const data = await getSequenceTypeList();
    await repository.putSequenceTypeList(data);
  });
}

export async function syncMatchSchedule() {
  await runSync(MATCH_SCHEDULE, async () => {
    const tournaments = await repository.getTournamentList();

    const cutoff = Date.now() - ACTIVE_TOURNAMENT_CUTOFF;
    const activeTournamentIds = tournaments
      .filter((t) => new Date(t.endTime).getTime() > cutoff)
      .map((t) => t.id);
    const schedules = await getSchedulesForTournaments(activeTournamentIds);
    await repository.mergeMatchSchedule(schedules);
  });
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

export async function syncRobotAlerts() {
  log(ROBOT_ALERTS);
  await repository.putSyncStatus({
    loading: false,
    component: ROBOT_ALERTS,
    lastSync: new Date(),
    inProgress: true,
    isComplete: false,
    remaining: 0,
    error: null,
  });

  try {
    const data = await repository.getUnsynchronizedRobotAlerts();
    if (data != null && data.length > 0) {
      await repository.putSyncStatus({
        loading: false,
        component: ROBOT_ALERTS,
        lastSync: new Date(),
        inProgress: true,
        isComplete: false,
        remaining: data.length,
        error: null,
      });
      const result = await saveRobotAlertRecords(data);
      const successful = result.filter((r) => r.success).map((r) => r.alert);
      await repository.markRobotAlertSynchronized(successful);
      const failureReasons = result
        .filter((r) => !r.success)
        .map((r) => r.reason);
      if (failureReasons.length > 0) {
        await repository.putSyncStatus({
          loading: false,
          component: ROBOT_ALERTS,
          lastSync: new Date(),
          inProgress: false,
          isComplete: false,
          remaining: 0,
          error: new Error(JSON.stringify(failureReasons)),
        });
      } else {
        await repository.putSyncStatus({
          loading: false,
          component: ROBOT_ALERTS,
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
        component: ROBOT_ALERTS,
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
      component: ROBOT_ALERTS,
      lastSync: new Date(),
      inProgress: false,
      isComplete: false,
      remaining: 0,
      error: err,
    });
  }
}

export async function syncRobotAlertList() {
  await runSync(ROBOT_ALERT_LIST, async () => {
    const tournaments = await repository.getTournamentList();
    const cutoff = Date.now() - ACTIVE_TOURNAMENT_CUTOFF;
    const activeTournamentIds = tournaments
      .filter((t) => new Date(t.endTime).getTime() > cutoff)
      .map((t) => t.id);
    const data = await getRobotAlertListBulk(activeTournamentIds);
    await repository.putRobotAlerts(data);
  });
}

export async function updateRobotAlertUnsyncCount() {
  const data = await repository.getUnsynchronizedRobotAlerts();
  const stat = await repository.getSyncStatus(ROBOT_ALERTS);
  if (stat) {
    stat.remaining = data.length;
    stat.isComplete = data.length === 0;
    await repository.putSyncStatus(stat);
  } else {
    await repository.putSyncStatus({
      loading: false,
      component: ROBOT_ALERTS,
      lastSync: new Date(),
      inProgress: false,
      isComplete: data.length === 0,
      remaining: 0,
      error: null,
    });
  }
}

export const useRobotAlertsSyncStatus = (): SyncStatus => {
  return useSyncStatus(ROBOT_ALERTS);
};

export const useRobotAlertListSyncStatus = (): SyncStatus => {
  return useSyncStatus(ROBOT_ALERT_LIST);
};

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

function aggregateStatuses(
  component: string,
  statuses: SyncStatus[],
): SyncStatus {
  return {
    loading: statuses.some((s) => s.loading),
    component,
    lastSync: new Date(
      Math.min(...statuses.map((s) => s.lastSync.getTime())),
    ),
    inProgress: statuses.some((s) => s.inProgress),
    isComplete: statuses.every((s) => s.isComplete),
    remaining: statuses.reduce((acc, s) => acc + s.remaining, 0),
    error: statuses.find((s) => s.error !== null)?.error || null,
  };
}

export const useManualSyncStatus = (): SyncStatus => {
  const comments = useQuickCommentsSyncStatus();
  const track = useTrackingDataSyncStatus();
  const alerts = useRobotAlertsSyncStatus();
  return aggregateStatuses("Manual Sync", [comments, track, alerts]);
};

export const useServerDataSyncStatus = (): SyncStatus => {
  // const dashboard = useDashboardDataSyncStatus(); — not yet implemented
  const eventtype = useEventTypesSyncStatus();
  const schedule = useMatchScheduleSyncStatus();
  const seqtype = useSequenceTypesSyncStatus();
  const stratarea = useStrategyAreasSyncStatus();
  const tournament = useTournamentListSyncStatus();
  const alertList = useRobotAlertListSyncStatus();
  return aggregateStatuses("Server Data", [
    eventtype,
    schedule,
    seqtype,
    stratarea,
    tournament,
    alertList,
  ]);
};

export const useOverallSyncStatus = (): SyncStatus => {
  const manual = useManualSyncStatus();
  const server = useServerDataSyncStatus();
  return aggregateStatuses("Overall", [manual, server]);
};
