import { useEffect, useState } from "react";
import { NavLink } from "react-router";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { useTournamentList } from "~/common/storage/dbhooks.ts";
import { getPmvaReportTournaments } from "~/common/storage/rb.ts";
import Spinner from "~/common/Spinner.tsx";
import TournamentPicker from "~/common/components/TournamentPicker.tsx";

const PmvaReportTournamentsPage = () => {
  const { list: allTournaments } = useTournamentList();
  const [tournamentIds, setTournamentIds] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPmvaReportTournaments()
      .then((ids) => {
        setTournamentIds(ids);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const unknownIds = tournamentIds
    ? tournamentIds.filter((id) => !allTournaments.some((t) => t.id === id))
    : [];

  return (
    <main>
      <div className="page-header">
        <h1>Post-Match Video Analysis Report</h1>
        <p>
          <NavLink to="/report">&larr; Back to Reports</NavLink>
        </p>
      </div>
      <RequireLogin>
        {loading && <Spinner />}
        {error && <p className="banner banner-warning">{error}</p>}
        {tournamentIds && tournamentIds.length === 0 && (
          <p>No tournaments have PMVA data recorded.</p>
        )}
        {tournamentIds && tournamentIds.length > 0 && (
          <TournamentPicker
            tournaments={allTournaments}
            filterToIds={tournamentIds}
            showTypeahead={false}
            groupBy="season"
            renderTournament={(t) => (
              <NavLink
                to={`/report/pmva/${t.id}`}
                className="btn-secondary"
              >
                {t.name}
              </NavLink>
            )}
            emptyMessage="No tournaments have PMVA data recorded."
          />
        )}
        {unknownIds.length > 0 && (
          <section className="card">
            <h2>Other</h2>
            <ul className="nav-list">
              {unknownIds.map((id) => (
                <li key={id}>
                  <NavLink
                    to={`/report/pmva/${id}`}
                    className="btn-secondary"
                  >
                    {id}
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

export default PmvaReportTournamentsPage;
