import type { EventType } from "~/types/EventType.ts";
import eventTypeRegistry from "~/common/track/event-type/eventTypeRegistry.ts";
import GenericEventTypeButton from "~/common/track/event-type/controls/GenericEventTypeButton.tsx";

const EventTypeControl = ({ eventType }: { eventType: EventType }) => {
  const CustomControl = eventTypeRegistry[eventType.eventtype];
  if (CustomControl) return <CustomControl eventType={eventType} />;
  return <GenericEventTypeButton eventType={eventType} />;
};

export default EventTypeControl;
