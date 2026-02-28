import { useTrackNav } from "~/common/track/TrackNavContext.tsx";

const BackButton = () => {
  const { goBack, hasHistory } = useTrackNav();
  return (
    <button className="secondary" onClick={goBack} disabled={!hasHistory}>
      Back
    </button>
  );
};

export default BackButton;
