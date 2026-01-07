import { useEventTypesSyncStatus } from "~/common/sync/sync.ts";
import SyncStatusLayout from "~/common/sync/SyncStatusLayout.tsx";

const SyncEventTypes = () => {
  const status = useEventTypesSyncStatus();
  return <SyncStatusLayout status={status}></SyncStatusLayout>;
};

export default SyncEventTypes;
