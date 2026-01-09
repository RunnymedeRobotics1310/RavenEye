import { useQuickCommentsSyncStatus } from "~/common/sync/sync.ts";
import SyncStatusLayout from "~/common/sync/SyncStatusLayout.tsx";

const SyncQuickComments = () => {
  const status = useQuickCommentsSyncStatus();
  return <SyncStatusLayout status={status}></SyncStatusLayout>;
};

export default SyncQuickComments;
