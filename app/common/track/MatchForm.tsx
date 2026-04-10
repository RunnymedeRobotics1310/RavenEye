import type { TrackScreenProps } from "~/routes/track/track-home-page";
import {
  getScoutingSession,
  setScoutingSession,
} from "~/common/storage/track.ts";
import { getUserid } from "~/common/storage/rbauth.ts";
import { useTournamentList } from "~/common/storage/dbhooks.ts";
import { useMatchSchedule } from "~/common/storage/dbhooks.ts";
import { useFetchSchedule } from "~/common/storage/useFetchSchedule.ts";
import MatchTeamPicker from "~/common/components/MatchTeamPicker.tsx";
import TrackNav from "~/common/track/TrackNav.tsx";
import { useTrackNav } from "~/common/track/TrackNavContext.tsx";

const MatchForm = ({}: TrackScreenProps) => {
  const { navigate } = useTrackNav();
  const session = getScoutingSession();
  const { list: tournaments } = useTournamentList();
  const { list: schedule } = useMatchSchedule();
  const { fetching, error, handleFetchSchedule } = useFetchSchedule(
    session.tournamentId,
  );

  const tournamentName =
    tournaments.find((t) => t.id === session.tournamentId)?.name ??
    session.tournamentId;

  const matches = schedule
    .filter(
      (s) =>
        s.tournamentId === session.tournamentId && s.level === session.level,
    )
    .sort((a, b) => a.match - b.match);

  const selectTeam = (
    matchId: number,
    teamNumber: number,
    alliance: "red" | "blue",
  ) => {
    setScoutingSession({
      ...session,
      userId: getUserid(),
      matchId,
      teamNumber,
      alliance,
    });
    navigate("area-menu");
  };

  return (
    <main className="track">
      <TrackNav />
      <h2>
        {tournamentName} – {session.level}
      </h2>
      <p>Select a team to scout:</p>
      {matches.length === 0 ? (
        <div>
          <p>No matches found for this level.</p>
          {error && <p className="banner banner-warning">{error}</p>}
          <button onClick={handleFetchSchedule} disabled={fetching}>
            {fetching ? "Fetching..." : "Fetch Schedule"}
          </button>
        </div>
      ) : (
        <MatchTeamPicker matches={matches} onSelectTeam={selectTeam} />
      )}
    </main>
  );
};
export default MatchForm;
