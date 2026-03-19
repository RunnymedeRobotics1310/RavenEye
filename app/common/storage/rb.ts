import { useEffect, useState } from "react";
import type { User } from "~/types/User.ts";
import {
  rbfetch,
  SESSION_KEY_RAVENBRAIN_VERSION,
} from "~/common/storage/rbauth.ts";
import type { StrategyArea } from "~/types/StrategyArea.ts";
import type { RBTournament } from "~/types/RBTournament.ts";
import type { EventType } from "~/types/EventType.ts";
import type { RBScheduleRecord } from "~/types/RBScheduleRecord.ts";
import type { SequenceType } from "~/types/SequenceType.ts";
import type { RBEventLogRecord } from "~/types/RBEventLogRecord.ts";
import type { RBEventLogPostResult } from "~/types/RBEventLogPostResult.ts";
import type { RBQuickCommentPostResult } from "~/types/RBQuickCommentPostResult.ts";
import type { RBQuickComment } from "~/types/RBQuickComment.ts";
import type { RBRobotAlert } from "~/types/RBRobotAlert.ts";
import type { RBRobotAlertPostResult } from "~/types/RBRobotAlertPostResult.ts";
import type {
  DrillReportResponse,
  TournamentSequenceReportResponse,
} from "~/types/SequenceReport.ts";
import type { ChronoReportResponse } from "~/types/ChronoReport.ts";
import type { MegaReportResponse } from "~/types/MegaReport.ts";
import type {
  TeamSummaryReportResponse,
  CustomTournamentStatsResponse,
} from "~/types/TeamSummaryReport.ts";
import type { TeamScheduleResponse } from "~/types/TeamSchedule.ts";
import type { NexusQueueStatus } from "~/types/NexusQueueStatus.ts";
import type { PmvaReportResponse } from "~/types/PmvaReport.ts";

/**
 * Sends a ping request to the API to check if the server is reachable.
 *
 * @return {Promise<boolean>} A promise that resolves to true if the server responds with a status indicating success, otherwise false.
 */
export async function ping(): Promise<boolean> {
  return fetch(import.meta.env.VITE_API_HOST + "/api/ping", {})
    .then((resp) => {
      const ver = resp.headers.get("X-RavenBrain-Version");
      if (ver && typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(SESSION_KEY_RAVENBRAIN_VERSION, ver);
      }
      return resp.ok;
    })
    .catch(() => {
      return false;
    });
}

/**
 * Fetches the entire list of tournaments from the server.
 *
 * @return {Promise<RBTournament[]>} A promise that resolves to an array of tournament objects.
 * @throws {Error} If the request fails or the server responds with an error status.
 */
export async function getTournamentList() {
  const resp = await rbfetch("/api/tournament", {});
  if (resp.ok) {
    return resp.json() as unknown as RBTournament[];
  } else {
    throw new Error("Failure fetching tournament list");
  }
}

/**
 * Fetches the list of tournament IDs where the team is registered.
 *
 * @return {Promise<string[]>} A promise that resolves to an array of tournament ID strings.
 * @throws {Error} If the request fails or the server responds with an error status.
 */
export async function getTeamTournamentIds() {
  const resp = await rbfetch("/api/tournament/team-ids", {});
  if (resp.ok) {
    return resp.json() as unknown as string[];
  } else {
    throw new Error("Failure fetching team tournament IDs");
  }
}

/**
 * Triggers RavenBrain to fetch schedule data for a tournament from the FRC API.
 *
 * @param {string} tournamentId - The tournament ID to fetch schedule data for.
 * @throws {Error} If the request fails.
 */
export async function fetchTournamentSchedule(
  tournamentId: string,
): Promise<void> {
  const resp = await rbfetch("/api/frc-sync/schedule/" + tournamentId, {
    method: "POST",
  });
  if (!resp.ok && resp.status !== 404) {
    throw new Error("Failed to fetch tournament schedule: " + resp.status);
  }
}

/**
 * Fetches the entire list of strategy areas from the server.
 *
 * @return {Promise<StrategyArea[]>} A promise that resolves to an array of strategy area objects.
 * @throws {Error} If the request fails or the server responds with an error status.
 */
