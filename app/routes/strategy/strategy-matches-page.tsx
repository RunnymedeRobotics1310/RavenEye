import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate, useParams } from "react-router";
import RequireRole from "~/common/auth/RequireRole.tsx";
import { useMatchSchedule } from "~/common/storage/dbhooks.ts";
import { useFetchSchedule } from "~/common/storage/useFetchSchedule.ts";
import MatchTeamPicker from "~/common/components/MatchTeamPicker.tsx";
import Spinner from "~/common/Spinner.tsx";

const MATCH_LEVELS = ["Qualification", "Playoff", "Practice"] as const;

const StrategyMatchesPage = () => {
  const params = useParams();
  const tournamentId = decodeURIComponent(params.tournamentId ?? "");
  const navigate = useNavigate();
  const { list, loading } = useMatchSchedule();
  const { fetching, error: fetchError, handleFetchSchedule } =
    useFetchSchedule(tournamentId);
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

  // When the schedule has loaded but no matches exist for this tournament,
  // try fetching from the server automatically — once per page load.
  useEffect(() => {
    if (!loading && !hasMatchesForTournament && !autoFetchTried && !fetching) {
      setAutoFetchTried(true);
      handleFetchSchedule();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, hasMatchesForTournament, autoFetchTried, fetching]);

  const selectMatch = (matchNumber: number, level: string) => {
    navigate(
      `/strategy/${encodeURIComponent(tournamentId)}/${encodeURIComponent(level)}/${matchNumber}`,
    );
  };

  return (
    <RequireRole
      roles={["DRIVE_TEAM", "EXPERTSCOUT", "ADMIN", "SUPERUSER"]}
    >
      <main>
        <div className="page-header">
          <h1>Match Strategy — {tournamentId}</h1>
          <p>Pick a match to plan for.</p>
          <NavLink to="/strategy" className="btn-secondary">
            &larr; Back to tournaments
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
                <MatchTeamPicker
                  matches={matches}
                  onSelectMatch={selectMatch}
                />
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
