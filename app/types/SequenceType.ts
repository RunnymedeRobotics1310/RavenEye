import type { SequenceEvent } from "~/types/SequenceEvent.ts";

export interface SequenceType {
  id: number;
  name: string;
  description: string;
  frcyear: number;
  events: SequenceEvent[];
}
