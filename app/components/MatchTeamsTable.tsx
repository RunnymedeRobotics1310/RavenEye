import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { repository } from "~/common/storage/db.ts";
import { getTeamCapability as fetchTeamCapability } from "~/common/storage/rb.ts";
import type { TeamCapability } from "~/types/TeamCapability.ts";

/**
 * Unit 8 — Team Capability Rankings P1.
 *
 * Renders a Match Teams input table ABOVE the strategy diagrams on the match
 * strategy page. Six rows in a standard match (Red 1-3 / Blue 1-3), or 7-8
 * rows in a 4-team playoff alliance.
 *
 * Behaviour:
 * - Alliance-grouped: Red alliance rows first, then Blue alliance rows.
 * - Alliance colour is a redundant CB-safe channel — an explicit "Red" / "Blue"
 *   label column always appears, so screen readers and colour-blind users can
 *   still distinguish alliance membership.
 * - Within-alliance rank is computed client-side per numeric column using
 *   standard competition ranking (1, 2, 2, 4). Rendered as
 *   `<span className="schedule-team-rank">({rank})</span>` after the value.
 * - **Rank suppression**:
 *    1. If fewer than 2 non-null values in the alliance for the column, no rank.
 *    2. If all non-null values are equal (spread = 0), no rank.
 * - Missing numeric data: em dash, no rank; excluded from rank computation.
 * - Withdrawn teams: strikethrough row (CSS `text-decoration: line-through`);
 *   included inside their alliance group; excluded from rank computation.
 * - Owner team (1310) row highlighted via the existing `rankings-row-owner`.
 * - Row click navigates to `/report/summary/:teamNumber`.
 * - No sort controls, no expand-collapse (6 rows, pre-grouped).
 * - Staleness: `.banner-info` at the top of the card when any team's OPR or
 *   EPA is stale.
 * - Loading: skeleton row. Error: `.banner-warning` replacement.
 *
 * Columns (Coverage dropped vs. Unit 7 to save horizontal space):
 *   Alliance | Team | Overall EPA | Auto EPA | Teleop EPA | Endgame EPA |
 *   OPR | Auto Acc | Teleop Succ | Pickup Avg | Comments | Alerts
 */

export interface MatchTeamsTableProps {
  tournamentId: string;
  ownerTeam: number;
  redTeams: number[];
  blueTeams: number[];
}

type NumericKey =
  | "epaTotal"
  | "epaAuto"
  | "epaTeleop"
  | "epaEndgame"
  | "opr"
  | "autoAccuracy"
  | "teleopSuccessRate"
  | "pickupAverage"
  | "quickCommentCount"
  | "robotAlertCount";

interface ColumnSpec {
  key: NumericKey;
  label: string;
  format: (v: number | null) => string;
}

function fmtNumber(n: number | null, digits: number = 1): string {
  if (n === null || n === undefined) return "—";
  return n.toFixed(digits);
}

function fmtPercent(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return `${(n * 100).toFixed(0)}%`;
}

function fmtInt(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return String(n);
}

const COLUMNS: ColumnSpec[] = [
  { key: "epaTotal", label: "Overall EPA", format: (v) => fmtNumber(v) },
  { key: "epaAuto", label: "Auto EPA", format: (v) => fmtNumber(v) },
  { key: "epaTeleop", label: "Teleop EPA", format: (v) => fmtNumber(v) },
  { key: "epaEndgame", label: "Endgame EPA", format: (v) => fmtNumber(v) },
  { key: "opr", label: "OPR", format: (v) => fmtNumber(v) },
  { key: "autoAccuracy", label: "Auto Acc", format: (v) => fmtPercent(v) },
  {
    key: "teleopSuccessRate",
    label: "Teleop Succ",
    format: (v) => fmtPercent(v),
  },
  { key: "pickupAverage", label: "Pickup Avg", format: (v) => fmtNumber(v) },
  { key: "quickCommentCount", label: "Comments", format: (v) => fmtInt(v) },
  { key: "robotAlertCount", label: "Alerts", format: (v) => fmtInt(v) },
];

function readNumeric(row: TeamCapability, key: NumericKey): number | null {
  const v = row[key];
  if (v === null || v === undefined) return null;
  return v;
}

