export interface TeamReportComment {
  timestamp: string;
  displayName: string;
  role: string;
  quickComment: string;
}

export interface SequenceReportLink {
  sequenceTypeCode: string;
  sequenceTypeName: string;
  tournamentId: string;
  drill: boolean;
}

export interface TeamReportRobotAlert {
  timestamp: string;
  displayName: string;
  tournamentId: string;
  alert: string;
}

export interface TeamSummaryReport {
  comments: TeamReportComment[];
  robotAlerts: TeamReportRobotAlert[];
  sequenceReportLinks: SequenceReportLink[];
}

export interface TeamSummaryReportResponse {
  report: TeamSummaryReport | null;
  success: boolean;
  reason: string | null;
}
