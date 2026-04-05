import { useEffect, useRef, useState } from "react";

type Props = {
  /** How often to fire `onSync`, in milliseconds. */
  intervalMs: number;
  /** The sync callback. Invoked immediately on mount and every `intervalMs`. */
  onSync: () => Promise<void> | void;
  /** Prefix for the countdown display. Defaults to "next sync in". */
  label?: string;
};

/**
 * A small self-contained countdown that owns a refresh interval. Pass it a
 * sync callback and an interval; it fires the callback on mount and then
 * every `intervalMs`, showing "next sync in Ns" so the user can see how
 * fresh the data is.
 *
 * Pattern ported from the pit-kiosk page but generalised — any page that
 * wants a periodic server refresh + a visible countdown can drop this in.
 */
export default function SyncCountdown(props: Props) {
  const { intervalMs, onSync, label = "next sync in" } = props;
  const intervalSec = Math.max(1, Math.floor(intervalMs / 1000));
  const [remaining, setRemaining] = useState(intervalSec);
  // Keep the latest callback in a ref so the effect below doesn't have to
  // re-subscribe every render just because the parent passed a fresh arrow.
  const onSyncRef = useRef(onSync);
  useEffect(() => {
    onSyncRef.current = onSync;
  }, [onSync]);

  useEffect(() => {
    let cancelled = false;
    const runSync = async () => {
      try {
        await onSyncRef.current();
      } catch {
        // swallow — we'll retry next interval
      }
      if (!cancelled) setRemaining(intervalSec);
    };
    // Fire immediately on mount.
    runSync();
    const refreshTimer = setInterval(runSync, intervalMs);
    const countdownTimer = setInterval(() => {
      setRemaining((r) => (r > 1 ? r - 1 : r));
    }, 1000);
    return () => {
      cancelled = true;
      clearInterval(refreshTimer);
      clearInterval(countdownTimer);
    };
  }, [intervalMs, intervalSec]);

  return (
    <span style={{ opacity: 0.7, fontSize: "0.8rem" }}>
      {label ? `${label} ` : ""}
      {remaining}s
    </span>
  );
}
