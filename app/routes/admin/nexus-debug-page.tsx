import { useState } from "react";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import Spinner from "~/common/Spinner.tsx";
import { useRole } from "~/common/storage/rbauth.ts";
import { useTournamentList } from "~/common/storage/dbhooks.ts";
import {
  getNexusDebugInfo,
  type NexusDebugInfo,
} from "~/common/storage/rb.ts";

const NexusDebugContent = () => {
  const { isSuperuser, loading: roleLoading } = useRole();
  const { list: tournaments, loading: tournamentsLoading } =
    useTournamentList();
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [debugInfo, setDebugInfo] = useState<NexusDebugInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRawBody, setShowRawBody] = useState(false);

  if (roleLoading || tournamentsLoading) return <Spinner />;
  if (!isSuperuser) return <p>This page is restricted to superusers.</p>;

  const handleFetch = async () => {
    if (!selectedTournamentId) return;
    setLoading(true);
    setError(null);
    setDebugInfo(null);
    try {
      const info = await getNexusDebugInfo(selectedTournamentId);
      setDebugInfo(info);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <div className="form-field">
        <label htmlFor="tournament">Tournament</label>
        <input
          id="tournament"
          list="tournament-list"
          placeholder="Type to search tournaments..."
          value={selectedTournamentId}
          onChange={(e) => setSelectedTournamentId(e.target.value)}
        />
        <datalist id="tournament-list">
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </datalist>
      </div>

      <div className="form-actions">
        <button
          onClick={handleFetch}
          disabled={!selectedTournamentId || loading}
        >
          Fetch Debug Info
        </button>
      </div>

      {loading && <Spinner />}
      {error && <div className="banner banner-warning">{error}</div>}

      {debugInfo && (
        <>
          <h2>Client</h2>
          <table>
            <tbody>
              <tr>
                <td>Enabled</td>
                <td>{debugInfo.enabled ? "Yes" : "No"}</td>
              </tr>
              <tr>
                <td>API Key</td>
                <td><code>{debugInfo.apiKey}</code></td>
              </tr>
              <tr>
                <td>Team Number</td>
                <td>{debugInfo.teamNumber}</td>
              </tr>
              <tr>
                <td>Nexus Event Key</td>
                <td>{debugInfo.nexusEventKey}</td>
              </tr>
              <tr>
                <td>Last Error</td>
                <td>{debugInfo.lastError ?? "None"}</td>
              </tr>
              {debugInfo.lastErrorTime && (
                <tr>
                  <td>Last Error Time</td>
                  <td>{debugInfo.lastErrorTime}</td>
                </tr>
              )}
            </tbody>
          </table>

          <h2>Live Fetch</h2>
          <table>
            <tbody>
              <tr>
                <td>Success</td>
                <td>{debugInfo.liveFetch.success ? "Yes" : "No"}</td>
              </tr>
              <tr>
                <td>Status Code</td>
                <td>{debugInfo.liveFetch.statusCode || "N/A"}</td>
              </tr>
              <tr>
                <td>Latency</td>
                <td>{debugInfo.liveFetch.latencyMs} ms</td>
              </tr>
              {debugInfo.liveFetch.error && (
                <tr>
                  <td>Error</td>
                  <td>{debugInfo.liveFetch.error}</td>
                </tr>
              )}
            </tbody>
          </table>

          <h2>Cache</h2>
          <table>
            <tbody>
              <tr>
                <td>TTL (seconds)</td>
                <td>{debugInfo.ttlSeconds}</td>
              </tr>
              <tr>
                <td>Total Cache Entries</td>
                <td>{debugInfo.cacheEntryCount}</td>
              </tr>
              <tr>
                <td>Entry Present</td>
                <td>{debugInfo.cacheEntry.present ? "Yes" : "No"}</td>
              </tr>
              {debugInfo.cacheEntry.present && (
                <>
                  <tr>
                    <td>Fetched At</td>
                    <td>{debugInfo.cacheEntry.fetchedAt}</td>
                  </tr>
                  <tr>
                    <td>Age (seconds)</td>
                    <td>{debugInfo.cacheEntry.ageSeconds}</td>
                  </tr>
                  <tr>
                    <td>Stale</td>
                    <td>{debugInfo.cacheEntry.stale ? "Yes" : "No"}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>

          <h2>Queue Status</h2>
          {debugInfo.queueStatus ? (
            <table>
              <tbody>
                <tr>
                  <td>Now Queuing</td>
                  <td>{debugInfo.queueStatus.nowQueuing ?? "null"}</td>
                </tr>
                <tr>
                  <td>Team Status</td>
                  <td>{debugInfo.queueStatus.teamStatus ?? "null"}</td>
                </tr>
                <tr>
                  <td>Team Match Label</td>
                  <td>{debugInfo.queueStatus.teamMatchLabel ?? "null"}</td>
                </tr>
                <tr>
                  <td>Team Alliance</td>
                  <td>{debugInfo.queueStatus.teamAlliance ?? "null"}</td>
                </tr>
                <tr>
                  <td>Est. Queue Time</td>
                  <td>
                    {debugInfo.queueStatus.estimatedQueueTime
                      ? new Date(
                          debugInfo.queueStatus.estimatedQueueTime,
                        ).toLocaleTimeString()
                      : "null"}
                  </td>
                </tr>
                <tr>
                  <td>Est. Start Time</td>
                  <td>
                    {debugInfo.queueStatus.estimatedStartTime
                      ? new Date(
                          debugInfo.queueStatus.estimatedStartTime,
                        ).toLocaleTimeString()
                      : "null"}
                  </td>
                </tr>
                <tr>
                  <td>Announcements</td>
                  <td>{debugInfo.queueStatus.announcements?.length ?? 0}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p>No queue status available (endpoint returned empty).</p>
          )}

          {debugInfo.cacheEntry.present && debugInfo.cacheEntry.body && (
            <>
              <h2>
                Raw Cache Body{" "}
                <button onClick={() => setShowRawBody(!showRawBody)}>
                  {showRawBody ? "Hide" : "Show"}
                </button>
              </h2>
              {showRawBody && (
                <pre style={{ overflow: "auto", maxHeight: "400px" }}>
                  {JSON.stringify(
                    JSON.parse(debugInfo.cacheEntry.body),
                    null,
                    2,
                  )}
                </pre>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
};

const NexusDebugPage = () => {
  return (
    <main>
      <div className="page-header">
        <h1>Nexus Debug</h1>
        <p>Inspect Nexus API client state, cache, and queue status.</p>
      </div>
      <RequireLogin>
        <NexusDebugContent />
      </RequireLogin>
    </main>
  );
};

export default NexusDebugPage;
