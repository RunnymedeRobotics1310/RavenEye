import { useState } from "react";
import type { TrackScreenProps } from "~/routes/track/track-home-page";
import { newDrillSession } from "~/common/storage/track.ts";
import TrackNav from "~/common/track/TrackNav.tsx";
import { useTrackNav } from "~/common/track/TrackNavContext.tsx";

const DrillSetup = ({}: TrackScreenProps) => {
  const { navigate } = useTrackNav();
  const [alliance, setAlliance] = useState<"red" | "blue">("red");
  const [teamNumber, setTeamNumber] = useState(1310);

  const handleStart = () => {
    newDrillSession(alliance, teamNumber);
    navigate("area-menu");
  };

  return (
    <main className="track">
      <TrackNav />
      <h2>Drill Setup</h2>

      <p>Alliance:</p>
      <div>
        <button
          className={alliance === "red" ? "allianceRedClicked" : "allianceRed"}
          onClick={() => setAlliance("red")}
        >
          Red
        </button>{" "}
        <button
          className={
            alliance === "blue" ? "allianceBlueClicked" : "allianceBlue"
          }
          onClick={() => setAlliance("blue")}
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
