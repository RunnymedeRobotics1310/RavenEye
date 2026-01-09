export interface RBEventLogRecord {
  id: number;
  timestamp: Date;
  userId: number;
  tournamentId: string;
  level: string;
  matchId: number;
  alliance: string;
  teamNumber: number;
  eventType: string;
  amount: number;
  note: string;
}
