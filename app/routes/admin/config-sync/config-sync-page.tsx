import { type FormEvent, useState } from "react";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import Spinner from "~/common/Spinner.tsx";
import { useRole } from "~/common/storage/rbauth.ts";
import {
  configSync,
  type ConfigSyncRequest,
  type ConfigSyncResult,
} from "~/common/storage/rb.ts";
import { doManualSync, doServerDataSync } from "~/common/sync/sync.ts";

const LOCALSTORAGE_KEY = "raveneye_config_sync_source_url";

const isProduction = (import.meta.env.VITE_API_HOST || "").includes(
  "ravenbrain.team1310.ca",
);

const ConfigSyncForm = () => {
  const { isSuperuser, loading: roleLoading } = useRole();
  const [sourceUrl, setSourceUrl] = useState(
    () => localStorage.getItem(LOCALSTORAGE_KEY) || "",
  );
  const [sourceUser, setSourceUser] = useState("");
  const [sourcePassword, setSourcePassword] = useState("");
  const [clearTournaments, setClearTournaments] = useState(false);
  const [syncScoutingData, setSyncScoutingData] = useState(false);
  const [clearExistingScoutingData, setClearExistingScoutingData] =
    useState(true);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<ConfigSyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prodAcknowledged, setProdAcknowledged] = useState(false);

  if (roleLoading) return <Spinner />;

  if (!isSuperuser) {
    return <p>This page is restricted to superusers.</p>;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSyncing(true);

    localStorage.setItem(LOCALSTORAGE_KEY, sourceUrl);

    const request: ConfigSyncRequest = {
      sourceUrl,
      sourceUser,
      sourcePassword,
      clearTournaments,
      syncScoutingData,
      clearExistingScoutingData,
    };

    try {
      const data = await configSync(request);
      setResult(data);
      await doServerDataSync();
      doManualSync();
    } catch (err: any) {
      if (err instanceof TypeError && err.message.includes("Failed to fetch")) {
        setError("Could not connect to RavenBrain server");
      } else {
        setError(err.message || "An unexpected error occurred");
      }
    } finally {
      setSyncing(false);
    }
  };

  return (
    <section>
      <div className="banner banner-warning">
        This will replace all local config data (strategy areas, event types,
        sequences) from the source server.
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="sourceUrl">Source Server URL</label>
          <input
            id="sourceUrl"
            type="text"
            required
            placeholder="https://ravenbrain.team1310.ca"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label htmlFor="sourceUser">Username</label>
          <input
            id="sourceUser"
            type="text"
            required
            value={sourceUser}
            onChange={(e) => setSourceUser(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label htmlFor="sourcePassword">Password</label>
          <input
            id="sourcePassword"
            type="password"
            required
            autoComplete="off"
            value={sourcePassword}
            onChange={(e) => setSourcePassword(e.target.value)}
          />
        </div>

        <fieldset>
          <legend>Options</legend>

          <div className="form-field">
            <label>
              <input
                type="checkbox"
                checked={clearTournaments}
                onChange={(e) => setClearTournaments(e.target.checked)}
              />{" "}
              Clear tournaments & schedules
            </label>
            <p className="form-hint">
              Remove locally stored tournaments, schedules, and team
              assignments. Re-fetch them from the FRC API after sync.
            </p>
          </div>

          <div className="form-field">
            <label>
              <input
                type="checkbox"
                checked={syncScoutingData}
                onChange={(e) => setSyncScoutingData(e.target.checked)}
              />{" "}
              Sync scouting data
            </label>
            <p className="form-hint">
              Import events, comments, and alerts from the source server.
            </p>
          </div>

          {syncScoutingData && (
            <div className="form-field" style={{ marginLeft: "1.5rem" }}>
              <label>
                <input
                  type="checkbox"
                  checked={clearExistingScoutingData}
                  onChange={(e) =>
                    setClearExistingScoutingData(e.target.checked)
                  }
                />{" "}
                Clear existing scouting data first
              </label>
              <p className="form-hint">
                Delete all local events, comments, and alerts before importing.
                If unchecked, duplicates will be skipped.
              </p>
            </div>
          )}
        </fieldset>

        {isProduction && (
          <div className="form-field">
            <label>
              <input
                type="checkbox"
                checked={prodAcknowledged}
                onChange={(e) => setProdAcknowledged(e.target.checked)}
              />{" "}
              I understand I am about to replace PRODUCTION DATA with data from
              another system
            </label>
          </div>
        )}

        <div className="form-actions">
          <button
            type="submit"
            disabled={syncing || (isProduction && !prodAcknowledged)}
          >
            Sync Now
          </button>
        </div>
      </form>

      {syncing && (
        <section>
          <Spinner />
          <p>Syncing from {sourceUrl}...</p>
        </section>
      )}

      {error && <div className="banner banner-warning">{error}</div>}

      {result && (
        <section>
          <p>
            <strong>{result.message}</strong>
          </p>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Records</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Strategy Areas</td>
                <td>{result.strategyAreas}</td>
              </tr>
              <tr>
                <td>Event Types</td>
                <td>{result.eventTypes}</td>
              </tr>
              <tr>
                <td>Sequence Types</td>
                <td>{result.sequenceTypes}</td>
              </tr>
              <tr>
                <td>Sequence Events</td>
                <td>{result.sequenceEvents}</td>
              </tr>
              {result.tournamentsCleared && (
                <tr>
                  <td>Tournaments</td>
                  <td>Cleared</td>
                </tr>
              )}
              {(result.events > 0 ||
                result.comments > 0 ||
                result.alerts > 0) && (
                <>
                  <tr>
                    <td>Events</td>
                    <td>{result.events}</td>
                  </tr>
                  <tr>
                    <td>Comments</td>
                    <td>{result.comments}</td>
                  </tr>
                  <tr>
                    <td>Alerts</td>
                    <td>{result.alerts}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </section>
      )}
    </section>
  );
};

const ConfigSyncPage = () => {
  return (
    <main>
      <div className="page-header">
        <h1>Sync from Source</h1>
        <p>
          Pull configuration data from a source RavenBrain server. This will
          replace all local config data (strategy areas, event types,
          sequences).
        </p>
      </div>
      <RequireLogin>
        <ConfigSyncForm />
      </RequireLogin>
    </main>
  );
};

export default ConfigSyncPage;
