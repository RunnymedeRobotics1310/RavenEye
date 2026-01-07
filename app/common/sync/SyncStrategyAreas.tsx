import { useStrategyAreasSyncStatus } from "~/common/sync/sync.ts";
import SyncStatusLayout from "~/common/sync/SyncStatusLayout.tsx";

const SyncStrategyAreas = () => {
  const status = useStrategyAreasSyncStatus();
  return <SyncStatusLayout status={status}></SyncStatusLayout>;
};

export default SyncStrategyAreas;
