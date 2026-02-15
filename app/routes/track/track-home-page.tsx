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
    </RequireLogin>
  );
};
export default TrackHomePage;
