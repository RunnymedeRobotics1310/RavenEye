import { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { getMegaReportTeams } from "~/common/storage/rb.ts";
import Spinner from "~/common/Spinner.tsx";
import TeamList from "~/common/components/TeamList.tsx";

const ChronoReportTeamsPage = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [teams, setTeams] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) return;
    setLoading(true);
    getMegaReportTeams(tournamentId)
      .then((data) => {
        setTeams(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [tournamentId]);

  return (
    <main>
      <div className="page-header">
        <h1>Chronological Event Report — {tournamentId}</h1>
        <p>
          <NavLink to="/report/chrono">&larr; Back to Tournaments</NavLink>
        </p>
      </div>
      <RequireLogin>
        {loading && <Spinner />}
        {error && <p className="banner banner-warning">{error}</p>}
        {teams && (
          <section className="card">
            <h2>Select a Team</h2>
            <TeamList
              teams={teams}
              renderTeam={(team) => (
                <NavLink
                  to={`/report/chrono/${tournamentId}/${team}`}
                  className="btn-secondary"
                >
                  Team {team}
                </NavLink>
              )}
              emptyMessage="No teams have data for this tournament."
            />
          </section>
        )}
      </RequireLogin>
    </main>
  );
};

export default ChronoReportTeamsPage;
