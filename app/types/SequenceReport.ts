import type { EventType } from "~/types/EventType.ts";

export interface TimedSequenceEvent {
  eventtype: EventType;
  timestamp: string;
  elapsedSincePrecedingEvent: number;
  elapsedSinceStartOfSequence: number;
}

export interface IntervalDuration {
  start: EventType;
  end: EventType;
  duration: number;
}

export interface IntervalStats {
  start: EventType;
  end: EventType;
  average: number;
  fastest: number;
  slowest: number;
  stddev: number;
}

export interface SequenceInfo {
  team: number;
  frcYear: number;
  events: TimedSequenceEvent[];
  intervals: IntervalDuration[];
  duration: number;
}

export interface SequenceReport {
  sequences: SequenceInfo[];
  averageDuration: number;
  fastestDuration: number;
  slowestDuration: number;
  durationStdDev: number;
  intervalStats: IntervalStats[];
}

export interface DrillReportResponse {
  report: SequenceReport | null;
  success: boolean;
  reason: string | null;
}

export interface MatchSequenceReport {
  matchId: number;
  level: string;
  report: SequenceReport;
}

export interface TournamentSequenceReport {
  aggregate: SequenceReport;
  matches: MatchSequenceReport[];
}

export interface TournamentSequenceReportResponse {
  report: TournamentSequenceReport | null;
  success: boolean;
  reason: string | null;
}
