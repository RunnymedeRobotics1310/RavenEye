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

export interface DefenceNote {
  timestamp: string;
  displayName: string;
  tournamentId: string;
  matchId: number;
  note: string;
}

export interface CountPerMatchStat {
  tournamentId: string;
  averageCountPerMatch: number;
  matchCount: number;
  totalCount: number;
}

export interface FuelPickupStats {
  tournamentId: string;
  ballPitCount: number;
  homeCount: number;
  outpostCount: number;
}

export interface TeamSummaryReport {
  comments: TeamReportComment[];
  robotAlerts: TeamReportRobotAlert[];
  sequenceReportLinks: SequenceReportLink[];
  defenceNotes: DefenceNote[];
  shootToHomeStats: CountPerMatchStat[];
  fuelPickupStats: FuelPickupStats[];
}

export interface TeamSummaryReportResponse {
  report: TeamSummaryReport | null;
  success: boolean;
  reason: string | null;
}

export interface EventTypeStat {
  eventType: string;
  eventTypeName: string;
  averageAmount: number;
}

export interface CustomTournamentStats {
  tournamentId: string;
  stats: EventTypeStat[];
}

export interface CustomTournamentStatsResponse {
  stats: CustomTournamentStats[] | null;
  success: boolean;
  reason: string | null;
}
