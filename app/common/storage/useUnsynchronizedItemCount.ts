import { useEffect, useState } from "react";
import {
  cleanupEmptyScoutingSessions,
  getScoutedSessions,
  getUnsynchronizedEventsForSession,
  getUnsynchronizedQuickComments,
} from "~/common/storage/local.ts";

export function useUnsynchronizedItemCount() {
  const [count, setCount] = useState(-1);

  useEffect(() => {
    let unsyncSession = 0;
    getScoutedSessions(false).forEach((session) => {
      unsyncSession += getUnsynchronizedEventsForSession(session).length;
    });
    getUnsynchronizedQuickComments().forEach(() => {
      unsyncSession += 1;
    });
    setCount(unsyncSession); // Correct way to update state
    const interval = setInterval(() => {
      unsyncSession = 0;
      getScoutedSessions(false).forEach((session) => {
        unsyncSession += getUnsynchronizedEventsForSession(session).length;
      });
      getUnsynchronizedQuickComments().forEach(() => {
        unsyncSession += 1;
      });
      setCount(unsyncSession); // Correct way to update state
      cleanupEmptyScoutingSessions();
    }, 5 * 1000);

    return () => clearInterval(interval); // Cleanup function
  }, []); // Empty dependency array ensures it runs only once

  return count;
}