export async function getStrategyAreaList() {
  const resp = await rbfetch("/api/strategy-areas", {});
  if (resp.ok) {
    return resp.json() as unknown as StrategyArea[];
  } else {
    throw new Error("Failure fetching strategy area list");
  }
}

/**
 * Fetches the entire list of event types from the server.
 *
 * @return {Promise<EventType[]>} A promise that resolves to an array of event type objects.
 * @throws {Error} If the request fails or the server responds with an error status.
 */
export async function getEventTypeList() {
  const resp = await rbfetch("/api/event-types", {});
  if (resp.ok) {
    return resp.json() as unknown as EventType[];
  } else {
    throw new Error("Failure fetching event type list");
  }
}

/**
 * A custom hook for retrieving and managing the state of an event type by its key.
 *
 * @param {string | undefined} eventtype - The event type key to fetch. If undefined, no fetch request is performed.
 * @return {{ data: EventType | null, error: string | null, loading: boolean }}
 */
export function useEventType(eventtype: string | undefined) {
  const [data, setData] = useState<EventType | null>(null);
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventtype) {
      setLoading(false);
      return;
    }
    rbfetch(`/api/event-types/${eventtype}`, {}).then((resp) => {
      if (resp.ok) {
        resp.json().then((data) => {
          if (data) {
            setData(data);
          } else {
            setError("Failed to fetch event type: " + data.reason);
          }
          setLoading(false);
        });
      } else {
        setError("Failed to fetch event type: " + resp.status);
        setLoading(false);
      }
    });
  }, [eventtype]);

  return { data, error, loading } as {
    data: EventType | null;
    error: string | null;
    loading: boolean;
  };
}

/**
 * Creates a new event type on RavenBrain.
 *
 * @param {EventType} item - The event type object to be created.
 * @return {Promise<EventType>} A promise that resolves to the created event type object.
 */
export async function createEventType(item: EventType): Promise<EventType> {
  return rbfetch("/api/event-types", {
    method: "POST",
    body: JSON.stringify(item),
  }).then((resp) => {
    if (!resp.ok) {
      throw new Error("Failed to create event type: " + resp.status);
    }
    return resp.json();
  });
}

/**
 * Updates an existing event type on RavenBrain.
 *
 * @param {EventType} item - The event type object containing updated data.
 * @return {Promise<EventType>} A promise that resolves to the updated event type object.
 */
export async function updateEventType(item: EventType): Promise<EventType> {
  return rbfetch("/api/event-types/" + item.eventtype, {
    method: "PUT",
    body: JSON.stringify(item),
  }).then((resp) => {
    if (!resp.ok) {
      throw new Error("Failed to update event type: " + resp.status);
    }
    return resp.json();
  });
}

/**
 * Deletes an event type on RavenBrain.
 *
 * @param {string} eventtype - The event type key to delete.
 */
