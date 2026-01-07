import { useEffect, useState } from "react";
import type { GameEvent } from "~/types/GameEvent.ts";
import type { QuickComment } from "~/types/QuickComment.ts";
import type { ScheduleItem } from "~/types/ScheduleItem.ts";
import type { TeamReport } from "~/types/TeamReport.ts";
import type { User } from "~/types/User.ts";
import { rbfetch } from "~/common/storage/auth.ts";
import type { StrategyArea } from "~/types/StrategyArea.ts";
import type { RBTournament } from "~/types/RBTournament.ts";

export function useSchedule(tournamentId: string) {
  const [matches, setSchedule] = useState([]);
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(true);
  const [doRefresh, setDoRefresh] = useState(true);

  function refresh() {
    setDoRefresh(true);
  }

  useEffect(() => {
    rbfetch("/api/schedule/" + tournamentId, {}).then((resp) => {
      if (resp.ok) {
        resp.json().then((data) => {
          setSchedule(data);
          setLoading(false);
          setDoRefresh(false);
        });
      } else {
        setError("Failed to fetch schedule");
        setLoading(false);
        setDoRefresh(false);
      }
    });
  }, [tournamentId, loading, doRefresh]);

  return { matches, error, loading, refresh } as {
    matches: ScheduleItem[];
    error: string | null;
    loading: boolean;
    refresh: () => void;
  };
}

export type RBScheduleItem = {
  tournamentId: string;
  match: number;
  red1: number;
  red2: number;
  red3: number;
  blue1: number;
  blue2: number;
  blue3: number;
};

export async function saveMatch(match: RBScheduleItem) {
  return rbfetch("/api/schedule", {
    method: "POST",
    body: JSON.stringify(match),
  }).then((resp) => {
    return resp.ok;
  });
}

export type RBGameEvent = {
  timestamp: Date;
  scoutName: string;
  tournamentId: string;
  matchId: number;
  alliance: string;
  teamNumber: number;
  eventType: string;
  amount: number;
  note: string;
};
export type RBGameEventResponse = {
  success: boolean;
  reason: string;
  eventLogRecord: RBGameEvent;
};
export async function saveEvents(
  events: GameEvent[],
): Promise<RBGameEventResponse[]> {
  const rbEvents: RBGameEvent[] = [];
  for (const e of events) {
    const rbe: RBGameEvent = {
      timestamp: e.timestamp,
      scoutName: e.scoutName,
      tournamentId: e.tournamentId,
      matchId: e.matchId,
      alliance: e.alliance,
      teamNumber: e.teamNumber,
      eventType: e.eventType,
      amount: e.amount,
      note: e.note ? e.note : "",
    };
    if (
      rbe.scoutName &&
      rbe.scoutName !== "" &&
      rbe.tournamentId &&
      rbe.tournamentId !== "" &&
      rbe.matchId > 0 &&
      (rbe.alliance === "red" || rbe.alliance === "blue") &&
      rbe.teamNumber > 0 &&
      rbe.eventType &&
      rbe.eventType !== "" &&
      rbe.amount > -1
    ) {
      rbEvents.push(rbe);
    }
  }

  return rbfetch("/api/event", {
    method: "POST",
    body: JSON.stringify(rbEvents),
  })
    .then((resp) => {
      return resp.json();
    })
    .catch((error) => {
      console.error("Error saving events", error);
      return false;
    });
}

export type QuickCommentResponse = {
  comment: QuickComment;
  success: boolean;
  reason: string | null;
};
export async function saveQuickComments(
  comments: QuickComment[],
): Promise<QuickCommentResponse[]> {
  return rbfetch("/api/quickcomment", {
    method: "POST",
    body: JSON.stringify(comments),
  }).then((resp) => {
    return resp.json();
  });
}

export function useTeamsForTournament(tournamentId: string) {
  const [data, setData] = useState(null);
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(true);
  const [doRefresh, setDoRefresh] = useState(true);

  function refresh() {
    setDoRefresh(true);
  }

  useEffect(() => {
    rbfetch(`/api/schedule/teams-for-tournament/${tournamentId}`, {}).then(
      (resp) => {
        if (resp.ok) {
          resp.json().then((data) => {
            if (data) {
              console.log("Loaded teams for tournament " + tournamentId, data);
              setData(data);
            } else {
              setError("Failed to fetch teams for tournament " + tournamentId);
            }
            setLoading(false);
            setDoRefresh(false);
          });
        } else {
          setError("Failed to fetch teams for tournament " + tournamentId);
          setLoading(false);
          setDoRefresh(false);
        }
      },
    );
  }, [doRefresh, tournamentId]);

  return { data, error, loading, refresh } as {
    data: number[] | null;
    error: string | null;
    loading: boolean;
    refresh: () => void;
  };
}

