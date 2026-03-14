import { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { getSequenceTournaments } from "~/common/storage/rb.ts";
import { useSequenceTypeList } from "~/common/storage/dbhooks.ts";
import Spinner from "~/common/Spinner.tsx";

const SequenceTournamentTournamentsPage = () => {
  const { sequenceTypeCode, teamId } = useParams<{
    sequenceTypeCode: string;
    teamId: string;
  }>();
  const { list: sequenceTypes } = useSequenceTypeList();
  const [tournaments, setTournaments] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const sequenceType = sequenceTypes.find((st) => st.code === sequenceTypeCode);

  useEffect(() => {
    if (!teamId) return;
    getSequenceTournaments(Number(teamId))
      .then((data) => {
        setTournaments(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [teamId]);

  return (
    <main>
      <div className="page-header">
        <h1>
          {sequenceType?.name ?? sequenceTypeCode} — Team {teamId} Tournaments
        </h1>
        <p>
          <NavLink to={`/report/tournament/${sequenceTypeCode}/teams`}>
            &larr; Back to Teams
          </NavLink>
        </p>
      </div>
      <RequireLogin>
        {loading && <Spinner />}
        {error && <p className="banner banner-warning">{error}</p>}
        {tournaments && tournaments.length === 0 && (
          <section className="card">
            <p>No tournaments with data found for this team.</p>
          </section>
        )}
        {tournaments && tournaments.length > 0 && (
          <section className="card">
            <ul className="nav-list">
              {tournaments.map((tid) => (
                <li key={tid}>
                  <NavLink
                    to={`/report/tournament/${sequenceTypeCode}/${teamId}/${tid}`}
                    className="btn-secondary"
                  >
                    {tid}
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

export default SequenceTournamentTournamentsPage;
