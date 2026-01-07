import { useDashboardDataSyncStatus } from "~/common/sync/sync.ts";
import SyncStatusLayout from "~/common/sync/SyncStatusLayout.tsx";

const SyncDashboardData = () => {
  const status = useDashboardDataSyncStatus();
  return <SyncStatusLayout status={status}></SyncStatusLayout>;
};

export default SyncDashboardData;
