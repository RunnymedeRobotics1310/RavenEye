import { useRef, useState } from "react";
import type { EventType } from "~/types/EventType.ts";
import { recordEvent } from "~/common/storage/track.ts";

const EventTypeButton = ({ eventType }: { eventType: EventType }) => {
  const [count, setCount] = useState(0);
  const [flashing, setFlashing] = useState(false);
  const [error, setError] = useState<string>();
  const countTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleClick = async () => {
    setCount((c) => c + 1);
    setFlashing(true);
    setError(undefined);
    setTimeout(() => setFlashing(false), 300);
    clearTimeout(countTimer.current);
    countTimer.current = setTimeout(() => setCount(0), 2000);
    try {
      await recordEvent(eventType.eventtype);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="event-type-button">
      <button
        className={flashing ? "event-tracked" : error ? "event-error" : ""}
        onClick={handleClick}
      >
        {error ?? eventType.name}
      </button>
      {count > 1 && !error && <span className="event-count">x{count}</span>}
    </div>
  );
};

export default EventTypeButton;
