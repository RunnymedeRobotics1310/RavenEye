import { useEffect, useState } from "react";
import { NavLink } from "react-router";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { useTournamentList } from "~/common/storage/dbhooks.ts";
import { getMegaReportTournaments } from "~/common/storage/rb.ts";
import Spinner from "~/common/Spinner.tsx";
import type { RBTournament } from "~/types/RBTournament.ts";

const MegaReportTournamentsPage = () => {
  const { list: allTournaments } = useTournamentList();
  const [tournamentIds, setTournamentIds] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMegaReportTournaments()
      .then((ids) => {
        setTournamentIds(ids);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  // Match server IDs against IndexedDB tournament list for metadata
  const tournamentsWithData: RBTournament[] = tournamentIds
    ? tournamentIds
        .map((id) => allTournaments.find((t) => t.id === id))
        .filter((t): t is RBTournament => t !== undefined)
    : [];

  // Group by season (year), descending
  const grouped = new Map<number, RBTournament[]>();
  for (const t of tournamentsWithData) {
    const year = t.season;
    if (!grouped.has(year)) {
      grouped.set(year, []);
    }
    grouped.get(year)!.push(t);
  }
  const sortedYears = [...grouped.keys()].sort((a, b) => b - a);

  // Tournament IDs that are in event data but not in our local tournament list
  const unknownIds = tournamentIds
    ? tournamentIds.filter((id) => !allTournaments.some((t) => t.id === id))
    : [];

  return (
    <main>
      <div className="page-header">
        <h1>Mega Report</h1>
        <p>
          <NavLink to="/report">&larr; Back to Reports</NavLink>
        </p>
      </div>
      <RequireLogin>
        {loading && <Spinner />}
        {error && <p className="banner banner-warning">{error}</p>}
        {tournamentIds && tournamentIds.length === 0 && (
          <p>No tournaments have tracking data recorded.</p>
        )}
        {sortedYears.map((year) => (
          <section key={year} className="card">
            <h2>{year}</h2>
            <ul className="nav-list">
              {grouped.get(year)!.map((t) => (
                <li key={t.id}>
                  <NavLink
                    to={`/report/mega/${t.id}`}
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
                    to={`/report/mega/${id}`}
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

export default MegaReportTournamentsPage;
