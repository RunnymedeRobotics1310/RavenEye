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
  shootingAll: ShootingView;
  shootingClose: ShootingView | null;
  shootingMid: ShootingView | null;
  shootingFar: ShootingView | null;
  shootingMoving: ShootingView | null;
  shootingIntaking: ShootingView | null;
}

export interface LoadingStats {
  avgFillCount: number;
  hopperFilledPercentage: number;
  maxFillExcludingIntaking: number;
  hopperFilledRating: number;
  loadComments: MatchComment[];
  shootComments: MatchComment[];
}

export interface ShootingView {
  filter: string;
  sequenceCount: number;
  matchCycles: MatchCycleData[];
  sequenceShots: SequenceShotData[];
  avgCyclesPerMatch: number;
  maxCyclesPerMatch: number;
}

export interface MatchCycleData {
  matchId: number;
  level: string;
  cycleCount: number;
  totalShots: number;
  totalScores: number;
  totalMisses: number;
  totalStuck: number;
}

export interface SequenceShotData {
  matchId: number;
  level: string;
  sequenceIndex: number;
  shots: number;
  scores: number;
  misses: number;
  stuck: number;
  unloadSeconds: number;
  shotsPerSecond: number;
  scoresPerSecond: number;
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
