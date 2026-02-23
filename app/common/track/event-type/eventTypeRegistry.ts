import type { ComponentType } from "react";
import type { EventType } from "~/types/EventType.ts";
import ScoreFuelControl from "./controls/ScoreFuelControl.tsx";
import PickupFuelControl from "~/common/track/event-type/controls/PickupFuelControl.tsx";
import MissedFuelControl from "~/common/track/event-type/controls/MissedFuelControl.tsx";
import LostFuelControl from "~/common/track/event-type/controls/LostFuelControl.tsx";

export interface EventTypeControlProps {
  eventType: EventType;
  sequenceEnd: boolean;
}

/**
 * Maps event type codes to custom control components.
 * When an event type code is found here, the custom component is rendered
 * instead of the default EventTypeButton.
 */
const eventTypeRegistry: Record<
  string,
  ComponentType<EventTypeControlProps>
> = {
  "score-fuel": ScoreFuelControl,
  "auto-number-shot": ScoreFuelControl,
  "auto-number-missed": MissedFuelControl,
  "pickup-number": PickupFuelControl,
  "scoring-number-success": ScoreFuelControl,
  "scoring-number-miss": MissedFuelControl,
  "pickup-lost-number": LostFuelControl,
};

export default eventTypeRegistry;
