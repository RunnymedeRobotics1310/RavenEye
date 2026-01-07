import { useState } from "react";
import { doSync, useOverallSyncStatus } from "~/common/sync/sync.ts";

const SyncNowButton = () => {
  const status = useOverallSyncStatus();
  const [manualSyncing, setManualSyncing] = useState(false);
  const isSyncing = status.inProgress || status.loading || manualSyncing;

  const handleSync = async () => {
    setManualSyncing(true);
    await doSync();
    setManualSyncing(false);
  };

  return (
    <button
      onClick={handleSync}
      style={{ marginBottom: "1rem" }}
      disabled={isSyncing}
    >
      {isSyncing ? "Syncing..." : "Sync Now"}
    </button>
  );
};

export default SyncNowButton;
