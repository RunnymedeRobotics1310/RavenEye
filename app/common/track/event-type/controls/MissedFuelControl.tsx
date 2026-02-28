import type { EventTypeControlProps } from "~/common/track/event-type/eventTypeRegistry.ts";
import RangeEventTypeButton from "~/common/track/event-type/controls/RangeEventTypeButton.tsx";

const MissedFuelControl = ({ eventType, goBack }: EventTypeControlProps) => {
  return (
    <RangeEventTypeButton
      eventType={eventType}
      sequenceEnd={false}
      sequenceStart={false}
      label="Miss"
      start={0}
      end={50}
      goBack={goBack}
    />
  );
};

export default MissedFuelControl;
