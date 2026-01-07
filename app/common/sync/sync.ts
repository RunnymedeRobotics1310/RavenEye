import type { SyncStatus } from "~/types/SyncStatus.ts";
import {
  type RBTournament,
  useTournamentList,
} from "~/common/storage/ravenbrain.ts";

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
  const dummy: SyncStatus = {
    loading: false,
    component: "Strategy Areas",
    lastSync: new Date(),
    inProgress: false,
    isComplete: true,
    remaining: 0,
    error: null,
  };
  return dummy;
};

export const useTournamentListSyncStatus = (): SyncStatus => {
  const { list, error, loading } = useTournamentList();
  console.log("Tournament List Sync Status:", { list, loading, error });
  const dummy: SyncStatus = {
    loading: loading,
    component: "Tournament List",
    lastSync: new Date(),
    inProgress: false,
    isComplete: true,
    remaining: 0,
    error: error,
  };
  return dummy;
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
