import type { TrackScreenProps } from "~/routes/track/track-home-page";
import {
  getScoutingSession,
  setScoutingSession,
} from "~/common/storage/track.ts";
import { getUserid } from "~/common/storage/rbauth.ts";
import { useMatchSchedule } from "~/common/storage/dbhooks.ts";

const CompTeams = ({ navigate, goBack }: TrackScreenProps) => {
  const session = getScoutingSession();
  const { list: schedule } = useMatchSchedule();

  const match = schedule.find(
    (s) =>
      s.tournamentId === session.tournamentId &&
      s.match === session.matchId &&
      s.level === session.level,
  );

  const handleTeam = (teamNumber: number, alliance: string) => {
    setScoutingSession({
      ...session,
      userId: getUserid(),
      teamNumber,
      alliance,
    });
    navigate("area-menu");
  };

  const redTeams = match ? [match.red1, match.red2, match.red3] : [];
  const blueTeams = match ? [match.blue1, match.blue2, match.blue3] : [];

  return (
    <main>
      <button className="secondary" onClick={goBack}>Back</button>
      <h2>Match {session.matchId}</h2>
      <p>Select a team to scout:</p>
      {match ? (
        <div className="team-select">
          {redTeams.map((team, i) => (
            <button
              key={team}
              id={`red${i + 1}`}
              className="allianceRed"
              onClick={() => handleTeam(team, "red")}
            >
              {team}
            </button>
          ))}
          {blueTeams.map((team, i) => (
            <button
              key={team}
              id={`blue${i + 1}`}
              className="allianceBlue"
              onClick={() => handleTeam(team, "blue")}
            >
              {team}
            </button>
          ))}
        </div>
      ) : (
        <p>No schedule found for this match.</p>
      )}
    </main>
  );
};

export default CompTeams;
