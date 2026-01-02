import type { Tournament } from "~/types/Tournament.ts";
import type { ScheduleItem } from "~/types/ScheduleItem.ts";

export type Schedule = {
  tournament: Tournament;
  matches: ScheduleItem[];
};
