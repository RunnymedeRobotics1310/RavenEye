export interface PmvaReport {
  teamNumber: number;
  matchCount: number;
  general: GeneralSection;
  hopper: HopperSection;
  swi: SwiSection;
}

export interface MatchComment {
  matchId: number;
  level: string;
  note: string;
}

export interface GeneralSection {
  breakdownCount: number;
  noBreakdownCount: number;
  breakdownPercentage: number;
  breakdownMatches: MatchBreakdown[];
  breakdownNotes: MatchComment[];
  intakeComments: MatchComment[];
  shooterComments: MatchComment[];
  generalComments: MatchComment[];
  suggestions: MatchComment[];
}

export interface MatchBreakdown {
  matchId: number;
  level: string;
  note: string;
  videoLink: string | null;
}

export interface HopperSection {
  loading: LoadingStats;
  shootingAll: ShootingStats;
  shootingClose: ShootingStats | null;
  shootingMid: ShootingStats | null;
  shootingFar: ShootingStats | null;
  shootingVaried: ShootingStats | null;
}

export interface LoadingStats {
  avgFillCount: number;
  maxFillCount: number;
  hopperFilledPercentage: number;
  avgLoadRating: number;
  loadComments: MatchComment[];
}

export interface ShootingStats {
  position: string;
  sequenceCount: number;
  perMatch: MatchShootingData[];
  avgScorePerMatch: number;
  avgHitRate: number;
  avgUnloadSeconds: number;
  shotsPerSecond: number;
  scoresPerSecond: number;
  avgStuckPerSequence: number;
  stuckComments: MatchComment[];
  generalComments: MatchComment[];
}

export interface MatchShootingData {
  matchId: number;
  level: string;
  unloadRuns: number;
  totalScores: number;
  totalShots: number;
  hitRate: number;
}

export interface SwiSection {
  avgSequencesPerMatch: number;
  avgScoresPerSequence: number;
  avgScorePercentPerSequence: number;
  avgStuckPerSequence: number;
  avgDurationSeconds: number;
  perMatch: MatchSwiData[];
  stuckComments: MatchComment[];
  generalComments: MatchComment[];
  positionComments: MatchComment[];
}

export interface MatchSwiData {
  matchId: number;
  level: string;
  sequenceCount: number;
  totalScores: number;
  totalMisses: number;
  hitRate: number;
  avgDurationSeconds: number;
}

export interface PmvaReportResponse {
  report: PmvaReport | null;
  success: boolean;
  reason: string | null;
}
