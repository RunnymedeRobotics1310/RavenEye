import type { EventTypeControlProps } from "~/common/track/event-type/eventTypeRegistry.ts";
import RangeEventTypeButton from "~/common/track/event-type/controls/RangeEventTypeButton.tsx";

const ScoreFuelControl = ({ eventType, goBack }: EventTypeControlProps) => {
  return (
    <RangeEventTypeButton
      eventType={eventType}
      sequenceEnd={false}
      sequenceStart={false}
      goBack={goBack}
      label="Score"
      start={0}
      end={50}
    />
  );
};

export default ScoreFuelControl;
