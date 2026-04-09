import type { TrackScreenProps } from "~/routes/track/track-home-page";
import { useTrackNav } from "~/common/track/TrackNavContext.tsx";
import { useRole } from "~/common/storage/rbauth.ts";

const Home = ({}: TrackScreenProps) => {
  const { navigate } = useTrackNav();
  const { isDataScout, isExpertScout, isAdmin, isSuperuser, loading } =
    useRole();
  const canTrack = isDataScout || isExpertScout || isAdmin || isSuperuser;

  return (
    <main className="track">
      <h1>Track</h1>
      <p>
        Scouts and team members - you're in the right place to track robots!
      </p>

      <div className="card">
        <h2>Track a Robot</h2>
        <p>
          <button
            onClick={() => navigate("comp-tournament")}
            disabled={loading || !canTrack}
          >
            Competition
          </button>
        </p>
        <p>
          The main tracking mode for data scouts recording robot performance
          during a competition match.
        </p>
        <p>
          <button
            onClick={() => navigate("drill-setup")}
            disabled={loading || !canTrack}
          >
            Drill
          </button>
        </p>
        <p>
          Record drills for a team, like timing autos, counting points per
          interval, and other training activities when not in competition.
        </p>
      </div>

      <div className="card">
        <h2>Comments & Alerts</h2>
        <p>
          <button onClick={() => navigate("comment")}>Quick Comment</button>
        </p>
        <p>
          Record a quick comment about a team for the scouting team to consider
          during deliberations.
        </p>
        <p>
          <button
              onClick={() => navigate("robot-alert")}
              disabled={loading || !canTrack}
          >
            Robot Alert
          </button>
        </p>
        <p>
          Record an important alert about a robot that scouts should use while
          tracking the robot, or that the scouting team should use when
          deliberating.
        </p>
      </div>

    </main>
  );
};
export default Home;
