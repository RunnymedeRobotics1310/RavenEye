import type { SequenceType } from "~/types/SequenceType.ts";
import type { EventType } from "~/types/EventType.ts";

export interface SequenceEvent {
  id: number;
  sequencetype: SequenceType;
  eventtype: EventType;
  startOfSequence: boolean;
  endOfSequence: boolean;
}
