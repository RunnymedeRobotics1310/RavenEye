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

export function useRecentTournamentList() {
  const { list, loading } = useTournamentList();
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const recentList = list
    .filter((t) => new Date(t.endTime) >= twoWeeksAgo)
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  return { list: recentList, loading };
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
        if (isMounted && data) {
          setStatus(data);
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
