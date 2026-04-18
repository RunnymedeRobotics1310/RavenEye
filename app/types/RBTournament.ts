export type RBTournament = {
  id: string;
  season: number;
  name: string;
  startTime: Date;
  endTime: Date;
  weekNumber: number;
  // Merged list of manual + TBA webcast URLs. Since the backend added the TBA data foundation,
  // this is a typed string[] — the legacy JSON-array-string / single-string forms are kept in
  // the type union for defensive parsing of older IndexedDB entries during the first post-sync.
  webcasts?: string[] | string | null;
  // Subset of `webcasts` that came from TBA. Used by the admin UI to badge each URL.
  // Absent when the tournament has no tba_event_key set.
  webcastsFromTba?: string[];
  // Timestamp (ISO-8601 string as serialized by Java Instant) of the most recent successful TBA
  // sync. Null when no successful sync has happened yet.
  webcastsLastSync?: string | null;
  // True when TBA data is stale or missing: last sync older than threshold, last sync failed,
  // or tba_event_key is set but no RB_TBA_EVENT row exists yet.
  webcastsStale?: boolean;
  // TBA event key (e.g. "2026onto") — admin-editable (see Unit 7) when auto-derivation was wrong.
  tbaEventKey?: string | null;
};
