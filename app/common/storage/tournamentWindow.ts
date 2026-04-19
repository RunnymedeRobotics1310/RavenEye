import type { RBTournament } from "~/types/RBTournament.ts";
import { serverNow } from "~/common/storage/serverTime.ts";

/**
 * Tournament-window helpers. The server emits {@code activeFrom} and {@code activeUntil}
 * timestamps on every tournament (computed from the start/end times plus the configured
 * lead/tail in {@code raven-eye.sync.tournament-window-*-hours}). The client computes its own
 * {@code active} boolean on every render by comparing those timestamps against
 * {@link serverNow}.
 *
 * <p>This design is what eliminates the original {@code ACTIVE_TOURNAMENT_CUTOFF} client-side
 * constant and the ETag/active-field mismatch that would otherwise let a client hold
 * {@code active: false} long after the tournament actually started.
 *
 * <p>Backward compatibility: if a cached tournament record predates Unit 4 (so
 * {@code activeFrom}/{@code activeUntil} are missing), the helpers fall back to the pre-Unit-4
 * approximation ("started within the last 36 hours") so pages continue to work while the next
 * sync refreshes the IndexedDB entries. The fallback is deliberately generous — better to
 * overcount "active" briefly than to hide a real active tournament.
 */

const LEGACY_CUTOFF_MS = 36 * 60 * 60 * 1000;

function parseInstantMs(value: string | undefined | Date): number | null {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Returns true if {@code t} is currently within its tournament window — i.e., between
 * {@code activeFrom} and {@code activeUntil} in server time (skew-corrected).
 */
export function isTournamentActive(t: RBTournament | undefined | null): boolean {
  if (!t) return false;
  const now = serverNow();
  const from = parseInstantMs(t.activeFrom);
  const until = parseInstantMs(t.activeUntil);
  if (from !== null && until !== null) {
    return now >= from && now <= until;
  }
  // Legacy fallback: treat a tournament as active if its startTime is within the last 36h
  // and we have nothing better. Conservatively overcounts rather than hiding real tournaments.
  const start = parseInstantMs(t.startTime);
  if (start === null) return false;
  return start < now && start > now - LEGACY_CUTOFF_MS;
}

/** True when any tournament in the list is currently active. */
export function hasAnyActiveTournament(list: RBTournament[]): boolean {
  return list.some(isTournamentActive);
}

/** Return only the active tournaments from a list. */
export function activeTournaments(list: RBTournament[]): RBTournament[] {
  return list.filter(isTournamentActive);
}
