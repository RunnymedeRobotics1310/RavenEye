/**
 * @deprecated
 */
export type GameEvent = {
  timestamp: Date;
  scoutName: string;
  tournamentId: string;
  matchId: number;
  alliance: string;
  teamNumber: number;
  eventType: string;
  amount: number;
  note: string | undefined;
  synchronized: boolean;
};

export function equalsIgnoreSync(event: GameEvent, e: GameEvent) {
  // console.log('Comparing event and e', { event, e });
  return (
    event.timestamp.getTime() == e.timestamp.getTime() &&
    event.scoutName == e.scoutName &&
    event.tournamentId == e.tournamentId &&
    event.matchId == e.matchId &&
    event.alliance == e.alliance &&
    event.teamNumber == e.teamNumber &&
    event.eventType == e.eventType &&
    event.amount == e.amount &&
    (event.note == e.note ||
      (event.note == "" && !e.note) ||
      (!event.note && e.note == ""))
  );
}

export function asMap(events: GameEvent[]) {
  const map = new Map<string, GameEvent>();
  for (const e of events) {
    const key =
      "_" +
      e.timestamp.getTime() +
      "_" +
      e.scoutName +
      "_" +
      e.tournamentId +
      "_" +
      e.matchId +
      "_" +
      e.alliance +
      "_" +
      e.teamNumber +
      "_" +
      e.eventType;
    map.set(key, e);
  }
  return map;
}