export function useTournamentReport(tournamentId: string, teamNumber: number) {
  const [data, setData] = useState(null);
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(true);
  const [doRefresh, setDoRefresh] = useState(true);

  function refresh() {
    setDoRefresh(true);
  }

  useEffect(() => {
    rbfetch(`/api/schedule/tournament/${tournamentId}/${teamNumber}`, {}).then(
      (resp) => {
        if (resp.ok) {
          resp.json().then((data) => {
            if (data.success) {
              setData(data.report);
            } else {
              setError("Failed to fetch tournament report: " + data.reason);
            }
            setLoading(false);
            setDoRefresh(false);
          });
        } else {
          setError("Failed to fetch tournament report: " + resp.status);
          setLoading(false);
          setDoRefresh(false);
        }
      },
    );
  }, [doRefresh, tournamentId, teamNumber]);

  return { data, error, loading, refresh } as {
    data: string | null; // todo: fixme: this is not the right type
    error: string | null;
    loading: boolean;
    refresh: () => void;
  };
}

export function useTeamReport(teamNumber: number) {
  const [data, setData] = useState(null);
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(true);
  const [doRefresh, setDoRefresh] = useState(true);

  function refresh() {
    setDoRefresh(true);
  }

  useEffect(() => {
    rbfetch(`/api/report/team/${teamNumber}`, {}).then((resp) => {
      if (resp.ok) {
        resp.json().then((data) => {
          if (data.success) {
            setData(data.report);
          } else {
            setError("Failed to fetch team report: " + data.reason);
          }
          setLoading(false);
          setDoRefresh(false);
        });
      } else {
        setError("Failed to fetch team report: " + resp.status);
        setLoading(false);
        setDoRefresh(false);
      }
    });
  }, [doRefresh, teamNumber]);

  return { data, error, loading, refresh } as {
    data: TeamReport | null;
    error: string | null;
    loading: boolean;
    refresh: () => void;
  };
}

export function useAllComments() {
  const [data, setData] = useState(null);
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(true);
  const [doRefresh, setDoRefresh] = useState(true);

  function refresh() {
    setDoRefresh(true);
  }

  useEffect(() => {
    rbfetch(`/api/quickcomment`, {}).then((resp) => {
      if (resp.ok) {
        resp.json().then((data) => {
          setData(data);
          setLoading(false);
          setDoRefresh(false);
        });
      } else {
        setError("Failed to fetch all comments: " + resp.status);
        setLoading(false);
        setDoRefresh(false);
      }
    });
  }, [doRefresh]);

  return { data, error, loading, refresh } as {
    data: QuickComment[] | null;
    error: string | null;
    loading: boolean;
    refresh: () => void;
  };
}

export function useUserList() {
  const [data, setData] = useState<User[] | null>(null);
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    rbfetch("/api/users", {}).then((resp) => {
      if (resp.ok) {
        resp.json().then((data) => {
          if (data) {
            setData(data);
          } else {
            setError("Failed to fetch users: " + data.reason);
          }
          setLoading(false);
        });
      } else {
        setError("Failed to fetch users: " + resp.status);
        setLoading(false);
      }
    });
  }, []);

  return { data, error, loading } as {
    data: User[] | null;
    error: string | null;
    loading: boolean;
  };
}

export function useStrategyAreaList() {
  const [data, setData] = useState<StrategyArea[] | null>(null);
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    rbfetch("/api/strategy-areas", {}).then((resp) => {
      if (resp.ok) {
        resp.json().then((data) => {
          if (data) {
            setData(data);
          } else {
            setError("Failed to fetch strategy areas: " + data.reason);
          }
          setLoading(false);
        });
      } else {
        setError("Failed to fetch strategy areas: " + resp.status);
        setLoading(false);
      }
    });
  }, []);

  return { data, error, loading } as {
    data: StrategyArea[] | null;
    error: string | null;
    loading: boolean;
  };
}

export async function createStrategyArea(
  item: StrategyArea,
): Promise<StrategyArea> {
  return rbfetch("/api/strategy-areas", {
    method: "POST",
    body: JSON.stringify(item),
  }).then((resp) => {
    if (!resp.ok) {
      throw new Error("Failed to create strategy area: " + resp.status);
    }
    return resp.json();
  });
}

export function useStrategyArea(id: string | undefined) {
  const [data, setData] = useState<StrategyArea | null>(null);
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    rbfetch(`/api/strategy-areas/${id}`, {}).then((resp) => {
      if (resp.ok) {
        resp.json().then((data) => {
          if (data) {
            setData(data);
          } else {
            setError("Failed to fetch strategy area: " + data.reason);
          }
          setLoading(false);
        });
      } else {
        setError("Failed to fetch strategy area: " + resp.status);
        setLoading(false);
      }
    });
  }, [id]);

  return { data, error, loading } as {
    data: StrategyArea | null;
    error: string | null;
    loading: boolean;
  };
}

export async function updateStrategyArea(
  item: StrategyArea,
): Promise<StrategyArea> {
  return rbfetch("/api/strategy-areas/" + item.id, {
    method: "PUT",
    body: JSON.stringify(item),
  }).then((resp) => {
    if (!resp.ok) {
      throw new Error("Failed to update strategy area: " + resp.status);
    }
    return resp.json();
  });
}
