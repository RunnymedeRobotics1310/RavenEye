import type { TrackScreenProps } from "~/routes/track/track-home-page";
import TrackNav from "~/common/track/TrackNav.tsx";

const ScorePage = ({}: TrackScreenProps) => {
  return (
    <main className="track">
      <div>
        <TrackNav />
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
