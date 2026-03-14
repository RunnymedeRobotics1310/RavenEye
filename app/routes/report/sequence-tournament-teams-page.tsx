import { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { getSequenceTeams } from "~/common/storage/rb.ts";
import { useSequenceTypeList } from "~/common/storage/dbhooks.ts";
import Spinner from "~/common/Spinner.tsx";

const SequenceTournamentTeamsPage = () => {
  const { sequenceTypeCode } = useParams<{ sequenceTypeCode: string }>();
  const { list: sequenceTypes } = useSequenceTypeList();
  const [teams, setTeams] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const sequenceType = sequenceTypes.find((st) => st.code === sequenceTypeCode);

  useEffect(() => {
    getSequenceTeams()
      .then((data) => {
        setTeams(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  return (
    <main>
      <div className="page-header">
        <h1>{sequenceType?.name ?? sequenceTypeCode} — Teams</h1>
        <p>
          <NavLink to="/report/tournament/areas">&larr; Back to Strategy Areas</NavLink>
        </p>
      </div>
      <RequireLogin>
        {loading && <Spinner />}
        {error && <p className="banner banner-warning">{error}</p>}
        {teams && teams.length === 0 && (
          <section className="card">
            <p>No teams with event data found.</p>
          </section>
        )}
        {teams && teams.length > 0 && (
          <section className="card">
            <ul className="nav-list">
              {teams.map((teamId) => (
                <li key={teamId}>
                  <NavLink
                    to={`/report/tournament/${sequenceTypeCode}/${teamId}`}
                    className="btn-secondary"
                  >
                    Team {teamId}
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

export default SequenceTournamentTeamsPage;
