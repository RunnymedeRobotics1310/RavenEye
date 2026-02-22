import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { useState } from "react";
import trackPageRegistry from "~/common/track/trackPageRegistry.ts";

export type TrackScreenProps = {
  navigate: (to: string) => void;
  goBack: () => void;
  areaCode?: string;
  sequenceCode?: string;
};

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
    // console.log("Attempting to render", activeScreen);
    if (activeScreen.startsWith("seq:")) {
      const CustomSeq = trackPageRegistry[activeScreen];
      if (CustomSeq) return <CustomSeq {...props} sequenceCode={activeScreen.slice(4)} />;
      const DefaultSeq = trackPageRegistry["seq:default"];
      return <DefaultSeq {...props} sequenceCode={activeScreen.slice(4)} />;
    }

    if (activeScreen.startsWith("area:")) {
      const CustomArea = trackPageRegistry[activeScreen];
      if (CustomArea) return <CustomArea {...props} areaCode={activeScreen.slice(5)} />;
      const DefaultArea = trackPageRegistry["area:default"];
      return <DefaultArea {...props} areaCode={activeScreen.slice(5)} />;
    }

    const ThePage = trackPageRegistry[activeScreen];
    if (ThePage) return <ThePage {...props} />;
    return <h1>Not found</h1>

  }

  return (
    <RequireLogin>
      {renderDynamicScreen()}
    </RequireLogin>
  );
};
export default TrackHomePage;
