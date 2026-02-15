import type { TrackScreenProps } from "~/routes/track/track-home-page";

const EndgamePage = ({ goBack }: TrackScreenProps) => {
  return (
    <main>
      <div>
        <button onClick={goBack}>Back</button>
        <h2>Endgame</h2>
        <p>map?</p>
        <button>Start Climb</button>
        {"  time"}
        <p></p>
        <button>Fail</button>
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