function useTeamCapability(tournamentId: string): {
  data: TeamCapability[];
  loading: boolean;
  error: string | null;
} {
  const [data, setData] = useState<TeamCapability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const rows = await repository.getTeamCapability(tournamentId);
        if (isMounted) {
          setData(rows);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load team capability", err);
        if (isMounted) {
          setError("Couldn't load team capability");
          setLoading(false);
        }
      }
    };
    // On-demand fetch: the JOBS sync only populates active tournaments, so post-season
    // (or unwatched) tournaments start with an empty IndexedDB store. One-off fetch ensures
    // the page has data to render; cacheFetch handles ETag re-use on subsequent mounts.
    const syncIfEmpty = async () => {
      try {
        const existing = await repository.getTeamCapability(tournamentId);
        if (existing.length > 0) return;
        const rows = await fetchTeamCapability(tournamentId);
        await repository.putTeamCapability(tournamentId, rows);
      } catch (err) {
        console.warn("On-demand team-capability fetch failed", err);
      }
    };
    load();
    syncIfEmpty();
    const interval = setInterval(load, 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [tournamentId]);

  return { data, loading, error };
}

/**
 * Compute standard competition rank (1, 2, 2, 4) for each row in `rows`,
 * ranking descending by `value(row)`. Rows whose value is null are assigned
 * rank=null. Withdrawn rows are also assigned rank=null (but still included
 * in the returned map so the caller can key by team number).
 *
 * Returns a map keyed by teamNumber -> rank (or null).
 *
 * Suppression rules (applied here, returning null for all values in the
 * alliance when either holds):
 *   1. Fewer than 2 non-null, non-withdrawn values → no ranks.
 *   2. Spread (max - min) across those values is 0 → no ranks.
 */
function computeAllianceRanks(
  rows: TeamCapability[],
  key: NumericKey,
): Map<number, number | null> {
  const result = new Map<number, number | null>();

  // Gather the (teamNumber, value) pairs that participate in ranking.
  const eligible: { teamNumber: number; value: number }[] = [];
  for (const r of rows) {
    if (r.withdrawn) {
      result.set(r.teamNumber, null);
      continue;
    }
    const v = readNumeric(r, key);
    if (v === null) {
      result.set(r.teamNumber, null);
      continue;
    }
    eligible.push({ teamNumber: r.teamNumber, value: v });
  }

  // Suppression rule 1: fewer than 2 eligible values → no ranks at all.
  if (eligible.length < 2) {
    for (const e of eligible) result.set(e.teamNumber, null);
    return result;
  }

  // Suppression rule 2: spread is 0 → no ranks.
  let min = eligible[0].value;
  let max = eligible[0].value;
  for (const e of eligible) {
    if (e.value < min) min = e.value;
    if (e.value > max) max = e.value;
  }
  if (max - min === 0) {
    for (const e of eligible) result.set(e.teamNumber, null);
    return result;
  }

  // Standard competition ranking: sort desc, assign 1..n; ties share the
  // lower rank and the next rank jumps past them (1, 2, 2, 4).
  const sorted = eligible.slice().sort((a, b) => b.value - a.value);
  let currentRank = 0;
  let lastValue: number | null = null;
  let lastRank = 0;
  sorted.forEach((e, index) => {
    currentRank = index + 1;
    if (lastValue !== null && e.value === lastValue) {
      result.set(e.teamNumber, lastRank);
    } else {
      result.set(e.teamNumber, currentRank);
      lastRank = currentRank;
      lastValue = e.value;
    }
  });
  return result;
}

interface AllianceBlockData {
  alliance: "red" | "blue";
  rows: TeamCapability[];
  ranks: Map<NumericKey, Map<number, number | null>>;
}

function buildAllianceBlock(
  alliance: "red" | "blue",
  teamNumbers: number[],
  data: TeamCapability[],
): AllianceBlockData {
  const byTeam = new Map<number, TeamCapability>();
  for (const r of data) byTeam.set(r.teamNumber, r);

  // Preserve schedule slot order (R1..R4 / B1..B4). If a team is missing from
  // the capability dataset, synthesise a row so the scout still sees the team
  // number with em dashes for every column (no rank contribution).
  const rows: TeamCapability[] = teamNumbers.map((tn) => {
    const existing = byTeam.get(tn);
    if (existing) return existing;
    return {
      teamNumber: tn,
      teamName: null,
      opr: null,
      oprStale: false,
      epaTotal: null,
      epaAuto: null,
      epaTeleop: null,
      epaEndgame: null,
      epaUnitless: null,
      epaNorm: null,
      epaStale: false,
      autoAccuracy: null,
      teleopSuccessRate: null,
      pickupAverage: null,
      quickCommentCount: 0,
      robotAlertCount: 0,
      robotAlertMaxSeverity: null,
      scoutingCoverage: "none",
      withdrawn: false,
    };
  });

  const ranks = new Map<NumericKey, Map<number, number | null>>();
  for (const col of COLUMNS) {
    ranks.set(col.key, computeAllianceRanks(rows, col.key));
  }
  return { alliance, rows, ranks };
}

