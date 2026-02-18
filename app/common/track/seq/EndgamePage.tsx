import type { TrackScreenProps } from "~/routes/track/track-home-page";
import { recordEvent } from "~/common/storage/track.ts";

const EndgamePage = ({ goBack }: TrackScreenProps) => {
  const buttonTest = () => {
    recordEvent("climb-fail");
  };
  return (
    <main>
      <div>
        <button className="secondary" onClick={goBack}>Back</button>
        <h2>Endgame</h2>
        <p>map?</p>
        <button>Start Climb</button>
        {"  time"}
        <p></p>
        <button onClick={buttonTest}>Fail</button>
        <p></p>
        <button>Stop</button>
        <p></p>
        <button>L1</button>
        {""}
        <button>L2</button>
        {""}
        <button>L3</button>
      </div>
    </main>
  );
};

export default EndgamePage;
