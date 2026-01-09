import { useTrackingDataSyncStatus } from "~/common/sync/sync.ts";
import SyncStatusLayout from "~/common/sync/SyncStatusLayout.tsx";

const SyncTrackingData = () => {
  const status = useTrackingDataSyncStatus();
  return <SyncStatusLayout status={status}></SyncStatusLayout>;
};

export default SyncTrackingData;
