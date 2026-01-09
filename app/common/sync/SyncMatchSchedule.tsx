import { useMatchScheduleSyncStatus } from "~/common/sync/sync.ts";
import SyncStatusLayout from "~/common/sync/SyncStatusLayout.tsx";

const SyncMatchSchedule = () => {
  const status = useMatchScheduleSyncStatus();
  return <SyncStatusLayout status={status}></SyncStatusLayout>;
};

export default SyncMatchSchedule;
