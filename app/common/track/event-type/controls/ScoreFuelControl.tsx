import { useRef, useState } from "react";
import type { EventTypeControlProps } from "../eventTypeRegistry.ts";
import { recordEvent } from "~/common/storage/track.ts";

const ScoreFuelControl = ({ eventType }: EventTypeControlProps) => {
  const [quantity, setQuantity] = useState(0);
  const [count, setCount] = useState(0);
  const [flashing, setFlashing] = useState(false);
  const [error, setError] = useState<string>();
  const countTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleScore = async () => {
    setCount((c) => c + 1);
    setFlashing(true);
    setError(undefined);
    setTimeout(() => setFlashing(false), 300);
    clearTimeout(countTimer.current);
    countTimer.current = setTimeout(() => setCount(0), 2000);
    try {
      await recordEvent(eventType.eventtype, quantity, "");
      setQuantity(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="event-type-button score-fuel-control">
      <label className="score-fuel-label">
        {eventType.name}: {quantity}
      </label>
      <input
        className="score-fuel-slider"
        type="range"
        min={0}
        max={50}
        value={quantity}
        onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
      />
      <button
        className={flashing ? "event-tracked" : error ? "event-error" : ""}
        disabled={quantity === 0}
        onClick={handleScore}
      >
        {error ?? "Score"}
      </button>
      {count > 1 && !error && <span className="event-count">x{count}</span>}
    </div>
  );
};

export default ScoreFuelControl;
