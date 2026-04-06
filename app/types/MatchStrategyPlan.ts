export interface MatchStrategyPlan {
  id: number | null;
  tournamentId: string;
  matchLevel: string;
  matchNumber: number;
  shortSummary: string;
  strategyText: string | null;
  updatedByUserId: number;
  updatedByDisplayName: string;
  updatedAt: string; // ISO timestamp
}
