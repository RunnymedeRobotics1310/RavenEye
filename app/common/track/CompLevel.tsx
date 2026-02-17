import type { TrackScreenProps } from "~/routes/track/track-home-page";
import {
  getScoutingSession,
  setScoutingSession,
} from "~/common/storage/track.ts";
import { useTournamentList } from "~/common/storage/dbhooks.ts";

const LEVELS = ["Practice", "Qualification", "Playoff"];

const CompLevel = ({ navigate, goBack }: TrackScreenProps) => {
  const session = getScoutingSession();
  const { list: tournaments } = useTournamentList();
  const tournamentName =
    tournaments.find((t) => t.id === session.tournamentId)?.name ??
    session.tournamentId;

  const selectLevel = (level: string) => {
    setScoutingSession({
      ...session,
      level,
    });
    navigate("comp-match");
  };

  return (
    <main>
      <button onClick={goBack}>Back</button>
      <h2>{tournamentName}</h2>
      <p>Select match level:</p>
      <div>
        {LEVELS.map((level) => (
          <span key={level}>
            <button onClick={() => selectLevel(level)}>{level}</button>{" "}
          </span>
        ))}
      </div>
    </main>
  );
};

export default CompLevel;
