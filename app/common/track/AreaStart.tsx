import AutoPage from "~/common/track/AutoPage.tsx";
import { useState } from "react";
import ScorePage from "~/common/track/ScorePage.tsx";
import PickupPage from "~/common/track/PickupPage.tsx";
import DefensePage from "~/common/track/DefensePage.tsx";
import EndgamePage from "~/common/track/EndgamePage.tsx";
import PitScoutPage from "~/common/track/PitScoutPage.tsx";

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

const AreaStart = () => {
  const [showAuto, setShowAuto] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const [showPickup, setShowPickup] = useState(false);
  const [showDefense, setShowDefense] = useState(false);
  const [showEndgame, setShowEndgame] = useState(false);
  const [showPit, setShowPit] = useState(false);

  const handleShowAuto = () => {
    setShowAuto(true);
    setShowScore(false);
    setShowPickup(false);
    setShowDefense(false);
    setShowEndgame(false);
    setShowPit(false);
  };
  const handleShowScore = () => {
    setShowAuto(false);
    setShowScore(true);
    setShowPickup(false);
    setShowDefense(false);
    setShowEndgame(false);
    setShowPit(false);
  };
  const handleShowPickup = () => {
    setShowAuto(false);
    setShowScore(false);
    setShowPickup(true);
    setShowDefense(false);
    setShowEndgame(false);
    setShowPit(false);
  };
  const handleShowDefense = () => {
    setShowAuto(false);
    setShowScore(false);
    setShowPickup(false);
    setShowDefense(true);
    setShowEndgame(false);
    setShowPit(false);
  };
  const handleShowEndgame = () => {
    setShowAuto(false);
    setShowScore(false);
    setShowPickup(false);
    setShowDefense(false);
    setShowEndgame(true);
    setShowPit(false);
  };
  const handleShowPit = () => {
    setShowAuto(false);
    setShowScore(false);
    setShowPickup(false);
    setShowDefense(false);
    setShowEndgame(false);
    setShowPit(true);
  };
  return (
    <div>
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
      {showPit && (
        <Envelope closeFunction={() => setShowPit(false)}>
          <PitScoutPage />
        </Envelope>
      )}
      <button onClick={handleShowAuto}>Auto</button>{" "}
      <button onClick={handleShowScore}>Scoring</button>{" "}
      <button onClick={handleShowPickup}>Pickup</button>{" "}
      <button onClick={handleShowDefense}>Defence</button>{" "}
      <button onClick={handleShowEndgame}>Endgame</button>{" "}
      <button onClick={handleShowPit}>I'm a Pit Scout</button>
      <p></p>{" "}
    </div>
  );
};
export default AreaStart;
