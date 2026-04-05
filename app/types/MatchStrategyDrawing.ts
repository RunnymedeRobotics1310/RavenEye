import type { StrategyStroke } from "./StrategyStroke.ts";

/**
 * A single strategy drawing — a named diagram on the field canvas
 * holding an ordered list of strokes. Stored as a JSON blob on the server.
 */
export interface MatchStrategyDrawing {
  // Server-assigned once synced. Null for drawings created locally and not yet synced.
  id: number | null;
  // Server-assigned once the parent plan is synced.
  planId: number | null;
  label: string;
  strokes: StrategyStroke[];
  createdByUserId: number | null;
  createdByDisplayName: string | null;
  updatedByUserId: number | null;
  updatedByDisplayName: string | null;
  createdAt: string | null; // ISO timestamp
  updatedAt: string | null; // ISO timestamp
}
