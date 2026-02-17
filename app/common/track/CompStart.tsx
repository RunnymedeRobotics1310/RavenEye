import type { TrackScreenProps } from "~/routes/track/track-home-page";
import { useRecentTournamentList } from "~/common/storage/dbhooks.ts";
import {
  getScoutingSession,
  setScoutingSession,
} from "~/common/storage/track.ts";
import { getUserid } from "~/common/storage/rbauth.ts";
import Spinner from "~/common/Spinner.tsx";
import { useTournamentList } from "~/common/storage/dbhooks.ts";

// TODO: Remove after dev — include past event for testing
const DEV_TOURNAMENT_ID = "2025ONCMP2";

const CompStart = ({ navigate, goBack }: TrackScreenProps) => {
  const { list: recentTournaments, loading: recentLoading } =
    useRecentTournamentList();
  const { list: allTournaments, loading: allLoading } = useTournamentList();
  const loading = recentLoading || allLoading;
  const devTournament = allTournaments.find(
    (t) => t.id === DEV_TOURNAMENT_ID,
  );
  const tournaments = [
    ...(devTournament ? [devTournament] : []),
    ...recentTournaments.filter((t) => t.id !== DEV_TOURNAMENT_ID),
  ];

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const selectTournament = (tournamentId: string) => {
    setScoutingSession({
      ...getScoutingSession(),
      userId: getUserid(),
      tournamentId,
    });
    navigate("comp-level");
  };

  if (loading) {
    return (
      <main>
        <Spinner />
      </main>
    );
  }

  return (
    <main className="scout-select">
      <div>
        <button onClick={goBack}>Back</button>
        <h2>{new Date().getFullYear()} Tournaments</h2>
        <p>Select a tournament:</p>
        <table className="tools">
          <tbody>
            {tournaments.map((t) => (
              <tr key={t.id}>
                <td>
                  <button
                    style={{ width: "100%" }}
                    onClick={() => selectTournament(t.id)}
                  >
                    {t.name}
                  </button>
                </td>
                <td
                  style={{
                    color: "var(--thirdendary-text)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatDate(t.startTime)} – {formatDate(t.endTime)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
};

export default CompStart;
