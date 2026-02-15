import type { TrackScreenProps } from "~/routes/track/track-home-page";
import DebugEventSyncForm from "~/common/track/DebugEventSyncForm.tsx";

const Home = ({ navigate }: TrackScreenProps) => {
  return (
    <main>
      <h1>Track</h1>
      <p>
        Scouts and team members - you're in the right place to track robots!
      </p>

      <div>
        <button onClick={() => navigate("comment")}>Quick Comment</button>{" "}
        <button onClick={() => navigate("drill-setup")}>Drill</button>{" "}
        <button onClick={() => navigate("comp-tournament")}>Comp</button>
      </div>

      <DebugEventSyncForm />
    </main>
  );
};
export default Home;
