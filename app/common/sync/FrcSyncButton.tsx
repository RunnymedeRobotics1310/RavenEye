import { useState } from "react";
import { rbfetch } from "~/common/storage/rbauth.ts";
import { doManualSync } from "~/common/sync/sync.ts";

/**
 * Polls the frc-sync status endpoint until the sync completes or times out.
 * Resolves when status is "idle", rejects on timeout or error.
 */
async function waitForSyncComplete(
  maxWaitMs: number = 300_000,
  intervalMs: number = 3_000,
): Promise<void> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const resp = await rbfetch("/api/frc-sync/status", {});
    if (resp.ok) {
      const status = await resp.text();
      if (status === "idle") return;
    }
  }
  throw new Error("FRC sync timed out after " + maxWaitMs / 1000 + "s");
}

const FrcSyncButton = () => {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFrcSync = async () => {
    setSyncing(true);
    setError(null);
    setSuccess(false);
    setStatus(null);
    try {
      const resp = await rbfetch("/api/frc-sync", { method: "POST" });
      if (resp.status === 409) {
        setStatus("Sync already in progress, waiting...");
      } else if (!resp.ok) {
        throw new Error("FRC sync failed: " + resp.status);
      } else {
        setStatus("Sync started on server, waiting for completion...");
      }
      await waitForSyncComplete();
      setStatus("Server sync complete, pulling data...");
      await doManualSync();
      setSuccess(true);
      setStatus(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus(null);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <button onClick={handleFrcSync} disabled={syncing}>
        {syncing ? "Syncing..." : "Force Sync with FRC"}
      </button>
      {status && <span> {status}</span>}
      {error && <span className="banner banner-warning">{error}</span>}
      {success && <span> Done!</span>}
    </div>
  );
};

export default FrcSyncButton;
