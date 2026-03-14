import { useEffect, useState } from "react";
import { NavLink } from "react-router";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { getTeamSummaryTeams } from "~/common/storage/rb.ts";
import Spinner from "~/common/Spinner.tsx";

const SummaryReportTeamsPage = () => {
  const [teams, setTeams] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTeamSummaryTeams()
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
        <h1>Team Summary Report</h1>
        <p>
          <NavLink to="/report">&larr; Back to Reports</NavLink>
        </p>
      </div>
      <RequireLogin>
        {loading && <Spinner />}
        {error && <p className="banner banner-warning">{error}</p>}
        {teams && teams.length === 0 && (
          <p>No teams have data recorded.</p>
        )}
        {teams && teams.length > 0 && (
          <section className="card">
            <h2>Select a Team</h2>
            <ul className="nav-list">
              {teams.map((team) => (
                <li key={team}>
                  <NavLink
                    to={`/report/summary/${team}`}
                    className="btn-secondary"
                  >
                    Team {team}
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

export default SummaryReportTeamsPage;
