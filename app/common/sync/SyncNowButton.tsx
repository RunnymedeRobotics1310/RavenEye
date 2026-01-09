import { useState } from "react";
import { doManualSync, useOverallSyncStatus } from "~/common/sync/sync.ts";

const SyncNowButton = () => {
  const status = useOverallSyncStatus();
  const [manualSyncing, setManualSyncing] = useState(false);
  const isSyncing = status.inProgress || status.loading || manualSyncing;

  const handleSync = async () => {
    setManualSyncing(true);
    await doManualSync();
    setManualSyncing(false);
  };

  return (
    <button
      onClick={handleSync}
      className={"sync-now-button"}
      disabled={isSyncing}
    >
      {isSyncing ? "Syncing..." : "Sync Now"}
    </button>
  );
};

export default SyncNowButton;
