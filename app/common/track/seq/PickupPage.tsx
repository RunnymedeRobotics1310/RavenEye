import type { TrackScreenProps } from "~/routes/track/track-home-page";
import TrackNav from "~/common/track/TrackNav.tsx";

const PickupPage = ({}: TrackScreenProps) => {
  return (
    <main className="track">
      <div>
        <TrackNav />
        <h2>Pickup</h2>
        <p>map</p>
        <button>Start</button>
        {"  time"} <p></p>
        <button>End</button>
        <p>Slider for fuel picked up</p>
        <p>Slider for fuel lost</p>
      </div>
    </main>
  );
};

export default PickupPage;
