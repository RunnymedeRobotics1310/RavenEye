import { useEffect, useState } from "react";
import RequireRole from "~/common/auth/RequireRole.tsx";
import Spinner from "~/common/Spinner.tsx";
import ErrorMessage from "~/common/ErrorMessage.tsx";
import { getTelemetryNtKeys } from "~/common/storage/rb.ts";

const NtKeysPage = () => {
  const [keys, setKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    getTelemetryNtKeys()
      .then((list) => {
        if (isMounted) {
          setKeys(list);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (isMounted) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <RequireRole roles={["PROGRAMMER", "ADMIN", "SUPERUSER"]}>
      <main>
        <div className="page-header">
          <h1>Network Table Data</h1>
          <p>
            Distinct NetworkTables keys recorded across all telemetry sessions,
            sorted alphabetically.
          </p>
        </div>
        <section className="card">
          {loading && <Spinner />}
          {error && <ErrorMessage>{error}</ErrorMessage>}
          {!loading && !error && keys.length === 0 && (
            <p>No NetworkTables keys have been recorded yet.</p>
          )}
          {!loading && !error && keys.length > 0 && (
            <ul className="nav-list">
              {keys.map((k) => (
                <li key={k}>
                  <code>{k}</code>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </RequireRole>
  );
};

export default NtKeysPage;
