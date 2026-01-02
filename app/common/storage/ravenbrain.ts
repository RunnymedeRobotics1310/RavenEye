import {
  getJwt,
  saveJwt,
  saveRoles,
  saveScoutName,
} from "~/common/storage/local.ts";
import { useEffect, useState } from "react";
import type { GameEvent } from "~/types/GameEvent.ts";
import type { QuickComment } from "~/types/QuickComment.ts";
import type { ScheduleItem } from "~/types/ScheduleItem.ts";
import type { TeamReport } from "~/types/TeamReport.ts";

const HOST = import.meta.env.VITE_API_HOST;

/**
 * Authenticates a user by sending their credentials to the server.
 *
 * @param {string} username - The username of the user attempting to authenticate.
 * @param {string} password - The password of the user attempting to authenticate.
 * @return {Promise<void>} A promise that resolves when the authentication process is complete.
 *                         Throws an error if authentication fails or there is a server error.
 */
export async function authenticate(
  username: string,
  password: string,
): Promise<void> {
  if (username === null) {
    throw new Error("User name not set. Can't authenticate to Raven Brain.");
  }
  const options: Record<string, unknown> = {
    headers: {
      "Content-Type": "application/json",
    },
    mode: "cors",
    method: "POST",
    body: JSON.stringify({
      username: username,
      password: password,
    }),
  };
  return fetch(HOST + `/login`, options)
    .then((response) => {
      if (response.ok) {
        return response.json();
      } else if (response.status === 401) {
        throw new Error("Not authorized (401)");
      } else {
        throw new Error("Unhandled server error (" + response.status + ")");
      }
    })
    .then((json) => {
      saveJwt(json.access_token);
      const payload = parseJwt(json.access_token);
      saveScoutName(payload.sub);
      saveRoles(payload.roles);
      return;
    });
}
function parseJwt(token: string) {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    window
      .atob(base64)
      .split("")
      .map(function (c) {
        return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join(""),
  );
  return JSON.parse(jsonPayload);
}
export async function ping(): Promise<boolean> {
  return fetch(HOST + "/api/ping", {}).then((resp) => {
    return resp.ok;
  });
}

/**
 * Fetch with Raven Brain authentication
 * @param urlpath
 * @param options
 */
async function rbfetch(
  urlpath: string,
  options: RequestInit,
): Promise<Response> {
  const o2: Record<string, unknown> = {
    ...options,
    headers: {
      ...options.headers,
      "Content-Type": "application/json",
      Authorization: `Bearer ${getJwt()}`,
    },
  };
  o2.mode = "cors";

  return fetch(HOST + urlpath, o2);
}

export async function validate(): Promise<string> {
  return rbfetch("/api/validate", {})
    .then((resp) => {
      if (resp.ok) {
        return resp.json();
      } else if (resp.status === 401) {
        throw Error("Not authorized (401)");
      } else {
        throw Error("Unhandled server error (" + resp.status + ")");
      }
    })
    .then((json) => {
      return json.role;
    });
}

export function useTournamentList() {
  const [list, setList] = useState([]);
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(true);
  const [doRefresh, setDoRefresh] = useState(true);

  function refresh() {
    setDoRefresh(true);
  }

  useEffect(() => {
    rbfetch("/api/tournament", {}).then((resp) => {
      if (resp.ok) {
        resp.json().then((data) => {
          setList(data);
          setLoading(false);
          setDoRefresh(false);
        });
      } else {
        setError("Failed to fetch tournaments");
        setLoading(false);
        setDoRefresh(false);
      }
    });
  }, [doRefresh]);

  return { list, error, loading, refresh } as {
    list: RBTournament[];
    error: string | null;
    loading: boolean;
    refresh: () => void;
  };
}

export type RBTournament = {
  id: string;
  name: string;
  startTime: Date;
  endTime: Date;
};

export async function saveTournament(tournament: RBTournament) {
  return rbfetch("/api/tournament", {
    method: "POST",
    body: JSON.stringify(tournament),
  }).then((resp) => {
    return resp.ok;
  });
}
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
