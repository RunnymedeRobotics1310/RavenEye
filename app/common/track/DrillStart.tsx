import AutoPage from "~/common/track/AutoPage.tsx";
import { useState } from "react";
import ScorePage from "~/common/track/ScorePage.tsx";
import PickupPage from "~/common/track/PickupPage.tsx";
import DefensePage from "~/common/track/DefensePage.tsx";
import EndgamePage from "~/common/track/EndgamePage.tsx";

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
  const [showPickup, setShowPickup] = useState(false);
  const [showDefense, setShowDefense] = useState(false);
  const [showEndgame, setShowEndgame] = useState(false);

  const handleShowAuto = () => {
    setShowAuto(true);
    setShowScore(false);
    setShowPickup(false);
    setShowDefense(false);
    setShowEndgame(false);
  };
  const handleShowScore = () => {
    setShowAuto(false);
    setShowScore(true);
    setShowPickup(false);
    setShowDefense(false);
    setShowEndgame(false);
  };
  const handleShowPickup = () => {
    setShowAuto(false);
    setShowScore(false);
    setShowPickup(true);
    setShowDefense(false);
    setShowEndgame(false);
  };
  const handleShowDefense = () => {
    setShowAuto(false);
    setShowScore(false);
    setShowPickup(false);
    setShowDefense(true);
    setShowEndgame(false);
  };
  const handleShowEndgame = () => {
    setShowAuto(false);
    setShowScore(false);
    setShowPickup(false);
    setShowDefense(false);
    setShowEndgame(true);
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
      {showPickup && (
        <Envelope closeFunction={() => setShowPickup(false)}>
          <PickupPage />
        </Envelope>
      )}
      {showDefense && (
        <Envelope closeFunction={() => setShowDefense(false)}>
          <DefensePage />
        </Envelope>
      )}
      {showEndgame && (
        <Envelope closeFunction={() => setShowEndgame(false)}>
          <EndgamePage />
        </Envelope>
      )}
      <button onClick={handleShowAuto}>Auto</button>{" "}
      <button onClick={handleShowScore}>Scoring</button>{" "}
      <button onClick={handleShowPickup}>Pickup</button>{" "}
      <button onClick={handleShowDefense}>Defence</button>{" "}
      <button onClick={handleShowEndgame}>Endgame</button>
      <p></p>{" "}
    </div>
  );
};
export default DrillStart;
