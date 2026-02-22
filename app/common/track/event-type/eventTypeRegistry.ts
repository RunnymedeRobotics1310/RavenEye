import type { ComponentType } from "react";
import type { EventType } from "~/types/EventType.ts";
import ScoreFuelControl from "./controls/ScoreFuelControl.tsx";

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
};

export default eventTypeRegistry;
