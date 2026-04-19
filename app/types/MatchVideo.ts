export interface MatchVideo {
  // Null for TBA-sourced synthetic entries (no admin-table identity); numeric for admin rows.
  id: number | null;
  tournamentId: string;
  matchLevel: string;
  matchNumber: number;
  label: string;
  videoUrl: string;
  // Present on enriched responses from GET /api/match-video/...; absent on older clients.
  source?: "manual" | "tba";
  stale?: boolean;
}
