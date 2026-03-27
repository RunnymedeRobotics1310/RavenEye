export interface ChronoReportRow {
  id: number;
  timestamp: string;
  level: string;
  matchId: number;
  eventType: string;
  eventTypeName: string;
  amount: number;
  note: string;
  recorder: string;
}

export interface ChronoReportResponse {
  rows: ChronoReportRow[] | null;
  success: boolean;
  reason: string | null;
}
