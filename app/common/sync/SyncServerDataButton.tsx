import { useState } from "react";
import {
  doServerDataSync,
  useServerDataSyncStatus,
} from "~/common/sync/sync.ts";

const SyncServerDataButton = () => {
  const status = useServerDataSyncStatus();
  const [syncing, setSyncing] = useState(false);
  const isSyncing = status.inProgress || status.loading || syncing;

  const handleSync = async () => {
    setSyncing(true);
    await doServerDataSync();
    setSyncing(false);
  };

  return (
    <button
      onClick={handleSync}
      className={"sync-now-button"}
      disabled={isSyncing}
    >
      {isSyncing ? "Syncing..." : "Sync Server Data"}
    </button>
  );
};

export default SyncServerDataButton;
