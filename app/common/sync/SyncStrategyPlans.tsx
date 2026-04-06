import { useStrategyPlansSyncStatus } from "~/common/sync/sync.ts";
import SyncStatusLayout from "~/common/sync/SyncStatusLayout.tsx";

const SyncStrategyPlans = () => {
  const status = useStrategyPlansSyncStatus();
  return <SyncStatusLayout status={status}></SyncStatusLayout>;
};

export default SyncStrategyPlans;
