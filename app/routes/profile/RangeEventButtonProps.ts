import type { EventTypeControlProps } from "~/common/track/event-type/eventTypeRegistry.ts";

export interface RangeEventButtonProps extends EventTypeControlProps {
  label: string;
  start: number;
  end: number;
}
