import type { SyncStatus } from "~/types/SyncStatus.ts";
import {
  parseStrategyPlanLocalKey,
  repository,
  type StoredStrategyDrawing,
} from "~/common/storage/db.ts";
import {
  getEventTypeList,
  getSequenceTypeList,
  getStrategyAreaList,
  getTeamTournamentIds,
  getTournamentList,
  getSchedulesForTournaments,
  saveQuickCommentRecords,
  saveEventLogRecords,
  saveRobotAlertRecords,
  getRobotAlertListBulk,
  getStrategyPlansForTournament,
  getStrategyPlan,
  saveStrategyPlan,
  saveStrategyDrawing,
  deleteStrategyDrawing,
  parseDrawingStrokes,
} from "~/common/storage/rb.ts";
import type { RBPlanWithDrawings } from "~/common/storage/rb.ts";
import { useSyncStatus } from "~/common/storage/dbhooks.ts";
import { getNetworkHealth } from "~/common/storage/networkHealth.ts";

const TOURNAMENT_LIST = "Tournament List";
const TEAM_TOURNAMENTS = "Team Tournaments";
const STRATEGY_AREAS = "Strategy Areas";
const EVENT_TYPES = "Event Types";
const SEQUENCE_TYPES = "Sequence Types";
const MATCH_SCHEDULE = "Match Schedule";
const QUICK_COMMENTS = "Quick Comments";
const TRACKING_DATA = "Tracking Data";
const ROBOT_ALERTS = "Robot Alerts";
const ROBOT_ALERT_LIST = "Robot Alert List";
const DASHBOARD_DATA = "Dashboard Data";
const STRATEGY_PLANS = "Strategy Plans";

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
const TRACKING_DATA_SYNC_INTERVAL = 15 * 1000; // 15 seconds
const ACTIVE_TOURNAMENT_CUTOFF = 36 * 60 * 60 * 1000; // 36 hours

let syncInitialized = false;

export function initializeSyncSchedule() {
  if (syncInitialized) return;
  syncInitialized = true;

  updateCommentUnsyncCount();
  updateEventUnsyncCount();
  updateRobotAlertUnsyncCount();
  updateStrategyPlansUnsyncCount();

  // Sync server data on startup if the user has a session
  const hasSession =
    typeof sessionStorage !== "undefined" &&
    sessionStorage.getItem("raveneye_access_token") !== null;
  if (hasSession) {
    doServerDataSync();
  }

  setInterval(autoSyncMatchSchedule, SCHEDULE_SYNC_INTERVAL);
  setInterval(autoSyncStrategyPlans, SCHEDULE_SYNC_INTERVAL);
  setInterval(autoSyncTrackingData, TRACKING_DATA_SYNC_INTERVAL);
}

/**
 * Upload any locally-captured tracking events every 15 seconds if the scout
 * is online and has unsynced data. Guards short-circuit fast so this is
 * cheap when idle and safe when already syncing. Network availability is
 * read from the shared `networkHealth` state (30s rolling ping) rather
 * than firing a fresh ping on every tick — avoids hammering flaky WiFi.
 */
async function autoSyncTrackingData(): Promise<void> {
  const hasSession =
    typeof sessionStorage !== "undefined" &&
    sessionStorage.getItem("raveneye_access_token") !== null;
  if (!hasSession) return;

  // Don't stack syncs if one is already running.
  const existing = await repository.getSyncStatus(TRACKING_DATA);
  if (existing && existing.inProgress) return;

  // Nothing to sync → skip entirely.
  const pending = await repository.getUnsynchronizedEvents();
  if (pending.length === 0) return;

  // Piggy-back on the shared 30s network poll. `alive` is null before the
  // first ping completes and false after a recent failure — skip in both
  // cases and try again on the next 15s tick.
  const { alive } = getNetworkHealth();
  if (alive !== true) return;

  await syncTrackingData();
}

