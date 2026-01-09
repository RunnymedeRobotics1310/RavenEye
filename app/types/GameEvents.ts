import type { GameEvent } from "~/types/GameEvent.ts";

/**
 * @deprecated
 */
export type GameEvents = {
  events: GameEvent[];
  lastUpdated: Date;
};
