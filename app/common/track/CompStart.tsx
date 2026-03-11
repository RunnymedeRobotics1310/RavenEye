import type { TrackScreenProps } from "~/routes/track/track-home-page";
import {
  useActiveTeamTournaments,
  useTournamentList,
} from "~/common/storage/dbhooks.ts";
import {
  getScoutingSession,
  setScoutingSession,
} from "~/common/storage/track.ts";
import { getUserid } from "~/common/storage/rbauth.ts";
import Spinner from "~/common/Spinner.tsx";
import TrackNav from "~/common/track/TrackNav.tsx";
import { useTrackNav } from "~/common/track/TrackNavContext.tsx";

const CompStart = ({}: TrackScreenProps) => {
  const { navigate } = useTrackNav();
  const { list: activeTeamTournaments, loading: activeLoading } =
    useActiveTeamTournaments();
  const { list: allTournaments, loading: allLoading } = useTournamentList();
  const loading = activeLoading || allLoading;

  const currentYear = new Date().getFullYear();
  const seasonTournaments = allTournaments
    .filter((t) => t.season === currentYear)
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );

  const now = new Date();

  const isFuture = (t: { startTime: Date }) => new Date(t.startTime) > now;

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

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
    <main className="track scout-select">
      <div>
        <TrackNav />

        {activeTeamTournaments.length > 0 && (
          <div className="card">
            <h2>Active Competition</h2>
            <table className="tools">
              <tbody>
                {activeTeamTournaments.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <button
                        className="tournament-btn"
                        onClick={() => selectTournament(t.id)}
                      >
                        {t.name}
                      </button>
                    </td>
                    <td className="tournament-date">
                      {formatDate(t.startTime)} – {formatDate(t.endTime)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="card">
          <h2>All {currentYear} Events</h2>
          <table className="tools">
            <tbody>
              {seasonTournaments.map((t) => (
                <tr key={t.id}>
                  <td>
                    <button
                      className="tournament-btn"
                      onClick={() => selectTournament(t.id)}
                      disabled={isFuture(t)}
                    >
                      {t.name}
                    </button>
                  </td>
                  <td className="tournament-date">
                    {formatDate(t.startTime)} – {formatDate(t.endTime)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

export default CompStart;
