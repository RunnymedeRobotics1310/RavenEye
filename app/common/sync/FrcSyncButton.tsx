import { useState } from "react";
import { rbfetch } from "~/common/storage/rbauth.ts";
import { doManualSync } from "~/common/sync/sync.ts";

const FrcSyncButton = () => {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFrcSync = async () => {
    setSyncing(true);
    setError(null);
    setSuccess(false);
    try {
      const resp = await rbfetch("/api/frc-sync", { method: "POST" });
      if (!resp.ok) {
        throw new Error("FRC sync failed: " + resp.status);
      }
      await doManualSync();
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <button onClick={handleFrcSync} disabled={syncing}>
        {syncing ? "Syncing..." : "Force Sync with FRC"}
      </button>
      {error && <span className="banner banner-warning">{error}</span>}
      {success && <span> Done!</span>}
    </div>
  );
};

export default FrcSyncButton;
