import type { GameEvent } from "~/types/GameEvent.ts";

export type GameEvents = {
  events: GameEvent[];
  lastUpdated: Date;
};
