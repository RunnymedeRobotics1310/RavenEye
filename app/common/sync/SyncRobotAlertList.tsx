import { useRobotAlertListSyncStatus } from "~/common/sync/sync.ts";
import SyncStatusLayout from "~/common/sync/SyncStatusLayout.tsx";

const SyncRobotAlertList = () => {
  const status = useRobotAlertListSyncStatus();
  return <SyncStatusLayout status={status}></SyncStatusLayout>;
};

export default SyncRobotAlertList;