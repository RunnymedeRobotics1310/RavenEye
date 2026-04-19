import { useState } from "react";
import { rbfetch } from "~/common/storage/rbauth.ts";

/**
 * Polls /api/tba-sync/status until the sync completes or times out. Resolves on "idle",
 * rejects on timeout.
 */
async function waitForSyncComplete(
  maxWaitMs: number = 300_000,
  intervalMs: number = 3_000,
): Promise<void> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const resp = await rbfetch("/api/tba-sync/status", {});
    if (resp.ok) {
      const status = await resp.text();
      if (status === "idle") return;
    }
  }
  throw new Error("TBA sync timed out after " + maxWaitMs / 1000 + "s");
}

const TbaSyncButton = () => {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleTbaSync = async () => {
    setSyncing(true);
    setError(null);
    setSuccess(false);
    setStatus(null);
    try {
      const resp = await rbfetch("/api/tba-sync", { method: "POST" });
      if (resp.status === 409) {
        setStatus("Sync already in progress, waiting...");
      } else if (!resp.ok) {
        throw new Error("TBA sync failed: " + resp.status);
      } else {
        setStatus("Sync started on server, waiting for completion...");
      }
      await waitForSyncComplete();
      // Unlike FRC, TBA data (webcasts + match videos) is read from RavenBrain at render time —
      // no local IndexedDB copy to refresh. So we just report success.
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
      <button onClick={handleTbaSync} disabled={syncing}>
        {syncing ? "Syncing..." : "Force Sync with TBA"}
      </button>
      {status && <span> {status}</span>}
      {error && <span className="banner banner-warning">{error}</span>}
      {success && <span> Done!</span>}
    </div>
  );
};

export default TbaSyncButton;
