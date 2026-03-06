import { getRoles, getUserid } from "~/common/storage/rbauth.ts";
import type { RBQuickComment } from "~/types/RBQuickComment.ts";
import { repository } from "~/common/storage/db.ts";
import {
  updateCommentUnsyncCount,
  updateEventUnsyncCount,
  updateRobotAlertUnsyncCount,
} from "~/common/sync/sync.ts";
import type { ScoutingSessionId } from "~/types/ScoutingSessionId.ts";
import type { RBEventLogRecord } from "~/types/RBEventLogRecord.ts";
import type { RBRobotAlert } from "~/types/RBRobotAlert.ts";

let lastDrillEventTime = 0;

function generateDrillTournamentId(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `DRILL-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

/**
 * Creates a new drill scouting session with a fresh tournament ID.
 */
export function newDrillSession(
  alliance: "red" | "blue",
  teamNumber: number,
): ScoutingSessionId {
  const session: ScoutingSessionId = {
    userId: getUserid(),
    tournamentId: generateDrillTournamentId(),
    level: "Practice",
    matchId: 1,
    alliance,
    teamNumber,
  };
  setScoutingSession(session);
  lastDrillEventTime = 0;
  return session;
}

/**
 * Get the current scouting session details. If no session is found,
 * a new one is created with default values.
 */
export function getScoutingSession(): ScoutingSessionId {
  const s = sessionStorage.getItem("raveneye-scouting-session");
  let session: ScoutingSessionId;
  if (s === null) {
    session = {
      userId: -1,
      tournamentId: "",
      level: "",
      matchId: -1,
      alliance: "",
      teamNumber: -1,
    };
  } else {
    session = JSON.parse(s);
  }
  return session;
}

/**
 * Set the current scouting session details. The scouting details are saved for
 * the duration of the browser session or until the user logs out.
 * @param session
 */
export function setScoutingSession(session: ScoutingSessionId) {
  sessionStorage.setItem("raveneye-scouting-session", JSON.stringify(session));
}

/**
 * Records a comment made by a user for a specific team.
 *
 * @param {number} team - The identifier of the team for which the comment is being recorded.
 * @param {string} comment - The content of the comment to be recorded.
 * @return {Promise<void>} Resolves when the comment has been successfully recorded.
 */
export async function recordComment(team: number, comment: string) {
  const userId = getUserid();
  const roles = getRoles();
  const role = roles.join(",");

  const qc: RBQuickComment = {
    id: 0,
    userId: userId,
    role: role,
    team: team,
    timestamp: new Date(),
    quickComment: comment,
  };
  await repository.captureComment(qc);
  await updateCommentUnsyncCount();
}

/**
 * Records an event with the provided details and updates the unsynchronized event count.
 *
 * @param {string} eventType - The type of event being recorded.
 * @return {Promise<void>} A promise that resolves once the event is recorded and the unsynchronized count is updated.
 */
export async function recordEvent(
  eventType: string,
  amount: number = 0,
  note: string = "",
) {
  const session = getScoutingSession();

  // Auto-rotate drill session after 10-minute gap
  if (session.tournamentId.startsWith("DRILL-")) {
    if (lastDrillEventTime > 0 && Date.now() - lastDrillEventTime > 600_000) {
      session.tournamentId = generateDrillTournamentId();
      setScoutingSession(session);
    }
    lastDrillEventTime = Date.now();
  }

  console.log("Recording event '"+eventType+"' for scouting session", session)
  if (
    session.userId === -1 ||
    session.matchId === -1 ||
    session.teamNumber === -1
  ) {
    throw new Error("Scouting session id is not initialized");
  }
  const event: RBEventLogRecord = {
    id: 0,
    timestamp: new Date(),
    userId: session.userId,
    tournamentId: session.tournamentId,
    level: session.level,
    matchId: session.matchId,
    alliance: session.alliance,
    teamNumber: session.teamNumber,
    eventType: eventType,
    amount,
    note,
  };
  await repository.captureEvent(event);
  await updateEventUnsyncCount();
}

export async function recordRobotAlert(
  tournamentId: string,
  teamNumber: number,
  alert: string,
) {
  const userId = getUserid();

  const ra: RBRobotAlert = {
    id: 0,
    tournamentId: tournamentId,
    teamNumber: teamNumber,
    userId: userId,
    createdAt: new Date(),
    alert: alert,
  };
  await repository.captureRobotAlert(ra);
  await updateRobotAlertUnsyncCount();
}
