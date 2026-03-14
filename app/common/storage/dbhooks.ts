import { useEffect, useState } from "react";
import type { EventType } from "~/types/EventType.ts";
import type { StrategyArea } from "~/types/StrategyArea.ts";
import type { RBScheduleRecord } from "~/types/RBScheduleRecord.ts";
import type { SequenceType } from "~/types/SequenceType.ts";
import type { RBTournament } from "~/types/RBTournament.ts";
import type { SyncStatus } from "~/types/SyncStatus.ts";
import { repository } from "~/common/storage/db.ts";

export function useTournamentList() {
  const [list, setList] = useState<RBTournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const data = await repository.getTournamentList();
        if (isMounted) {
          setList(data);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load tournament list", err);
      }
    };

    load();
    const interval = setInterval(load, 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { list, loading };
}

const UPCOMING_TOURNAMENT_LOOKAHEAD = 24 * 60 * 60 * 1000; // 24 hours
const ACTIVE_TOURNAMENT_CUTOFF = 36 * 60 * 60 * 1000; // 36 hours

export function useActiveTeamTournaments() {
  const [list, setList] = useState<RBTournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const [teamIds, tournaments] = await Promise.all([
          repository.getTeamTournamentIds(),
          repository.getTournamentList(),
        ]);
        if (isMounted) {
          const teamIdSet = new Set(teamIds);
          const now = Date.now();
          const startCutoff = now + UPCOMING_TOURNAMENT_LOOKAHEAD;
          const endCutoff = now - ACTIVE_TOURNAMENT_CUTOFF;
          setList(
            tournaments.filter(
              (t) =>
                teamIdSet.has(t.id) &&
                new Date(t.startTime).getTime() < startCutoff &&
                new Date(t.endTime).getTime() > endCutoff,
            ),
          );
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load active team tournaments", err);
      }
    };

    load();
    const interval = setInterval(load, 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { list, loading };
}

export function useStrategyAreaList() {
  const [list, setList] = useState<StrategyArea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const data = await repository.getStrategyAreaList();
        if (isMounted) {
          setList(data);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load strategy area list", err);
      }
    };

    load();
    const interval = setInterval(load, 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { list, loading };
}

export function useEventTypeList() {
  const [list, setList] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const data = await repository.getEventTypeList();
        if (isMounted) {
          setList(data);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load event type list", err);
      }
    };

    load();
    const interval = setInterval(load, 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { list, loading };
}

export function useSequenceTypeList() {
  const [list, setList] = useState<SequenceType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const data = await repository.getSequenceTypeList();
        if (isMounted) {
          setList(data);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load sequence type list", err);
      }
    };

    load();
    const interval = setInterval(load, 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { list, loading };
}

export function useMatchSchedule() {
  const [list, setList] = useState<RBScheduleRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const data = await repository.getMatchSchedule();
        if (isMounted) {
          setList(data);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load match schedule", err);
      }
    };

    load();
    const interval = setInterval(load, 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { list, loading };
}

export function useSyncStatus(component: string): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>({
    loading: true,
    component,
    lastSync: new Date(0),
    inProgress: false,
    isComplete: false,
    remaining: 0,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const data = await repository.getSyncStatus(component);
        if (isMounted) {
          if (data) {
            setStatus(data);
          } else {
            setStatus((prev) => (prev.loading ? { ...prev, loading: false } : prev));
          }
        }
      } catch (err) {
        console.error(`Failed to load sync status for ${component}`, err);
      }
    };

    load();

    const interval = setInterval(load, 1000); // Poll for changes

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [component]);

  return status;
}
