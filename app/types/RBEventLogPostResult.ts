import type { RBEventLogRecord } from "~/types/RBEventLogRecord.ts";

export interface RBEventLogPostResult {
  eventLogRecord: RBEventLogRecord;
  success: boolean;
  reason: string;
}
