import AutoPage from "~/common/track/AutoPage.tsx";
import { useState } from "react";
import ScorePage from "~/common/track/ScorePage.tsx";

type EnvelopeProps = {
  closeFunction: () => void;
  children: React.ReactNode;
};
const Envelope = (props: EnvelopeProps) => {
  return (
    <div>
      {props.children}
      <button onClick={props.closeFunction}>Close</button>
    </div>
  );
};

const DrillStart = () => {
  const [showAuto, setShowAuto] = useState(false);
  const [showScore, setShowScore] = useState(false);

  const handleShowAuto = () => {
    setShowAuto(true);
    setShowScore(false);
  };
  const handleShowScore = () => {
    setShowAuto(false);
    setShowScore(true);
  };

  return (
    <div>
      <p> Drill</p>
      <p> Which area are you scouting? </p>
      {showAuto && (
        <Envelope closeFunction={() => setShowAuto(false)}>
          <AutoPage />
        </Envelope>
      )}
      {showScore && (
        <Envelope closeFunction={() => setShowScore(false)}>
          <ScorePage />
        </Envelope>
      )}
      <button onClick={handleShowAuto}>Auto</button>{" "}
      <button onClick={handleShowScore}>Scoring</button> <button>Pickup</button>{" "}
      <button>Defence</button> <button>Endgame</button>
      <p></p>
    </div>
  );
};
export default DrillStart;
