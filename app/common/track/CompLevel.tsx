import type { TrackScreenProps } from "~/routes/track/track-home-page";
import {
  getScoutingSession,
  setScoutingSession,
} from "~/common/storage/track.ts";
import { useTournamentList } from "~/common/storage/dbhooks.ts";
import TrackNav from "~/common/track/TrackNav.tsx";
import { useTrackNav } from "~/common/track/TrackNavContext.tsx";
import Spinner from "~/common/Spinner.tsx";

const LEVELS = ["Practice", "Qualification", "Playoff"];

const CompLevel = ({}: TrackScreenProps) => {
  const { navigate } = useTrackNav();
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

  const pitScout = () => {
    navigate("pit-scout");
  };

  return (
    <main className="track">
      <TrackNav />
      <h2>{tournamentName}</h2>
      <p>Select match level:</p>
      <div>
        {LEVELS.map((level) => (
          <span key={level}>
            <button onClick={() => selectLevel(level)}>{level}</button>{" "}
          </span>
        ))}
        <button onClick={pitScout}>I'm a Pit Scout</button>
      </div>
    </main>
  );
};

export default CompLevel;
