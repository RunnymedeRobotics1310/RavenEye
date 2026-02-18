import type { TrackScreenProps } from "~/routes/track/track-home-page";
import {
  getScoutingSession,
  setScoutingSession,
} from "~/common/storage/track.ts";
import { useTournamentList } from "~/common/storage/dbhooks.ts";
import { useMatchSchedule } from "~/common/storage/dbhooks.ts";

const MatchForm = ({ navigate, goBack }: TrackScreenProps) => {
  const session = getScoutingSession();
  const { list: tournaments } = useTournamentList();
  const { list: schedule } = useMatchSchedule();

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

  return (
    <main>
      <button className="secondary" onClick={goBack}>Back</button>
      <h2>
        {tournamentName} – {session.level}
      </h2>
      {matches.length === 0 ? (
        <p>No matches found for this level.</p>
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
