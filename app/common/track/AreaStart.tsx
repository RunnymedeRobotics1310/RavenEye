import type { TrackScreenProps } from "~/routes/track/track-home-page";
import type { Screen } from "~/routes/track/track-home-page";
import { useStrategyAreaList } from "~/common/storage/dbhooks.ts";
import Spinner from "~/common/Spinner.tsx";

const areaScreenMap: Record<string, Screen> = {
  auto: "auto",
  scoring: "score",
  pickup: "pickup",
  defence: "defense",
  defense: "defense",
  endgame: "endgame",
};

const AreaStart = ({ navigate, goBack }: TrackScreenProps) => {
  const { list: areas, loading } = useStrategyAreaList();

  if (loading) {
    return (
      <main>
        <Spinner />
      </main>
    );
  }

  return (
    <main>
      <button onClick={goBack}>Back</button>
      <p>Which area are you scouting?</p>
      {areas.map((area) => {
        const screen = areaScreenMap[area.name.toLowerCase()];
        if (!screen) return null;
        return (
          <span key={area.id}>
            <button onClick={() => navigate(screen)}>{area.name}</button>{" "}
          </span>
        );
      })}
      <button onClick={() => navigate("pit")}>I'm a Pit Scout</button>
    </main>
  );
};
export default AreaStart;
