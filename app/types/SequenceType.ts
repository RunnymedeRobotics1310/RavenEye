import type { SequenceEvent } from "~/types/SequenceEvent.ts";

export interface SequenceType {
  id: number;
  code: string;
  name: string;
  description: string;
  frcyear: number;
  strategyareaId: number;
  disabled: boolean;
  events: SequenceEvent[];
}