interface CellProps {
  row: TeamCapability;
  col: ColumnSpec;
  rank: number | null;
}

function ValueCell({ row, col, rank }: CellProps) {
  const raw = readNumeric(row, col.key);
  const formatted = col.format(raw);
  const showRank = rank !== null && raw !== null && !row.withdrawn;
  return (
    <td>
      {formatted}
      {showRank && (
        <span className="schedule-team-rank">({rank})</span>
      )}
    </td>
  );
}

export default function MatchTeamsTable({
  tournamentId,
  ownerTeam,
  redTeams,
  blueTeams,
}: MatchTeamsTableProps) {
  const { data, loading, error } = useTeamCapability(tournamentId);
  const navigate = useNavigate();

  const blocks = useMemo<AllianceBlockData[]>(() => {
    return [
      buildAllianceBlock("red", redTeams, data),
      buildAllianceBlock("blue", blueTeams, data),
    ];
  }, [data, redTeams, blueTeams]);

  const anyStale = useMemo(() => {
    const relevant = new Set<number>([...redTeams, ...blueTeams]);
    return data.some(
      (r) => relevant.has(r.teamNumber) && (r.oprStale || r.epaStale),
    );
  }, [data, redTeams, blueTeams]);

  const handleRowClick = (teamNumber: number) => {
    navigate(`/report/summary/${teamNumber}`);
  };

  const totalColumnCount = 2 /* alliance + team */ + COLUMNS.length;

  return (
    <section className="card match-teams-card">
      <h3>Match Teams</h3>
      {anyStale && !loading && !error && (
        <div className="banner banner-info">
          (i) Team capability data may be stale — sync in progress.
        </div>
      )}
      {error ? (
        <div className="banner banner-warning">
          Couldn't load team capability — try again in a moment.
        </div>
      ) : (
        <>
          <p className="schedule-rotate-hint">Rotate for more columns</p>
          <div className="schedule-table-wrapper">
            <table className="schedule-table match-teams-table">
              <thead>
                <tr>
                  <th className="mt-col-alliance">Alliance</th>
                  <th className="mt-col-team">Team</th>
                  {COLUMNS.map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && data.length === 0 && (
                  <tr>
                    <td colSpan={totalColumnCount} className="mt-loading-cell">
                      Loading match teams…
                    </td>
                  </tr>
                )}
                {!loading &&
                  blocks.map((block) => {
                    const allianceLabel =
                      block.alliance === "red" ? "Red" : "Blue";
                    const allianceRowClass =
                      block.alliance === "red"
                        ? "match-teams-row-red"
                        : "match-teams-row-blue";
                    return block.rows.map((row, indexInAlliance) => {
                      const isOwner = row.teamNumber === ownerTeam;
                      const isFirstInAlliance = indexInAlliance === 0;
                      const classNames = [
                        allianceRowClass,
                        isFirstInAlliance
                          ? "match-teams-alliance-first"
                          : "",
                        isOwner ? "rankings-row-owner" : "",
                        row.withdrawn ? "match-teams-row-withdrawn" : "",
                      ]
                        .filter(Boolean)
                        .join(" ");
                      return (
                        <tr
                          key={`${block.alliance}-${row.teamNumber}`}
                          className={classNames}
                          onClick={() => handleRowClick(row.teamNumber)}
                          style={{ cursor: "pointer" }}
                        >
                          <td className="mt-col-alliance">{allianceLabel}</td>
                          <td className="mt-col-team">
                            <span className="mt-team-number">
                              {row.teamNumber}
                            </span>
                            {row.teamName && (
                              <span className="mt-team-name">
                                {" "}
                                {row.teamName}
                              </span>
                            )}
                          </td>
                          {COLUMNS.map((col) => {
                            const rankMap = block.ranks.get(col.key);
                            const rank = rankMap
                              ? rankMap.get(row.teamNumber) ?? null
                              : null;
                            return (
                              <ValueCell
                                key={col.key}
                                row={row}
                                col={col}
                                rank={rank}
                              />
                            );
                          })}
                        </tr>
                      );
                    });
                  })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
