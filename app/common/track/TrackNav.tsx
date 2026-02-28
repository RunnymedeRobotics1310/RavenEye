import type { TrackScreenProps } from "~/routes/track/track-home-page";

type TrackNavProps = Pick<TrackScreenProps, "navigate" | "goBack">;

const TrackNav = ({ goBack }: TrackNavProps) => {
  return (
    <nav className="track-nav">
      <button className="secondary" onClick={goBack}>Back</button>
    </nav>
  );
};

export default TrackNav;
