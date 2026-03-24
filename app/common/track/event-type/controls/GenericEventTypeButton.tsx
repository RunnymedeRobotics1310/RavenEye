import { useRef, useState } from "react";
import { recordEvent } from "~/common/storage/track.ts";
import type { EventTypeControlProps } from "~/common/track/event-type/eventTypeRegistry.ts";
import {useTrackNav} from "~/common/track/TrackNavContext.tsx";

const GenericEventTypeButton = ({
  eventType,
  sequenceEnd,
  sequenceStart,
}: EventTypeControlProps) => {
  const {goBack} = useTrackNav()
  const [count, setCount] = useState(0);
  const [flashing, setFlashing] = useState(false);
  const [error, setError] = useState<string>();
  const [quantity, setQuantity] = useState(0);
  const [note, setNote] = useState("");
  const countTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleClick = async () => {
    setCount((c) => c + 1);
    setFlashing(true);
    setTimeout(() => setFlashing(false), 300);
    clearTimeout(countTimer.current);
    countTimer.current = setTimeout(() => setCount(0), 2000);


    setError(undefined);
    try {
      await recordEvent(eventType.eventtype, quantity, note);
      setNote("");
      if (sequenceEnd) {
        goBack();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div>
      <div className="event-button-row">
        <button
          type="button"
          className={`${flashing ? "event-tracked" : error ? "event-error" : ""}${sequenceEnd ? " btn-sequence-end" : ""}`}
          onClick={() => {
            handleClick();
          }}
          disabled={sequenceStart}
        >
          {error ?? eventType.name}
        </button>
        {count > 1 && !error && <span className="event-count">x{count}</span>}
      </div>
      {eventType.showQuantity && (
        <input
          className="event-type-quantity"
          type="number"
          min={0}
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
        />
      )}
      {eventType.showNote && (
        <input
          className="event-type-note"
          type="text"
          placeholder="Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      )}
    </div>
  );
};

export default GenericEventTypeButton;
