import RequireLogin from "~/common/auth/RequireLogin.tsx";
import trackPageRegistry from "~/common/track/trackPageRegistry.ts";
import { TrackNavProvider, useActiveScreen } from "~/common/track/TrackNavContext.tsx";

export type TrackScreenProps = {
  areaCode?: string;
  sequenceCode?: string;
};

const TrackScreen = () => {
  const activeScreen = useActiveScreen();

  const props: TrackScreenProps = {};

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
  return <h1>Not found</h1>;
};

const TrackHomePage = () => {
  return (
    <RequireLogin>
      <TrackNavProvider>
        <TrackScreen />
      </TrackNavProvider>
    </RequireLogin>
  );
};
export default TrackHomePage;