export async function deleteEventType(eventtype: string): Promise<void> {
  const resp = await rbfetch("/api/event-types/" + eventtype, {
    method: "DELETE",
  });
  if (!resp.ok) {
    let detail = "Status: " + resp.status;
    try {
      const body = await resp.json();
      if (body?.message) detail = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
}

/**
 * Fetches the entire list of sequence types from the server.
 *
 * @return {Promise<SequenceType[]>} A promise that resolves to an array of sequence type objects.
 * @throws {Error} If the request fails or the server responds with an error status.
 */
export async function getSequenceTypeList() {
  const resp = await rbfetch("/api/sequence-types", {});
  if (resp.ok) {
    return resp.json() as unknown as SequenceType[];
  } else {
    throw new Error("Failure fetching sequence type list");
  }
}

/**
 * Saves a sequence type on RavenBrain.
 *
 * @param {SequenceType} item - The sequence type object to be created.
 * @return {Promise<SequenceType>} A promise that resolves to the created sequence type object.
 */
export async function createSequenceType(
  item: SequenceType,
): Promise<SequenceType> {
  return rbfetch("/api/sequence-types", {
    method: "POST",
    body: JSON.stringify(item),
  }).then((resp) => {
    if (!resp.ok) {
      throw new Error("Failed to create sequence type: " + resp.status);
    }
    return resp.json();
  });
}

/**
 * Updates an existing sequence type on RavenBrain.
 *
 * @param {SequenceType} item - The sequence type object to be updated.
 * @return {Promise<SequenceType>} A promise that resolves to the updated sequence type object.
 */
export async function updateSequenceType(
  item: SequenceType,
): Promise<SequenceType> {
  return rbfetch("/api/sequence-types/" + item.id, {
    method: "PUT",
    body: JSON.stringify(item),
  }).then((resp) => {
    if (!resp.ok) {
      throw new Error("Failed to update sequence types: " + resp.status);
    }
    return resp.json();
  });
}

/**
 * Fetches the schedule for a specified tournament.
 *
 * @param {string} tournamentId - The unique identifier of the tournament whose schedule needs to be fetched.
 * @return {Promise<RBScheduleRecord[]>} A promise that resolves to an array of schedule records for the tournament.
 * @throws {Error} If the schedule cannot be fetched successfully.
 */
export async function getScheduleForTournament(tournamentId: string) {
  const resp = await rbfetch("/api/schedule/" + tournamentId, {});
  if (resp.ok) {
    return resp.json() as unknown as RBScheduleRecord[];
  } else {
    throw new Error("Failure fetching schedule for tournament " + tournamentId);
  }
}

/**
 * Fetches schedules for multiple tournaments in a single request.
 *
 * @param {string[]} tournamentIds - The tournament IDs to fetch schedules for.
 * @return {Promise<RBScheduleRecord[]>} A promise that resolves to an array of schedule records.
 * @throws {Error} If the request fails.
 */
export async function getSchedulesForTournaments(tournamentIds: string[]) {
  if (tournamentIds.length === 0) return [];
  const resp = await rbfetch("/api/schedule/bulk", {
    method: "POST",
    body: JSON.stringify(tournamentIds),
  });
  if (resp.ok) {
    return resp.json() as unknown as RBScheduleRecord[];
  } else {
    throw new Error("Failure fetching bulk schedules");
  }
}

/**
 * A custom hook that fetches and provides a list of users from RavenBrain.
 *
 * This hook manages the state for data, loading, and error, allowing components to easily make use
 * of the information without handling the fetch logic manually.
 *
 * @return {Object} An object containing the following properties:
 *  - `data` (User[] | null): The list of users fetched from the API, or null if not yet fetched or on error.
 *  - `error` (string | null): The error message if the fetch operation fails, or null if there's no error.
 *  - `loading` (boolean): A boolean indicating whether the fetch operation is in progress.
 */
export function useUserList() {
  const [data, setData] = useState<User[] | null>(null);
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    rbfetch("/api/users", {}).then((resp) => {
      if (resp.ok) {
        resp.json().then((data) => {
          if (data) {
            setData(
              (data as User[])
                // sort by enabled first (1) and disabled second (0)
                .slice()
                .sort((a, b) => Number(b.enabled) - Number(a.enabled)),
            );
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

/**
 * A custom hook for retrieving and managing the state of a user by their ID.
 *
 * @param {string | undefined} id - The ID of the user to fetch. If undefined, no fetch request is performed.
 * @return {{ data: User | null, error: string | null, loading: boolean }} An object containing the fetched user data, any errors that occurred, and the loading state.
 */
export function useUser(id: string | undefined) {
  const [data, setData] = useState<User | null>(null);
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    rbfetch(`/api/users/${id}`, {}).then((resp) => {
      if (resp.ok) {
        resp.json().then((data) => {
          if (data) {
            setData(data);
          } else {
            setError("Failed to fetch user: " + data.reason);
          }
          setLoading(false);
        });
      } else {
        setError("Failed to fetch user: " + resp.status);
        setLoading(false);
      }
    });
  }, [id]);

  return { data, error, loading } as {
    data: User | null;
    error: string | null;
    loading: boolean;
  };
}

/**
 * Form data type for creating/updating users (password instead of passwordHash)
 */
export interface UserFormData {
  id: number;
  login: string;
  displayName: string;
  passwordHash: string;
  enabled: boolean;
  forgotPassword: boolean;
  roles: string[];
}

/**
 * Creates a new user by sending the provided data to RavenBrain.
 *
 * @param {UserFormData} item - The user object to be created, containing required properties.
 * @return {Promise<User>} A promise that resolves to the created user object.
 * @throws {Error} If the server response indicates a failure.
 */
export async function createUser(item: UserFormData): Promise<User> {
  return rbfetch("/api/users", {
    method: "POST",
    body: JSON.stringify(item),
  }).then((resp) => {
    if (!resp.ok) {
      throw new Error("Failed to create user: " + resp.status);
    }
    return resp.json();
  });
}

/**
 * Updates an existing user on RavenBrain.
 *
 * @param {UserFormData} item - The user object containing updated data. Must include an `id` property.
 * @return {Promise<User>} A promise that resolves to the updated user object retrieved from the server.
 * @throws {Error} If the server response is not okay (e.g., non-2xx status code).
 */
export async function updateUser(item: UserFormData): Promise<User> {
  return rbfetch("/api/users/" + item.id, {
    method: "PUT",
    body: JSON.stringify(item),
  }).then((resp) => {
    if (!resp.ok) {
      throw new Error("Failed to update user: " + resp.status);
    }
    return resp.json();
  });
}

/**
 * Creates a new strategy area by sending the provided data to RavenBrain.
 *
 * @param {StrategyArea} item - The strategy area object to be created, containing required properties.
 * @return {Promise<StrategyArea>} A promise that resolves to the created strategy area object.
 * @throws {Error} If the server response indicates a failure.
 */
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

/**
 * A custom hook for retrieving and managing the state of a strategy area by its ID.
 *
 * @param {string | undefined} id - The ID of the strategy area to fetch. If undefined, no fetch request is performed.
 * @return {{ data: StrategyArea | null, error: string | null, loading: boolean }} An object containing the fetched strategy area data, any errors that occurred, and the loading state.
 */
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

/**
 * Updates an existing strategy area on RavenBrain.
 *
 * @param {StrategyArea} item - The strategy area object containing updated data. Must include an `id` property.
 * @return {Promise<StrategyArea>} A promise that resolves to the updated strategy area object retrieved from the server.
 * @throws {Error} If the server response is not okay (e.g., non-2xx status code).
 */
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

export async function deleteStrategyArea(id: number): Promise<void> {
  const resp = await rbfetch("/api/strategy-areas/" + id, {
    method: "DELETE",
  });
  if (!resp.ok) {
    let detail = "Status: " + resp.status;
    try {
      const body = await resp.json();
      if (body?.message) detail = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
}

export async function deleteSequenceType(id: number): Promise<void> {
  const resp = await rbfetch("/api/sequence-types/" + id, {
    method: "DELETE",
  });
  if (!resp.ok) {
    let detail = "Status: " + resp.status;
    try {
      const body = await resp.json();
      if (body?.message) detail = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
}

export async function deleteUser(id: number): Promise<void> {
  const resp = await rbfetch("/api/users/" + id, {
    method: "DELETE",
  });
  if (!resp.ok) {
    let detail = "Status: " + resp.status;
    try {
      const body = await resp.json();
      if (body?.message) detail = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
}

export interface ConfigSyncRequest {
  sourceUrl: string;
  sourceUser: string;
  sourcePassword: string;
  clearTournaments: boolean;
  syncScoutingData: boolean;
  clearExistingScoutingData: boolean;
}

export interface ConfigSyncResult {
  strategyAreas: number;
  eventTypes: number;
  sequenceTypes: number;
  sequenceEvents: number;
  events: number;
  comments: number;
  alerts: number;
  tournamentsCleared: boolean;
  message: string;
}

export async function configSync(
  request: ConfigSyncRequest,
): Promise<ConfigSyncResult> {
  const resp = await rbfetch("/api/config-sync", {
    method: "POST",
    body: JSON.stringify(request),
  });
  if (resp.ok) {
    return resp.json() as unknown as ConfigSyncResult;
  } else if (resp.status === 401) {
    throw new Error("Authentication failed");
  } else if (resp.status === 403) {
    throw new Error(
      "Access denied — insufficient privileges to perform this operation",
    );
  } else {
    let detail = "Server error: " + resp.status;
    try {
      const body = await resp.text();
      if (body) {
        try {
          const json = JSON.parse(body);
          const embedded = json?._embedded?.errors;
          if (embedded?.length > 0) {
            const msg = embedded[0].message ?? "";
            // Strip "Internal Server Error: " prefix from Micronaut wrapper
            detail = msg.replace(/^Internal Server Error:\s*/, "");
          } else if (json?.message) {
            detail = json.message;
          }
        } catch {
          detail = body;
        }
      }
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
}

export async function clearReportCache(): Promise<void> {
  const resp = await rbfetch("/api/report/cache/clear", {});
  if (!resp.ok) {
    throw new Error("Failed to clear report cache: " + resp.status);
  }
}

/**
 * Fetches a sequence type based on a given identifier.
 *
 * @param {string | undefined} id - The unique identifier of the sequence type to fetch.
 * @return {{ data: SequenceType | null, error: string | null, loading: boolean }}
 *         An object containing the fetched sequence type data, any error message, and the loading state.
 */
export function useSequenceType(id: string | undefined) {
  const [data, setData] = useState<SequenceType | null>(null);
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    rbfetch(`/api/sequence-types/${id}`, {}).then((resp) => {
      if (resp.ok) {
        resp.json().then((data) => {
          if (data) {
            setData(data);
          } else {
            setError("Failed to fetch sequence type: " + data.reason);
          }
          setLoading(false);
        });
      } else {
        setError("Failed to fetch sequence type: " + resp.status);
        setLoading(false);
      }
    });
  }, [id]);

  return { data, error, loading } as {
    data: SequenceType | null;
    error: string | null;
    loading: boolean;
  };
}

/**
 * Saves an array of event log records to RavenBrain.
 *
 * @param {RBEventLogRecord[]} records - An array of event log records to be saved.
 * @return {Promise<RBEventLogPostResult[]>} A promise that resolves to an array of results
 * returned from the server after saving the event log records.
 */
export async function saveEventLogRecords(
  records: RBEventLogRecord[],
): Promise<RBEventLogPostResult[]> {
  return rbfetch("/api/event", {
    method: "POST",
    body: JSON.stringify(records),
  }).then((resp) => {
    if (!resp.ok) {
      throw new Error("Failed to save event log records: " + resp.status);
    }
    return resp.json();
  });
}

/**
 * Persists an array of quick comment records to the server.
 *
 * @param {RBQuickComment[]} records - An array of quick comment record objects to be saved.
 * @return {Promise<RBQuickCommentPostResult>} A promise that resolves with the result of the save operation.
 */
export async function saveQuickCommentRecords(
  records: RBQuickComment[],
): Promise<RBQuickCommentPostResult[]> {
  return rbfetch("/api/quickcomment", {
    method: "POST",
    body: JSON.stringify(records),
  }).then((resp) => {
    if (!resp.ok) {
      throw new Error("Failed to save quickcomment records: " + resp.status);
    }
    return resp.json();
  });
}

export async function saveRobotAlertRecords(
  records: RBRobotAlert[],
): Promise<RBRobotAlertPostResult[]> {
  return rbfetch("/api/robot-alert", {
    method: "POST",
    body: JSON.stringify(records),
  }).then((resp) => {
    if (!resp.ok) {
      throw new Error("Failed to save robot alert records: " + resp.status);
    }
    return resp.json();
  });
}

export async function getRobotAlertList(
  tournamentId: string,
): Promise<RBRobotAlert[]> {
  const resp = await rbfetch("/api/robot-alert/" + tournamentId, {});
  if (resp.ok) {
    return resp.json() as unknown as RBRobotAlert[];
  } else {
    throw new Error(
      "Failure fetching robot alerts for tournament " + tournamentId,
    );
  }
}

export async function getRobotAlertListBulk(
  tournamentIds: string[],
): Promise<RBRobotAlert[]> {
  if (tournamentIds.length === 0) return [];
  const resp = await rbfetch("/api/robot-alert/bulk", {
    method: "POST",
    body: JSON.stringify(tournamentIds),
  });
  if (resp.ok) {
    return resp.json() as unknown as RBRobotAlert[];
  } else {
    throw new Error("Failure fetching bulk robot alerts");
  }
}

/**
 * A custom hook that fetches users who have requested a password reset.
 * Only returns users with forgotPassword=true. Requires ADMIN/SUPERUSER role.
 *
 * @return {{ data: User[] | null, error: string | null, loading: boolean }}
 */
export function useForgotPasswordUsers() {
  const [data, setData] = useState<User[] | null>(null);
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    rbfetch("/api/users/forgot-password", {}).then((resp) => {
      if (resp.ok) {
        resp.json().then((data) => {
          if (data) {
            setData(data as User[]);
          } else {
            setError("Failed to fetch forgot-password users");
          }
          setLoading(false);
        });
      } else {
        setError("Failed to fetch forgot-password users: " + resp.status);
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

/**
 * Flags a user's password as forgotten. This is an unauthenticated request
 * that marks the account so an administrator can reset the password.
 *
 * @param {string} login - The login/username of the user who forgot their password.
 * @throws {Error} If the server responds with a non-OK status.
 */
export async function getDrillSessions(
  teamId?: number,
  year?: number,
  sequenceTypeId?: number,
): Promise<string[]> {
  const params = new URLSearchParams();
  if (teamId) params.set("team", String(teamId));
  if (year) params.set("year", String(year));
  if (sequenceTypeId) params.set("sequenceTypeId", String(sequenceTypeId));
  const query = params.toString();
  const url = `/api/report/drill-sessions${query ? `?${query}` : ""}`;
  const resp = await rbfetch(url, {});
  if (resp.ok) {
    return resp.json() as unknown as string[];
  } else {
    throw new Error("Failure fetching drill sessions");
  }
}

export async function getDrillReport(
  teamId: number,
  tournamentId: string,
  frcYear: number,
  sequenceTypeId?: number,
): Promise<DrillReportResponse> {
  let url = `/api/report/drill/${tournamentId}?team=${teamId}&year=${frcYear}`;
  if (sequenceTypeId) {
    url += `&sequenceTypeId=${sequenceTypeId}`;
  }
  const resp = await rbfetch(url, {});
  if (resp.ok) {
    return resp.json() as unknown as DrillReportResponse;
  } else {
    throw new Error("Failure fetching drill report");
  }
}

export async function getSequenceTeams(): Promise<number[]> {
  const resp = await rbfetch("/api/report/sequence/teams", {});
  if (resp.ok) {
    return resp.json() as unknown as number[];
  } else {
    throw new Error("Failure fetching sequence teams");
  }
}

export async function getSequenceTournaments(
  teamId: number,
): Promise<string[]> {
  const resp = await rbfetch(
    `/api/report/sequence/tournaments?team=${teamId}`,
    {},
  );
  if (resp.ok) {
    return resp.json() as unknown as string[];
  } else {
    throw new Error("Failure fetching sequence tournaments");
  }
}

export async function getTournamentSequenceReport(
  teamId: number,
  tournamentId: string,
  frcYear: number,
  sequenceTypeId: number,
): Promise<TournamentSequenceReportResponse> {
  const resp = await rbfetch(
    `/api/report/sequence/tournament/${tournamentId}?team=${teamId}&year=${frcYear}&sequenceTypeId=${sequenceTypeId}`,
    {},
  );
  if (resp.ok) {
    return resp.json() as unknown as TournamentSequenceReportResponse;
  } else {
    throw new Error("Failure fetching tournament sequence report");
  }
}

export async function getMegaReportTournaments(): Promise<string[]> {
  const resp = await rbfetch("/api/report/mega/tournaments", {});
  if (resp.ok) {
    return resp.json() as unknown as string[];
  } else {
    throw new Error("Failure fetching mega report tournaments");
  }
}

export async function getMegaReportTeams(
  tournamentId: string,
): Promise<number[]> {
  const resp = await rbfetch(`/api/report/mega/teams/${tournamentId}`, {});
  if (resp.ok) {
    return resp.json() as unknown as number[];
  } else {
    throw new Error("Failure fetching mega report teams");
  }
}

export async function getMegaReport(
  tournamentId: string,
  teamId: number,
  frcYear: number,
  sequenceTypeId?: number,
): Promise<MegaReportResponse> {
  let url = `/api/report/mega/${tournamentId}?team=${teamId}&year=${frcYear}`;
  if (sequenceTypeId) url += `&sequenceTypeId=${sequenceTypeId}`;
  const resp = await rbfetch(url, {});
  if (resp.ok) {
    return resp.json() as unknown as MegaReportResponse;
  } else {
    throw new Error("Failure fetching mega report");
  }
}

export async function getTeamSummaryTeams(): Promise<number[]> {
  const resp = await rbfetch("/api/report/team/teams", {});
  if (resp.ok) {
    return resp.json() as unknown as number[];
  } else {
    throw new Error("Failure fetching team summary teams");
  }
}

export async function getTeamSummaryReport(
  teamId: number,
): Promise<TeamSummaryReportResponse> {
  const resp = await rbfetch(`/api/report/team/${teamId}`, {});
  if (resp.ok) {
    return resp.json() as unknown as TeamSummaryReportResponse;
  } else {
    throw new Error("Failure fetching team summary report");
  }
}

export async function getCustomTournamentStats(
  teamId: number,
): Promise<CustomTournamentStatsResponse> {
  const resp = await rbfetch(`/api/report/custom-stats?team=${teamId}`, {});
  if (resp.ok) {
    return resp.json() as unknown as CustomTournamentStatsResponse;
  } else {
    throw new Error("Failure fetching custom tournament stats");
  }
}

export async function getChronoReport(
  tournamentId: string,
  teamId: number,
  frcYear: number,
  sequenceTypeId?: number,
): Promise<ChronoReportResponse> {
  let url = `/api/report/chrono/${tournamentId}?team=${teamId}&year=${frcYear}`;
  if (sequenceTypeId) url += `&sequenceTypeId=${sequenceTypeId}`;
  const resp = await rbfetch(url, {});
  if (resp.ok) {
    return resp.json() as unknown as ChronoReportResponse;
  } else {
    throw new Error("Failure fetching chronological event report");
  }
}

export async function getTeamSchedule(
  tournamentId: string,
): Promise<TeamScheduleResponse> {
  const resp = await rbfetch(
    "/api/schedule/team-schedule/" + tournamentId,
    {},
  );
  if (resp.ok) {
    return resp.json() as unknown as TeamScheduleResponse;
  } else {
    throw new Error("Failure fetching team schedule for " + tournamentId);
  }
}

/**
 * Fetches active team tournaments directly from the API (no auth required).
 */
export async function getActiveTeamTournaments(): Promise<RBTournament[]> {
  const resp = await fetch(
    import.meta.env.VITE_API_HOST + "/api/tournament/active-team",
    { mode: "cors" },
  );
  if (resp.ok) {
    return resp.json() as unknown as RBTournament[];
  } else {
    throw new Error("Failure fetching active team tournaments");
  }
}

/**
 * Fetches team schedule directly from the API (no auth required).
 */
export async function getTeamSchedulePublic(
  tournamentId: string,
): Promise<TeamScheduleResponse> {
  const resp = await fetch(
    import.meta.env.VITE_API_HOST +
      "/api/schedule/team-schedule/" +
      tournamentId,
    { mode: "cors" },
  );
  if (resp.ok) {
    return resp.json() as unknown as TeamScheduleResponse;
  } else {
    throw new Error("Failure fetching team schedule for " + tournamentId);
  }
}

/**
 * Fetches the Nexus queue status for a tournament.
 * Returns null on 204 (no data) or any error — never throws.
 */
export async function getNexusQueueStatus(
  tournamentId: string,
): Promise<NexusQueueStatus | null> {
  try {
    const resp = await rbfetch(
      "/api/nexus/queue-status/" + tournamentId,
      {},
    );
    if (resp.ok) {
      return resp.json() as unknown as NexusQueueStatus;
    }
    return null;
  } catch {
    return null;
  }
}

// ── PMVA Report ─────────────────────────────────────────────────────────

export async function getPmvaReportTournaments(): Promise<string[]> {
  const resp = await rbfetch("/api/report/pmva/tournaments", {});
  if (resp.ok) {
    return resp.json() as unknown as string[];
  } else {
    throw new Error("Failure fetching PMVA report tournaments");
  }
}

export async function getPmvaReport(
  tournamentId: string,
): Promise<PmvaReportResponse> {
  const resp = await rbfetch(
    `/api/report/pmva/${tournamentId}`,
    {},
  );
  if (resp.ok) {
    return resp.json() as unknown as PmvaReportResponse;
  } else {
    throw new Error("Failure fetching PMVA report");
  }
}

export async function forgotPassword(login: string): Promise<void> {
  const resp = await fetch(
    import.meta.env.VITE_API_HOST +
      "/api/users/forgot-password?login=" +
      encodeURIComponent(login),
    { method: "POST", mode: "cors" },
  );
  if (!resp.ok) {
    throw new Error("Failed to flag forgotten password: " + resp.status);
  }
}
