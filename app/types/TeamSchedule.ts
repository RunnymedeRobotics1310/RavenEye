export interface TeamScheduleMatch {
  level: string;
  match: number;
  startTime: string | null;
  red1: number;
  red2: number;
  red3: number;
  red4: number;
  blue1: number;
  blue2: number;
  blue3: number;
  blue4: number;
  redScore: number | null;
  blueScore: number | null;
  redRp: number | null;
  blueRp: number | null;
  winningAlliance: number;
}

export interface TeamRanking {
  teamNumber: number;
  rp: number;
  matchesPlayed: number;
  rs: number;
}

export interface TeamScheduleResponse {
  tournamentId: string;
  tournamentName: string;
  teamNumber: number;
  hasPractice: boolean;
  hasQualification: boolean;
  hasPlayoff: boolean;
  matches: TeamScheduleMatch[];
  rankings: TeamRanking[];
}
