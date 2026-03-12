export interface MegaReportColumn {
  eventtype: string;
  name: string;
  isQuantity: boolean;
}

export interface MegaReportRow {
  matchId: number;
  level: string;
  values: Record<string, number>;
}

export interface MegaReport {
  columns: MegaReportColumn[];
  rows: MegaReportRow[];
}

export interface MegaReportResponse {
  report: MegaReport | null;
  success: boolean;
  reason: string | null;
}
