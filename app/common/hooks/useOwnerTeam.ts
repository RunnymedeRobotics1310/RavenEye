import { useEffect, useState } from "react";
import { getOwnerTeam } from "~/common/storage/rb.ts";

const SESSION_KEY = "rbOwnerTeam";

/**
 * Resolves the owner team number from the backend config endpoint, cached in sessionStorage so
 * repeated reads across pages don't re-hit the API during a session.
 */
export function useOwnerTeam(): {
  teamNumber: number | null;
  loading: boolean;
  error: string | null;
} {
  const [teamNumber, setTeamNumber] = useState<number | null>(() => {
    if (typeof sessionStorage === "undefined") return null;
    const cached = sessionStorage.getItem(SESSION_KEY);
    return cached ? Number(cached) : null;
  });
  const [loading, setLoading] = useState(teamNumber === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (teamNumber !== null) return;
    let cancelled = false;
    getOwnerTeam()
      .then((resp) => {
        if (cancelled) return;
        setTeamNumber(resp.teamNumber);
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.setItem(SESSION_KEY, String(resp.teamNumber));
        }
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message || "Failed to load owner team");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamNumber]);

  return { teamNumber, loading, error };
}
