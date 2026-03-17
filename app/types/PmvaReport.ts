export interface PmvaReport {
  matchCount: number;
  general: GeneralSection;
  hopper: HopperSection;
  swi: SwiSection;
}

export interface GeneralSection {
  breakdownCount: number;
  noBreakdownCount: number;
  breakdownPercentage: number;
  breakdownMatches: MatchBreakdown[];
  breakdownNotes: string[];
  intakeComments: string[];
  shooterComments: string[];
  generalComments: string[];
  suggestions: string[];
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
  loadComments: string[];
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
  stuckComments: string[];
  generalComments: string[];
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
  stuckComments: string[];
  generalComments: string[];
  positionComments: string[];
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
