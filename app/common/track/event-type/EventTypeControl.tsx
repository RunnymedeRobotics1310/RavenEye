import eventTypeRegistry, {
  type EventTypeControlProps,
} from "~/common/track/event-type/eventTypeRegistry.ts";
import GenericEventTypeButton from "~/common/track/event-type/controls/GenericEventTypeButton.tsx";

const EventTypeControl = ({
  eventType,
  sequenceEnd = false,
  sequenceStart = true,
}: EventTypeControlProps) => {
  const CustomControl = eventTypeRegistry[eventType.eventtype];
  if (CustomControl)
    return (
      <CustomControl
        eventType={eventType}
        sequenceEnd={sequenceEnd}
        sequenceStart={sequenceStart}
      />
    );
  return (
    <GenericEventTypeButton
      eventType={eventType}
      sequenceEnd={sequenceEnd}
      sequenceStart={sequenceStart}
    />
  );
};

export default EventTypeControl;