async function autoSyncStrategyPlans(): Promise<void> {
  const hasSession =
    typeof sessionStorage !== "undefined" &&
    sessionStorage.getItem("raveneye_access_token") !== null;
  if (!hasSession) return;
  const active = await hasActiveTournament();
  if (!active) return;
  const { alive } = getNetworkHealth();
  if (alive !== true) return;
  await syncStrategyPlans();
}

async function hasActiveTournament(): Promise<boolean> {
  const tournaments = await repository.getTournamentList();
  const cutoff = Date.now() - ACTIVE_TOURNAMENT_CUTOFF;
  return tournaments.some((t) => new Date(t.endTime).getTime() > cutoff);
}

async function autoSyncMatchSchedule(): Promise<void> {
  const hasSession =
    typeof sessionStorage !== "undefined" &&
    sessionStorage.getItem("raveneye_access_token") !== null;
  if (!hasSession) return;

  const active = await hasActiveTournament();
  if (!active) return;

  const { alive } = getNetworkHealth();
  if (alive !== true) return;

  await syncMatchSchedule();
}

export async function doManualSync() {
  const { alive } = getNetworkHealth();
  if (alive === true) {
    await Promise.all([
      syncQuickComments(),
      syncTrackingData(),
      syncRobotAlerts(),
      syncStrategyPlans(),
    ]);
  } else {
    log("Skipping Manual Sync - not connected");
  }
}

