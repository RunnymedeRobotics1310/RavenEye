import { useEffect, useState } from "react";
import { NavLink } from "react-router";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { useTournamentList } from "~/common/storage/dbhooks.ts";
import { getPmvaReportTournaments } from "~/common/storage/rb.ts";
import Spinner from "~/common/Spinner.tsx";
import type { RBTournament } from "~/types/RBTournament.ts";

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

  const tournamentsWithData: RBTournament[] = tournamentIds
    ? tournamentIds
        .map((id) => allTournaments.find((t) => t.id === id))
        .filter((t): t is RBTournament => t !== undefined)
    : [];

  const grouped = new Map<number, RBTournament[]>();
  for (const t of tournamentsWithData) {
    const year = t.season;
    if (!grouped.has(year)) {
      grouped.set(year, []);
    }
    grouped.get(year)!.push(t);
  }
  const sortedYears = [...grouped.keys()].sort((a, b) => b - a);

  const unknownIds = tournamentIds
    ? tournamentIds.filter((id) => !allTournaments.some((t) => t.id === id))
    : [];

  return (
    <main>
      <div className="page-header">
        <h1>PMVA Report</h1>
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
        {sortedYears.map((year) => (
          <section key={year} className="card">
            <h2>{year}</h2>
            <ul className="nav-list">
              {grouped.get(year)!.map((t) => (
                <li key={t.id}>
                  <NavLink
                    to={`/report/pmva/${t.id}`}
                    className="btn-secondary"
                  >
                    {t.name}
                  </NavLink>
                </li>
              ))}
            </ul>
          </section>
        ))}
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
