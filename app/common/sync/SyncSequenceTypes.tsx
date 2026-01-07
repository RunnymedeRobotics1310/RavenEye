import { useSequenceTypesSyncStatus } from "~/common/sync/sync.ts";
import SyncStatusLayout from "~/common/sync/SyncStatusLayout.tsx";

const SyncSequenceTypes = () => {
  const status = useSequenceTypesSyncStatus();
  return <SyncStatusLayout status={status}></SyncStatusLayout>;
};

export default SyncSequenceTypes;