export async function doServerDataSync() {
  console.log("doServerDataSync");
  const { alive } = getNetworkHealth();
  if (alive === true) {
    // Tournaments must sync first — schedules and robot alerts depend on the tournament list
    await syncTournamentList();
    await Promise.all([
      syncTeamTournamentIds(),
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

export async function syncTeamTournamentIds() {
  await runSync(TEAM_TOURNAMENTS, async () => {
    const data = await getTeamTournamentIds();
    await repository.putTeamTournamentIds(data);
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

export async function syncStrategyPlans() {
  await runSync(STRATEGY_PLANS, async () => {
    await uploadDirtyStrategyPlans();
    await downloadStrategyPlansForActiveTournaments();
  });
}

async function uploadDirtyStrategyPlans(): Promise<void> {
    // 1. Pending deletes first (drawings the user removed locally).
    const pendingDeletes = await repository.getPendingDeleteStrategyDrawings();
    for (const d of pendingDeletes) {
      if (d.id != null) {
        try {
          await deleteStrategyDrawing(d.id);
        } catch (e) {
          console.warn("[sync] failed to delete strategy drawing", d.id, e);
          continue; // keep for retry
        }
      }
      await repository.deleteStrategyDrawingLocal(d.localId);
    }

    // 2. Dirty plans.
    const dirtyPlans = await repository.getDirtyStrategyPlans();
    for (const p of dirtyPlans) {
      const saved = await saveStrategyPlan({
        tournamentId: p.tournamentId,
        matchLevel: p.matchLevel,
        matchNumber: p.matchNumber,
        shortSummary: p.shortSummary,
        strategyText: p.strategyText,
      });
      await repository.putStrategyPlan({
        ...p,
        id: saved.id,
        shortSummary: saved.shortSummary,
        strategyText: saved.strategyText,
        updatedByUserId: saved.updatedByUserId,
        updatedByDisplayName: saved.updatedByDisplayName,
        updatedAt: saved.updatedAt,
        dirty: false,
      });
    }

    // 3. Dirty drawings.
    const dirtyDrawings = await repository.getDirtyStrategyDrawings();
    for (const d of dirtyDrawings) {
      const matchRef = parseStrategyPlanLocalKey(d.planLocalKey);
      const saved = await saveStrategyDrawing({
        id: d.id,
        tournamentId: matchRef.tournamentId,
        matchLevel: matchRef.matchLevel,
        matchNumber: matchRef.matchNumber,
        label: d.label,
        strokes: JSON.stringify(d.strokes),
      });
      const replacement: StoredStrategyDrawing = {
        ...d,
        localId: "srv-" + saved.id,
        id: saved.id,
        planId: saved.planId,
        label: saved.label,
        createdByUserId: saved.createdByUserId,
        createdByDisplayName: saved.createdByDisplayName,
        updatedByUserId: saved.updatedByUserId,
        updatedByDisplayName: saved.updatedByDisplayName,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
        dirty: false,
        pendingDelete: false,
      };
      await repository.renameStrategyDrawing(d.localId, replacement);
    }
}

async function downloadStrategyPlansForActiveTournaments(): Promise<void> {
    const tournaments = await repository.getTournamentList();
    const cutoff = Date.now() - ACTIVE_TOURNAMENT_CUTOFF;
    const activeTournamentIds = tournaments
      .filter((t) => new Date(t.endTime).getTime() > cutoff)
      .map((t) => t.id);
    for (const tid of activeTournamentIds) {
      const remote = await getStrategyPlansForTournament(tid);
      for (const pwd of remote) {
        const localKey =
          pwd.plan.tournamentId +
          "|" +
          pwd.plan.matchLevel +
          "|" +
          pwd.plan.matchNumber;
        const existingPlan = await repository.getStrategyPlan(localKey);
        // Do not overwrite a locally-dirty plan with a server copy.
        if (!existingPlan || !existingPlan.dirty) {
          await repository.putStrategyPlan({
            localKey,
            id: pwd.plan.id,
            tournamentId: pwd.plan.tournamentId,
            matchLevel: pwd.plan.matchLevel,
            matchNumber: pwd.plan.matchNumber,
            shortSummary: pwd.plan.shortSummary,
            strategyText: pwd.plan.strategyText,
            updatedByUserId: pwd.plan.updatedByUserId,
            updatedByDisplayName: pwd.plan.updatedByDisplayName,
            updatedAt: pwd.plan.updatedAt,
            dirty: false,
          });
        }
        for (const sd of pwd.drawings) {
          const localId = "srv-" + sd.id;
          const existingDrawing = await repository.getStrategyDrawing(localId);
          if (
            !existingDrawing ||
            (!existingDrawing.dirty && !existingDrawing.pendingDelete)
          ) {
            await repository.putStrategyDrawing({
              localId,
              planLocalKey: localKey,
              id: sd.id,
              planId: sd.planId,
              label: sd.label,
              strokes: parseDrawingStrokes(sd),
              createdByUserId: sd.createdByUserId,
              createdByDisplayName: sd.createdByDisplayName,
              updatedByUserId: sd.updatedByUserId,
              updatedByDisplayName: sd.updatedByDisplayName,
              createdAt: sd.createdAt,
              updatedAt: sd.updatedAt,
              dirty: false,
              pendingDelete: false,
            });
          }
        }
      }
    }
}

/**
 * Fetch a single plan (with its drawings) from the server and merge into
 * IndexedDB, regardless of whether the tournament is "active". Used by the
 * plan editor on mount so users always see the latest server state for the
 * specific match they opened — covers past-tournament testing and the
 * "come back to yesterday's match" case.
 *
 * Respects locally-dirty records: will not overwrite unsynced user edits.
 */
export async function refreshStrategyPlanForMatch(
  tournamentId: string,
  matchLevel: string,
  matchNumber: number,
): Promise<void> {
  const hasSession =
    typeof sessionStorage !== "undefined" &&
    sessionStorage.getItem("raveneye_access_token") !== null;
  if (!hasSession) return;
  const { alive } = getNetworkHealth();
  if (alive !== true) return;
  let pwd: RBPlanWithDrawings | null;
  try {
    pwd = await getStrategyPlan(tournamentId, matchLevel, matchNumber);
  } catch (e) {
    console.warn("[sync] refreshStrategyPlanForMatch failed", e);
    return;
  }
  if (pwd == null) return; // no plan on server yet
  const localKey =
    pwd.plan.tournamentId +
    "|" +
    pwd.plan.matchLevel +
    "|" +
    pwd.plan.matchNumber;
  const existingPlan = await repository.getStrategyPlan(localKey);
  if (!existingPlan || !existingPlan.dirty) {
    await repository.putStrategyPlan({
      localKey,
      id: pwd.plan.id,
      tournamentId: pwd.plan.tournamentId,
      matchLevel: pwd.plan.matchLevel,
      matchNumber: pwd.plan.matchNumber,
      shortSummary: pwd.plan.shortSummary,
      strategyText: pwd.plan.strategyText,
      updatedByUserId: pwd.plan.updatedByUserId,
      updatedByDisplayName: pwd.plan.updatedByDisplayName,
      updatedAt: pwd.plan.updatedAt,
      dirty: false,
    });
  }
  for (const sd of pwd.drawings) {
    const localId = "srv-" + sd.id;
    const existing = await repository.getStrategyDrawing(localId);
    if (!existing || (!existing.dirty && !existing.pendingDelete)) {
      await repository.putStrategyDrawing({
        localId,
        planLocalKey: localKey,
        id: sd.id,
        planId: sd.planId,
        label: sd.label,
        strokes: parseDrawingStrokes(sd),
        createdByUserId: sd.createdByUserId,
        createdByDisplayName: sd.createdByDisplayName,
        updatedByUserId: sd.updatedByUserId,
        updatedByDisplayName: sd.updatedByDisplayName,
        createdAt: sd.createdAt,
        updatedAt: sd.updatedAt,
        dirty: false,
        pendingDelete: false,
      });
    }
  }
}

export async function updateStrategyPlansUnsyncCount() {
  const dirtyPlans = await repository.getDirtyStrategyPlans();
  const dirtyDrawings = await repository.getDirtyStrategyDrawings();
  const pendingDeletes = await repository.getPendingDeleteStrategyDrawings();
  const total =
    dirtyPlans.length + dirtyDrawings.length + pendingDeletes.length;
  const stat = await repository.getSyncStatus(STRATEGY_PLANS);
  if (stat) {
    stat.remaining = total;
    stat.isComplete = total === 0;
    await repository.putSyncStatus(stat);
  } else {
    await repository.putSyncStatus({
      loading: false,
      component: STRATEGY_PLANS,
      lastSync: new Date(),
      inProgress: false,
      isComplete: total === 0,
      remaining: total,
      error: null,
    });
  }
}

export const useStrategyPlansSyncStatus = (): SyncStatus => {
  return useSyncStatus(STRATEGY_PLANS);
};

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

export const useTeamTournamentsSyncStatus = (): SyncStatus => {
  return useSyncStatus(TEAM_TOURNAMENTS);
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
  const strategy = useStrategyPlansSyncStatus();
  return aggregateStatuses("Manual Sync", [comments, track, alerts, strategy]);
};

export const useServerDataSyncStatus = (): SyncStatus => {
  // const dashboard = useDashboardDataSyncStatus(); — not yet implemented
  const eventtype = useEventTypesSyncStatus();
  const schedule = useMatchScheduleSyncStatus();
  const seqtype = useSequenceTypesSyncStatus();
  const stratarea = useStrategyAreasSyncStatus();
  const tournament = useTournamentListSyncStatus();
  const teamTournaments = useTeamTournamentsSyncStatus();
  const alertList = useRobotAlertListSyncStatus();
  return aggregateStatuses("Server Data", [
    eventtype,
    schedule,
    seqtype,
    stratarea,
    tournament,
    teamTournaments,
    alertList,
  ]);
};

export const useOverallSyncStatus = (): SyncStatus => {
  const manual = useManualSyncStatus();
  const server = useServerDataSyncStatus();
  return aggregateStatuses("Overall", [manual, server]);
};
