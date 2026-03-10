import { useRobotAlertsSyncStatus } from "~/common/sync/sync.ts";
import SyncStatusLayout from "~/common/sync/SyncStatusLayout.tsx";

const SyncRobotAlerts = () => {
  const status = useRobotAlertsSyncStatus();
  return <SyncStatusLayout status={status}></SyncStatusLayout>;
};

export default SyncRobotAlerts;