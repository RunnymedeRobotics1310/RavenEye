import { type FormEvent, useState } from "react";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import Spinner from "~/common/Spinner.tsx";
import { useRole } from "~/common/storage/rbauth.ts";
import {
  configSync,
  type ConfigSyncRequest,
  type ConfigSyncResult,
} from "~/common/storage/rb.ts";
import { doManualSync } from "~/common/sync/sync.ts";

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
    };

    try {
      const data = await configSync(request);
      setResult(data);
      doManualSync();
    } catch (err: any) {
      if (err.message.includes("Failed to fetch")) {
        setError("Could not connect to source server");
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
        This will delete ALL local scouting events, comments, and config data
        before importing from the source server.
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
              <tr>
                <td>Tournaments</td>
                <td>{result.tournaments}</td>
              </tr>
              <tr>
                <td>Schedules</td>
                <td>{result.schedules}</td>
              </tr>
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
      <h1>Sync from Source</h1>
      <p>
        Pull configuration data from a source RavenBrain server. This will
        replace all local config data and clear scouting events and comments.
      </p>
      <RequireLogin>
        <ConfigSyncForm />
      </RequireLogin>
    </main>
  );
};

export default ConfigSyncPage;
