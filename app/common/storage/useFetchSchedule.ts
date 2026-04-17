import { useState } from "react";
import {
  fetchTournamentSchedule,
  getScheduleForTournament,
} from "~/common/storage/rb.ts";
import { repository } from "~/common/storage/db.ts";
import { useNetworkHealth } from "~/common/storage/networkHealth.ts";

export function useFetchSchedule(tournamentId: string) {
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { alive } = useNetworkHealth();

  const handleFetchSchedule = async () => {
    setError(null);
    if (alive !== true) {
      setError(
        "No schedule is available. You must be able to connect to RavenBrain to load the schedule.",
      );
      return;
    }
    setFetching(true);
    try {
      await fetchTournamentSchedule(tournamentId);
      const records = await getScheduleForTournament(tournamentId);
      await repository.mergeMatchSchedule(records);
    } catch (e) {
      setError(
        "Failed to fetch schedule: " +
          (e instanceof Error ? e.message : String(e)),
      );
    } finally {
      setFetching(false);
    }
  };

  return { fetching, error, handleFetchSchedule };
}
