import type { TrackScreenProps } from "~/routes/track/track-home-page";

const AutoPage = ({ goBack }: TrackScreenProps) => {
  return (
    <main>
      <button className="secondary" onClick={goBack}>Back</button>
      <h2>Auto</h2>
      <p>map</p>
      <p></p>
      <h4>Shoot</h4>
      <button>Start</button>
      <button>End</button>
      <button>Miss</button>
      {"  time"}
      <p></p>
      <h4>Pickup</h4>
      <button>Start Outpost</button>
      <button>Start Depot</button>
      <button>Start Ballpit</button> <button>End</button>
      {"  time"} <p></p>
      <h4>Climb</h4>
      <button>Start</button>
      <button>Climb</button>
      <button>Fail</button>
      {"  time"} <p></p>
    </main>
  );
};

export default AutoPage;
