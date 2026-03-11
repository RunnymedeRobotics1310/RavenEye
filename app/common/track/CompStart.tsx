import type { TrackScreenProps } from "~/routes/track/track-home-page";
import type { RBTournament } from "~/types/RBTournament.ts";
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

function groupByWeek(
  tournaments: RBTournament[],
): Map<number, RBTournament[]> {
  const groups = new Map<number, RBTournament[]>();
  for (const t of tournaments) {
    const list = groups.get(t.weekNumber) ?? [];
    list.push(t);
    groups.set(t.weekNumber, list);
  }
  return groups;
}

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

  const weekGroups = groupByWeek(seasonTournaments);

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
            {activeTeamTournaments.map((t) => (
              <div key={t.id} className="tournament-row">
                <button
                  className="tournament-btn"
                  onClick={() => selectTournament(t.id)}
                >
                  {t.name}
                </button>
                <span className="tournament-date">
                  {formatDate(t.startTime)} – {formatDate(t.endTime)}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="card">
          <h2>All {currentYear} Events</h2>
          {[...weekGroups.entries()].map(([weekNum, tournaments]) => {
            const firstStart = new Date(tournaments[0].startTime);
            const weekLabel = `Week ${weekNum} — ${formatDate(firstStart)}`;
            return (
              <details
                key={weekNum}
                className="tournament-week-group"
                open={tournaments.some((t) => !isFuture(t))}
              >
                <summary>{weekLabel}</summary>
                {tournaments.map((t) => (
                  <div key={t.id} className="tournament-row">
                    <button
                      className="tournament-btn"
                      onClick={() => selectTournament(t.id)}
                      disabled={isFuture(t)}
                    >
                      {t.name}
                    </button>
                    <span className="tournament-date">
                      {formatDate(t.startTime)} – {formatDate(t.endTime)}
                    </span>
                  </div>
                ))}
              </details>
            );
          })}
        </div>
      </div>
    </main>
  );
};

export default CompStart;
