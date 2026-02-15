import type { ComponentType } from "react";
import type { TrackScreenProps } from "~/routes/track/track-home-page";

/**
 * Maps strategy area codes to custom component overrides.
 * When an area code is found here, the custom component is rendered
 * instead of the default AreaPage.
 */
const areaRegistry: Record<string, ComponentType<TrackScreenProps>> = {};

export default areaRegistry;
