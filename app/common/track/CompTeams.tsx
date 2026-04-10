import type { TrackScreenProps } from "~/routes/track/track-home-page";
import {
  getScoutingSession,
  setScoutingSession,
} from "~/common/storage/track.ts";
import { getUserid } from "~/common/storage/rbauth.ts";
import { useMatchSchedule } from "~/common/storage/dbhooks.ts";
import MatchTeamPicker from "~/common/components/MatchTeamPicker.tsx";
import TrackNav from "~/common/track/TrackNav.tsx";
import { useTrackNav } from "~/common/track/TrackNavContext.tsx";

const CompTeams = ({}: TrackScreenProps) => {
  const { navigate } = useTrackNav();
  const session = getScoutingSession();
  const { list: schedule } = useMatchSchedule();

  const matches = schedule.filter(
    (s) =>
      s.tournamentId === session.tournamentId &&
      s.match === session.matchId &&
      s.level === session.level,
  );

  const handleTeam = (
    _matchNumber: number,
    teamNumber: number,
    alliance: "red" | "blue",
  ) => {
    setScoutingSession({
      ...session,
      userId: getUserid(),
      teamNumber,
      alliance,
    });
    navigate("area-menu");
  };

  return (
    <main className="track">
      <TrackNav />
      <h2>Match {session.matchId}</h2>
      <p>Select a team to scout:</p>
      {matches.length > 0 ? (
        <MatchTeamPicker matches={matches} onSelectTeam={handleTeam} />
      ) : (
        <p>No schedule found for this match.</p>
      )}
    </main>
  );
};

export default CompTeams;
