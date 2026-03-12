import { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { getDrillSessions } from "~/common/storage/rb.ts";
import { useSequenceTypeList } from "~/common/storage/dbhooks.ts";
import Spinner from "~/common/Spinner.tsx";

function formatDrillId(id: string): string {
  const match = id.match(/^DRILL-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})$/);
  if (!match) return id;
  const [, year, month, day, hour, minute] = match;
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

const SequenceDrillSessionsPage = () => {
  const { sequenceTypeCode } = useParams<{ sequenceTypeCode: string }>();
  const { list: sequenceTypes } = useSequenceTypeList();
  const [sessions, setSessions] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const sequenceType = sequenceTypes.find((st) => st.code === sequenceTypeCode);

  useEffect(() => {
    if (!sequenceType) return;
    getDrillSessions(1310, new Date().getFullYear(), sequenceType.id)
      .then((data) => {
        setSessions(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [sequenceType?.id]);

  return (
    <main>
      <div className="page-header">
        <h1>{sequenceType?.name ?? sequenceTypeCode} — Drill Sessions</h1>
        <p>
          <NavLink to="/report/drill/areas">&larr; Back to Strategy Areas</NavLink>
        </p>
      </div>
      <RequireLogin>
        {loading && <Spinner />}
        {error && <p className="banner banner-warning">{error}</p>}
        {sessions && sessions.length === 0 && (
          <section className="card">
            <p>No drill sessions found.</p>
          </section>
        )}
        {sessions && sessions.length > 0 && (
          <section className="card">
            <ul className="nav-list">
              {sessions.map((id) => (
                <li key={id}>
                  <NavLink
                    to={`/report/drill/${sequenceTypeCode}/${id}`}
                    className="btn-secondary"
                  >
                    {formatDrillId(id)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </section>
        )}
      </RequireLogin>
    </main>
  );
};

export default SequenceDrillSessionsPage;
