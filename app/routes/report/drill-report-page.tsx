import { useEffect, useState } from "react";
import { NavLink } from "react-router";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { getDrillSessions } from "~/common/storage/rb.ts";
import Spinner from "~/common/Spinner.tsx";

function formatDrillId(id: string): string {
  // DRILL-YYYYMMDD-HHMM -> readable date/time
  const match = id.match(/^DRILL-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})$/);
  if (!match) return id;
  const [, year, month, day, hour, minute] = match;
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

const DrillReportPage = () => {
  const [sessions, setSessions] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDrillSessions()
      .then((data) => {
        setSessions(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  return (
    <main>
      <h1>Drill Sessions</h1>
      <RequireLogin>
        <p>
          <NavLink to="/report">&larr; Back to Reports</NavLink>
        </p>
        {loading && <Spinner />}
        {error && <p className="banner banner-warning">{error}</p>}
        {sessions && sessions.length === 0 && <p>No drill sessions found.</p>}
        {sessions && sessions.length > 0 && (
          <ul className="nav-list">
            {sessions.map((id) => (
              <li key={id}>
                <NavLink
                  to={`/report/drill/shooter/${id}`}
                  className="btn-secondary"
                >
                  {formatDrillId(id)}
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </RequireLogin>
    </main>
  );
};

export default DrillReportPage;
