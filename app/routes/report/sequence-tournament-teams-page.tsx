import { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { getSequenceTeams } from "~/common/storage/rb.ts";
import { useSequenceTypeList } from "~/common/storage/dbhooks.ts";
import Spinner from "~/common/Spinner.tsx";
import TeamList from "~/common/components/TeamList.tsx";

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
        {teams && (
          <section className="card">
            <TeamList
              teams={teams}
              renderTeam={(teamId) => (
                <NavLink
                  to={`/report/tournament/${sequenceTypeCode}/${teamId}`}
                  className="btn-secondary"
                >
                  Team {teamId}
                </NavLink>
              )}
              emptyMessage="No teams with event data found."
            />
          </section>
        )}
      </RequireLogin>
    </main>
  );
};

export default SequenceTournamentTeamsPage;
