import { useState } from "react";
import type { TrackScreenProps } from "~/routes/track/track-home-page";
import {
  getScoutingSession,
  setScoutingSession,
} from "~/common/storage/track.ts";
import { useTournamentList } from "~/common/storage/dbhooks.ts";
import { useMatchSchedule } from "~/common/storage/dbhooks.ts";
import {
  fetchTournamentSchedule,
  getScheduleForTournament,
  ping,
} from "~/common/storage/rb.ts";
import { repository } from "~/common/storage/db.ts";
import TrackNav from "~/common/track/TrackNav.tsx";
import { useTrackNav } from "~/common/track/TrackNavContext.tsx";

const MatchForm = ({}: TrackScreenProps) => {
  const { navigate } = useTrackNav();
  const session = getScoutingSession();
  const { list: tournaments } = useTournamentList();
  const { list: schedule } = useMatchSchedule();
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tournamentName =
    tournaments.find((t) => t.id === session.tournamentId)?.name ??
    session.tournamentId;

  const matches = schedule
    .filter(
      (s) =>
        s.tournamentId === session.tournamentId && s.level === session.level,
    )
    .sort((a, b) => a.match - b.match);

  const selectMatch = (matchId: number) => {
    setScoutingSession({
      ...session,
      matchId,
    });
    navigate("comp-teams");
  };

  const handleFetchSchedule = async () => {
    setError(null);
    const online = await ping();
    if (!online) {
      setError(
        "No schedule is available. You must be able to connect to RavenBrain to load the schedule.",
      );
      return;
    }
    setFetching(true);
    try {
      await fetchTournamentSchedule(session.tournamentId);
      const records = await getScheduleForTournament(session.tournamentId);
      await repository.mergeMatchSchedule(records);
    } catch (e) {
      setError(
        "Failed to fetch schedule: " +
          (e instanceof Error ? e.message : String(e)),
      );
    } finally {
      setFetching(false);
    }
  };

  return (
    <main className="track">
      <TrackNav />
      <h2>
        {tournamentName} – {session.level}
      </h2>
      {matches.length === 0 ? (
        <div>
          <p>No matches found for this level.</p>
          {error && <p className="banner banner-warning">{error}</p>}
          <button onClick={handleFetchSchedule} disabled={fetching}>
            {fetching ? "Fetching..." : "Fetch Schedule"}
          </button>
        </div>
      ) : (
        <table className="tools">
          <thead>
            <tr>
              <th>Match</th>
              <th colSpan={3} className="alliance-red-text">
                Red
              </th>
              <th colSpan={3} className="alliance-blue-text">
                Blue
              </th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => (
              <tr key={m.match}>
                <td>
                  <button onClick={() => selectMatch(m.match)}>
                    {m.match}
                  </button>
                </td>
                <td className="alliance-red-text">{m.red1}</td>
                <td className="alliance-red-text">{m.red2}</td>
                <td className="alliance-red-text">{m.red3}</td>
                <td className="alliance-blue-text">{m.blue1}</td>
                <td className="alliance-blue-text">{m.blue2}</td>
                <td className="alliance-blue-text">{m.blue3}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
};
export default MatchForm;
