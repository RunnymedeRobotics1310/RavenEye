import type { TrackScreenProps } from "~/routes/track/track-home-page";

const ScorePage = ({ goBack }: TrackScreenProps) => {
  return (
    <main>
      <div>
        <button className="secondary" onClick={goBack}>Back</button>
        <h2>Scoring</h2>
        <p>map</p>
        <button>Start</button>
        {"  time"} <p></p>
        <button>End</button>
        <p>Slider for fuel thrown</p>
        <p>Slider for fuel scored</p>
      </div>
    </main>
  );
};
export default ScorePage;
