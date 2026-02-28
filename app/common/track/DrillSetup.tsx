import { useEffect, useState } from "react";
import type { TrackScreenProps } from "~/routes/track/track-home-page";
import { setScoutingSession } from "~/common/storage/track.ts";
import { getUserid } from "~/common/storage/rbauth.ts";
import TrackNav from "~/common/track/TrackNav.tsx";
import { useTrackNav } from "~/common/track/TrackNavContext.tsx";

const DrillSetup = ({}: TrackScreenProps) => {
  const { navigate } = useTrackNav();
  const [alliance, setAlliance] = useState<"red" | "blue">("red");
  const [teamNumber, setTeamNumber] = useState(1310);

  const handleStart = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const tournamentId = `DRILL-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;

    setScoutingSession({
      userId: getUserid(),
      tournamentId,
      level: "Practice",
      matchId: 1,
      alliance,
      teamNumber,
    });
    navigate("area-menu");
  };

  const testAlliance = (words: string) => {
    console.log(words);
  };

  return (
    <main className="track">
      <TrackNav />
      <h2>Drill Setup</h2>

      <p>Alliance:</p>
      <div>
        <button
          className={alliance === "red" ? "allianceRedClicked" : "allianceRed"}
          onClick={() => {
            setAlliance("red");
            testAlliance(alliance); //WEIRD AS HELL
          }}
        >
          Red
        </button>{" "}
        <button
          className={
            alliance === "blue" ? "allianceBlueClicked" : "allianceBlue"
          }
          onClick={() => {
            setAlliance("blue");
            testAlliance(alliance);
          }}
        >
          Blue
        </button>
      </div>

      <p>Team number:</p>
      <input
        type="number"
        value={teamNumber}
        onChange={(e) => setTeamNumber(Number(e.target.value))}
      />

      <p>
        <button onClick={handleStart}>Start Drill</button>
      </p>
    </main>
  );
};

export default DrillSetup;
