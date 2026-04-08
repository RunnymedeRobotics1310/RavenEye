import { useEffect, useMemo, useState } from "react";
import { NavLink, useParams } from "react-router";
import RequireRole from "~/common/auth/RequireRole.tsx";
import { useMatchSchedule } from "~/common/storage/dbhooks.ts";
import {
  fetchTournamentSchedule,
  getScheduleForTournament,
  ping,
} from "~/common/storage/rb.ts";
import { repository } from "~/common/storage/db.ts";
import Spinner from "~/common/Spinner.tsx";

const MATCH_LEVELS = ["Qualification", "Playoff", "Practice"] as const;

const StrategyMatchesPage = () => {
  const params = useParams();
  const tournamentId = decodeURIComponent(params.tournamentId ?? "");
  const { list, loading } = useMatchSchedule();
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [autoFetchTried, setAutoFetchTried] = useState(false);

  const matchesByLevel = useMemo(() => {
    const byLevel: Record<string, typeof list> = {};
    for (const r of list) {
      if (r.tournamentId !== tournamentId) continue;
      (byLevel[r.level] ||= []).push(r);
    }
    for (const level of Object.keys(byLevel)) {
      byLevel[level]!.sort((a, b) => a.match - b.match);
    }
    return byLevel;
  }, [list, tournamentId]);

  const hasMatchesForTournament = Object.keys(matchesByLevel).length > 0;

  const handleFetchSchedule = async () => {
    setFetchError(null);
    const online = await ping();
    if (!online) {
      setFetchError(
        "No local schedule is available and RavenBrain is unreachable. Try again when you're online.",
      );
      return;
    }
    setFetching(true);
    try {
      await fetchTournamentSchedule(tournamentId);
      const records = await getScheduleForTournament(tournamentId);
      await repository.mergeMatchSchedule(records);
    } catch (e) {
      setFetchError(
        "Failed to fetch schedule: " +
          (e instanceof Error ? e.message : String(e)),
      );
    } finally {
      setFetching(false);
    }
  };

  // When the schedule has loaded but no matches exist for this tournament,
  // try fetching from the server automatically — once per page load.
  useEffect(() => {
    if (!loading && !hasMatchesForTournament && !autoFetchTried && !fetching) {
      setAutoFetchTried(true);
      handleFetchSchedule();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, hasMatchesForTournament, autoFetchTried, fetching]);

  return (
    <RequireRole
      roles={["DRIVE_TEAM", "EXPERTSCOUT", "ADMIN", "SUPERUSER"]}
    >
      <main>
        <div className="page-header">
          <h1>Match Strategy — {tournamentId}</h1>
          <p>Pick a match to plan for.</p>
          <NavLink to="/strategy" className="btn-secondary">
            ← Back to tournaments
          </NavLink>
        </div>
        {loading && <Spinner />}
        {!loading &&
          MATCH_LEVELS.map((level) => {
            const matches = matchesByLevel[level] ?? [];
            if (matches.length === 0) return null;
            return (
              <section className="card" key={level}>
                <h2>{level}</h2>
                <div className="strategy-match-grid">
                  {matches.map((m) => (
                    <NavLink
                      key={m.id}
                      to={`/strategy/${encodeURIComponent(tournamentId)}/${encodeURIComponent(level)}/${m.match}`}
                      className="btn-secondary"
                    >
                      {m.match}
                    </NavLink>
                  ))}
                </div>
              </section>
            );
          })}
        {!loading && !hasMatchesForTournament && (
          <section className="card">
            {fetching ? (
              <p>Fetching schedule from RavenBrain…</p>
            ) : (
              <>
                <p>No matches cached locally for this tournament.</p>
                {fetchError && (
                  <p className="banner banner-warning">{fetchError}</p>
                )}
                <button type="button" onClick={handleFetchSchedule}>
                  Fetch Schedule
                </button>
              </>
            )}
          </section>
        )}
      </main>
    </RequireRole>
  );
};

export default StrategyMatchesPage;
