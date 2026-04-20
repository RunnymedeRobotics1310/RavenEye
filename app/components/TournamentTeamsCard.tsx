import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { repository } from "~/common/storage/db.ts";
import { getTeamCapability as fetchTeamCapability } from "~/common/storage/rb.ts";
import type { TeamCapability } from "~/types/TeamCapability.ts";

/**
 * Unit 7 — Team Capability Rankings P1.
 *
 * Renders a sortable, owner-highlighted capability table card below the rest of the
 * team-schedule page stack. Reads from IndexedDB (populated by Unit 6's JOBS sync).
 *
 * Behaviour:
 * - Columns (landscape / tablet / desktop): Team (# + Name) | Overall EPA | Auto EPA |
 *   Teleop EPA | Endgame EPA | OPR | Auto Accuracy | Teleop Success | Pickup Avg |
 *   Comments | Alerts | Coverage.
 * - Portrait-iPhone: narrow 3-column view (Team | Overall EPA | OPR).
 * - Default sort: OPR desc. Nulls always last. Withdrawn rows always last.
 * - Click header to sort; click again to flip direction.
 * - Owner row highlighted with the existing `rankings-row-owner` class.
 * - Row click navigates to the team-summary page (/report/summary/:teamId).
 * - Missing numeric data renders as an em dash.
 * - Staleness banner (top of card) when any row has `oprStale` or `epaStale === true`.
 */

type SortKey =
  | "team"
  | "epaTotal"
  | "epaAuto"
  | "epaTeleop"
  | "epaEndgame"
  | "opr"
  | "autoAccuracy"
  | "teleopSuccessRate"
  | "pickupAverage"
  | "quickCommentCount"
  | "robotAlertCount"
  | "scoutingCoverage";

type SortDirection = "asc" | "desc";

interface SortState {
  key: SortKey;
  direction: SortDirection;
}

const DEFAULT_SORT: SortState = { key: "opr", direction: "desc" };

// Coverage ordering: full > thin > none.
const COVERAGE_ORDER: Record<TeamCapability["scoutingCoverage"], number> = {
  full: 3,
  thin: 2,
  none: 1,
};

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

function useIsNarrow(): boolean {
  const [isNarrow, setIsNarrow] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 480px) and (orientation: portrait)")
      .matches;
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(
      "(max-width: 480px) and (orientation: portrait)",
    );
    const onChange = (e: MediaQueryListEvent) => setIsNarrow(e.matches);
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  }, []);
  return isNarrow;
}

function getSortValue(row: TeamCapability, key: SortKey): number | string | null {
  switch (key) {
    case "team":
      return row.teamNumber;
    case "epaTotal":
      return row.epaTotal;
    case "epaAuto":
      return row.epaAuto;
    case "epaTeleop":
      return row.epaTeleop;
    case "epaEndgame":
      return row.epaEndgame;
    case "opr":
      return row.opr;
    case "autoAccuracy":
      return row.autoAccuracy;
    case "teleopSuccessRate":
      return row.teleopSuccessRate;
    case "pickupAverage":
      return row.pickupAverage;
    case "quickCommentCount":
      return row.quickCommentCount;
    case "robotAlertCount":
      return row.robotAlertCount;
    case "scoutingCoverage":
      return COVERAGE_ORDER[row.scoutingCoverage];
  }
}

