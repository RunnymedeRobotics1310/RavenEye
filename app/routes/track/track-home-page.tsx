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
import PitScoutPage from "~/common/track/PitScoutPage.tsx";
import areaRegistry from "~/common/track/strat-area/areaRegistry.ts";
import AreaPage from "~/common/track/strat-area/AreaPage.tsx";
import seqRegistry from "~/common/track/seq/seqRegistry.ts";
import SequencePage from "~/common/track/seq/SequencePage.tsx";

export type TrackScreenProps = {
  navigate: (to: string) => void;
  goBack: () => void;
  areaCode?: string;
  sequenceCode?: string;
};

const FIXED_SCREENS = new Set([
  "home",
  "comment",
  "drill-setup",
  "area-menu",
  "pit",
  "comp-tournament",
  "comp-level",
  "comp-match",
  "comp-teams",
]);

const TrackHomePage = () => {
  const [screenStack, setScreenStack] = useState<string[]>(["home"]);
  const activeScreen = screenStack[screenStack.length - 1];

  function navigate(to: string) {
    setScreenStack((prev) => [...prev, to]);
  }

  function goBack() {
    setScreenStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }

  const props: TrackScreenProps = { navigate, goBack };

  function renderDynamicScreen() {
    if (activeScreen.startsWith("seq:")) {
      const code = activeScreen.slice(4);
      const CustomSeq = seqRegistry[code];
      if (CustomSeq) return <CustomSeq {...props} sequenceCode={code} />;
      return <SequencePage {...props} sequenceCode={code} />;
    }
    // Strategy area code
    const CustomArea = areaRegistry[activeScreen];
    if (CustomArea) return <CustomArea {...props} areaCode={activeScreen} />;
    return <AreaPage {...props} areaCode={activeScreen} />;
  }

  return (
    <RequireLogin>
      {activeScreen === "home" && <Home {...props} />}
      {activeScreen === "comment" && <QuickCommentForm {...props} />}
      {activeScreen === "drill-setup" && <DrillSetup {...props} />}
      {activeScreen === "area-menu" && <AreaStart {...props} />}
      {activeScreen === "pit" && <PitScoutPage {...props} />}
      {activeScreen === "comp-tournament" && <CompStart {...props} />}
      {activeScreen === "comp-level" && <CompLevel {...props} />}
      {activeScreen === "comp-match" && <MatchForm {...props} />}
      {activeScreen === "comp-teams" && <CompTeams {...props} />}
      {!FIXED_SCREENS.has(activeScreen) && renderDynamicScreen()}
    </RequireLogin>
  );
};
export default TrackHomePage;
