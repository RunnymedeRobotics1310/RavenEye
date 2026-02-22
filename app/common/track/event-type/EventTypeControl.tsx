import eventTypeRegistry, {type EventTypeControlProps} from "~/common/track/event-type/eventTypeRegistry.ts";
import GenericEventTypeButton from "~/common/track/event-type/controls/GenericEventTypeButton.tsx";

const EventTypeControl = ({ eventType, sequenceEnd = false }: EventTypeControlProps) => {
  const CustomControl = eventTypeRegistry[eventType.eventtype];
  if (CustomControl) return <CustomControl eventType={eventType} sequenceEnd={sequenceEnd} />;
  return <GenericEventTypeButton eventType={eventType} sequenceEnd={sequenceEnd} />;
};

export default EventTypeControl;