function sortRows(rows: TeamCapability[], sort: SortState): TeamCapability[] {
  const copy = rows.slice();
  const dirMult = sort.direction === "asc" ? 1 : -1;
  copy.sort((a, b) => {
    // Withdrawn rows always sort last regardless of direction.
    if (a.withdrawn !== b.withdrawn) return a.withdrawn ? 1 : -1;

    const av = getSortValue(a, sort.key);
    const bv = getSortValue(b, sort.key);

    // Nulls always sort last regardless of direction.
    const aNull = av === null || av === undefined;
    const bNull = bv === null || bv === undefined;
    if (aNull && bNull) {
      // Stable tiebreak on team number (ascending).
      return a.teamNumber - b.teamNumber;
    }
    if (aNull) return 1;
    if (bNull) return -1;

    if (typeof av === "number" && typeof bv === "number") {
      if (av === bv) return a.teamNumber - b.teamNumber;
      return (av - bv) * dirMult;
    }
    const cmp = String(av).localeCompare(String(bv));
    if (cmp === 0) return a.teamNumber - b.teamNumber;
    return cmp * dirMult;
  });
  return copy;
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

function CoveragePill({
  coverage,
}: {
  coverage: TeamCapability["scoutingCoverage"];
}) {
  const label =
    coverage === "full" ? "Full" : coverage === "thin" ? "Thin" : "None";
  const className = `badge-scouting-${coverage}`;
  return <span className={className}>{label}</span>;
}

interface SortHeaderProps {
  label: string;
  sortKey: SortKey;
  current: SortState;
  onSort: (key: SortKey) => void;
  className?: string;
}

function SortHeader({
  label,
  sortKey,
  current,
  onSort,
  className,
}: SortHeaderProps) {
  const active = current.key === sortKey;
  const ariaSort = active
    ? current.direction === "asc"
      ? "ascending"
      : "descending"
    : "none";
  const indicator = active ? (current.direction === "asc" ? " ▲" : " ▼") : "";
  return (
    <th
      className={className}
      aria-sort={ariaSort}
      onClick={() => onSort(sortKey)}
      style={{ cursor: "pointer", userSelect: "none" }}
    >
      {label}
      {indicator}
    </th>
  );
}

export interface TournamentTeamsCardProps {
  tournamentId: string;
  ownerTeam: number;
}

export default function TournamentTeamsCard({
  tournamentId,
  ownerTeam,
}: TournamentTeamsCardProps) {
  const { data, loading, error } = useTeamCapability(tournamentId);
  const navigate = useNavigate();
  const isNarrow = useIsNarrow();
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);

  const sortedRows = useMemo(() => sortRows(data, sort), [data, sort]);
  const anyStale = useMemo(
    () => data.some((r) => r.oprStale || r.epaStale),
    [data],
  );

  const handleSort = (key: SortKey) => {
    setSort((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      // When switching to a new column, default to descending for numeric cols
      // (higher is better); ascending for team (by number).
      return { key, direction: key === "team" ? "asc" : "desc" };
    });
  };

  const handleRowClick = (teamNumber: number) => {
    navigate(`/report/summary/${teamNumber}`);
  };

  return (
    <section className="card tournament-teams-card">
      <h3>Tournament Teams</h3>
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
            <table className="schedule-table tournament-teams-table">
              <thead>
                <tr>
                  <SortHeader
                    label="Team"
                    sortKey="team"
                    current={sort}
                    onSort={handleSort}
                    className="tt-col-team"
                  />
                  <SortHeader
                    label="Overall EPA"
                    sortKey="epaTotal"
                    current={sort}
                    onSort={handleSort}
                  />
                  <SortHeader
                    label="Auto EPA"
                    sortKey="epaAuto"
                    current={sort}
                    onSort={handleSort}
                    className="tt-col-wide"
                  />
                  <SortHeader
                    label="Teleop EPA"
                    sortKey="epaTeleop"
                    current={sort}
                    onSort={handleSort}
                    className="tt-col-wide"
                  />
                  <SortHeader
                    label="Endgame EPA"
                    sortKey="epaEndgame"
                    current={sort}
                    onSort={handleSort}
                    className="tt-col-wide"
                  />
                  <SortHeader
                    label="OPR"
                    sortKey="opr"
                    current={sort}
                    onSort={handleSort}
                  />
                  <SortHeader
                    label="Auto Acc"
                    sortKey="autoAccuracy"
                    current={sort}
                    onSort={handleSort}
                    className="tt-col-wide"
                  />
                  <SortHeader
                    label="Teleop Succ"
                    sortKey="teleopSuccessRate"
                    current={sort}
                    onSort={handleSort}
                    className="tt-col-wide"
                  />
                  <SortHeader
                    label="Pickup Avg"
                    sortKey="pickupAverage"
                    current={sort}
                    onSort={handleSort}
                    className="tt-col-wide"
                  />
                  <SortHeader
                    label="Comments"
                    sortKey="quickCommentCount"
                    current={sort}
                    onSort={handleSort}
                    className="tt-col-wide"
                  />
                  <SortHeader
                    label="Alerts"
                    sortKey="robotAlertCount"
                    current={sort}
                    onSort={handleSort}
                    className="tt-col-wide"
                  />
                  <SortHeader
                    label="Coverage"
                    sortKey="scoutingCoverage"
                    current={sort}
                    onSort={handleSort}
                    className="tt-col-wide"
                  />
                </tr>
              </thead>
              <tbody>
                {loading && data.length === 0 && (
                  <tr>
                    <td
                      colSpan={isNarrow ? 3 : 12}
                      className="tt-loading-cell"
                    >
                      Loading team capability…
                    </td>
                  </tr>
                )}
                {!loading && data.length === 0 && (
                  <tr>
                    <td
                      colSpan={isNarrow ? 3 : 12}
                      className="tt-empty-cell"
                    >
                      No team capability data yet.
                    </td>
                  </tr>
                )}
                {sortedRows.map((row) => {
                  const isOwner = row.teamNumber === ownerTeam;
                  const classNames = [
                    isOwner ? "rankings-row-owner" : "",
                    row.withdrawn ? "tournament-teams-row-withdrawn" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <tr
                      key={row.teamNumber}
                      className={classNames}
                      onClick={() => handleRowClick(row.teamNumber)}
                      style={{ cursor: "pointer" }}
                    >
                      <td className="tt-col-team">
                        <span className="tt-team-number">{row.teamNumber}</span>
                        {row.teamName && (
                          <span className="tt-team-name">
                            {" "}
                            {row.teamName}
                          </span>
                        )}
                      </td>
                      <td>{fmtNumber(row.epaTotal)}</td>
                      <td className="tt-col-wide">{fmtNumber(row.epaAuto)}</td>
                      <td className="tt-col-wide">
                        {fmtNumber(row.epaTeleop)}
                      </td>
                      <td className="tt-col-wide">
                        {fmtNumber(row.epaEndgame)}
                      </td>
                      <td>{fmtNumber(row.opr)}</td>
                      <td className="tt-col-wide">
                        {fmtPercent(row.autoAccuracy)}
                      </td>
                      <td className="tt-col-wide">
                        {fmtPercent(row.teleopSuccessRate)}
                      </td>
                      <td className="tt-col-wide">
                        {fmtNumber(row.pickupAverage)}
                      </td>
                      <td className="tt-col-wide">
                        {fmtInt(row.quickCommentCount)}
                      </td>
                      <td className="tt-col-wide">
                        {fmtInt(row.robotAlertCount)}
                      </td>
                      <td className="tt-col-wide">
                        <CoveragePill coverage={row.scoutingCoverage} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
