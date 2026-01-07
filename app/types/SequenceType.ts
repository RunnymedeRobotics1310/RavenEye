import type { SequenceEvent } from "~/types/SequenceEvent.ts";

export interface SequenceType {
  name: string;
  description: string;
  events: SequenceEvent[];
}
