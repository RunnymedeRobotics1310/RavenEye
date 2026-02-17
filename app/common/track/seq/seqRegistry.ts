import type { ComponentType } from "react";
import type { TrackScreenProps } from "~/routes/track/track-home-page";
import AutoPage from "./AutoPage.tsx";
import DefensePage from "./DefensePage.tsx";
import EndgamePage from "./EndgamePage.tsx";
import PickupPage from "./PickupPage.tsx";
import ScorePage from "./ScorePage.tsx";

/**
 * Maps sequence codes to custom component overrides.
 * When a sequence code is found here, the custom component is rendered
 * instead of the default SequencePage.
 */
const seqRegistry: Record<string, ComponentType<TrackScreenProps>> = {
  "auto-page": AutoPage,
  "defense-page": DefensePage,
  "endgame-page": EndgamePage,
  "pickup-page": PickupPage,
  "score-page": ScorePage,
};

export default seqRegistry;
