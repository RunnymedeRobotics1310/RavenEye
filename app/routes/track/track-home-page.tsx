import RequireLogin from "~/common/auth/RequireLogin.tsx";
import QuickCommentForm from "~/common/track/QuickCommentForm.tsx";
import { useState } from "react";
import AreaStart from "~/common/track/AreaStart.tsx";
import CompStart from "~/common/track/CompStart.tsx";
import DrillSetup from "~/common/track/DrillSetup.tsx";
import CompLevel from "~/common/track/CompLevel.tsx";
import CompTeams from "~/common/track/CompTeams.tsx";
import MatchForm from "~/common/track/MatchForm.tsx";
import Home from "~/common/track/Home.tsx";
import AutoPage from "~/common/track/AutoPage.tsx";
import ScorePage from "~/common/track/ScorePage.tsx";
import PickupPage from "~/common/track/PickupPage.tsx";
import DefensePage from "~/common/track/DefensePage.tsx";
import EndgamePage from "~/common/track/EndgamePage.tsx";
import PitScoutPage from "~/common/track/PitScoutPage.tsx";

export type Screen =
  | "home"
  | "comment"
  | "area-menu"
  | "auto"
  | "score"
  | "pickup"
  | "defense"
  | "endgame"
  | "pit"
  | "drill-setup"
  | "comp-tournament"
  | "comp-level"
  | "comp-match"
  | "comp-teams";

export type TrackScreenProps = {
  navigate: (to: Screen) => void;
  goBack: () => void;
};

const TrackHomePage = () => {
  const [screenStack, setScreenStack] = useState<Screen[]>(["home"]);
  const activeScreen = screenStack[screenStack.length - 1];

  function navigate(to: Screen) {
    setScreenStack((prev) => [...prev, to]);
  }

  function goBack() {
    setScreenStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }

  const props: TrackScreenProps = { navigate, goBack };

  return (
    <RequireLogin>
      {activeScreen === "home" && <Home {...props} />}
      {activeScreen === "comment" && <QuickCommentForm {...props} />}
      {activeScreen === "drill-setup" && <DrillSetup {...props} />}
      {activeScreen === "area-menu" && <AreaStart {...props} />}
      {activeScreen === "auto" && <AutoPage {...props} />}
      {activeScreen === "score" && <ScorePage {...props} />}
      {activeScreen === "pickup" && <PickupPage {...props} />}
      {activeScreen === "defense" && <DefensePage {...props} />}
      {activeScreen === "endgame" && <EndgamePage {...props} />}
      {activeScreen === "pit" && <PitScoutPage {...props} />}
      {activeScreen === "comp-tournament" && <CompStart {...props} />}
      {activeScreen === "comp-level" && <CompLevel {...props} />}
      {activeScreen === "comp-match" && <MatchForm {...props} />}
      {activeScreen === "comp-teams" && <CompTeams {...props} />}
      <hr />
      <hr />
      <h1>Reference Data</h1>
      <h2>Sequences</h2>
      <ul>
        <li>
          <p>Auto</p>
          <ul>
            <li>shoot_start</li>
            <li>shoot_end</li>
            <li>shoot_miss</li>
            <li>pickup_outpost*</li>
            <li>pickup_depot*</li>
            <li>pickup_ballpit*</li>
            <li>pickup_end</li>
            <li>climb_start</li>
            <li>climb_success</li>
            <li>climb_fail</li>
            <li>*might delete, turn into a map instead</li>
          </ul>
        </li>
        <li>
          <p>Scoring</p>
          <ul>
            <li>score_start</li>
            <li>score_end</li>
            <li>score_5</li>
            <li>score_10</li>
            <li>score_15</li>
            <li>score_20</li>
            <li>... keep going</li>
            <li>miss_5</li>
            <li>miss_10</li>
            <li>miss_15</li>
            <li>miss_20</li>
            <li>... keep going</li>
            <li>
              if there's a better way to record slider numbers please let me
              know
            </li>
          </ul>
        </li>
        <li>
          {" "}
          <p>Pickup</p>
          <ul>
            <li>pickup_start</li>
            <li>pickup_end</li>
            <li>pickup_5</li>
            <li>pickup_10</li>
            <li>pickup_15</li>
            <li>pickup_20</li>
            <li>... keep going</li>
            <li>lose_5</li>
            <li>lose_10</li>
            <li>lose_15</li>
            <li>lose_20</li>
            <li>... keep going</li>
          </ul>
        </li>
        <li>
          <p>Defense</p>
          <ul>
            <li>start_defense</li>
            <li>end_defense</li>
            <li>defense_strat_submit</li>
          </ul>
        </li>
        <li>
          <p>Endgame</p>
          <ul>
            <li>start_climbing</li>
            <li>fail_climbing</li>
            <li>stop_climbing</li>
            <li>climb_l1</li>
            <li>climb_l2</li>
            <li>climb_l3</li>
          </ul>
        </li>
      </ul>

      <h2>No-sequence events</h2>
      <ul>
        <li>comment</li>
        <li>
          <p>Penalties</p>
          <ul>
            <li>zone_violation</li>
            <li>fuel_violation</li>
            <li>pin</li>
            <li>other: specify?</li>
          </ul>
        </li>
      </ul>
    </RequireLogin>
  );
};
export default TrackHomePage;
