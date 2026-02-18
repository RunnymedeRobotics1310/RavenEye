import type { TrackScreenProps } from "~/routes/track/track-home-page";

const PickupPage = ({ goBack }: TrackScreenProps) => {
  return (
    <main>
      <div>
        <button className="secondary" onClick={goBack}>Back</button>
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
