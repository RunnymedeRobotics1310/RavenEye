import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchTournamentSchedule,
  getActiveTeamTournaments,
  getNexusQueueStatus,
  getTeamSchedulePublic,
  getTournamentList,
} from "~/common/storage/rb.ts";
import { useLoginStatus } from "~/common/storage/rbauth.ts";
import Spinner from "~/common/Spinner.tsx";
import {
  BRACKET_8,
  deriveAlliances,
  resolveBracket,
  type Alliance,
  type ResolvedMatch,
} from "~/common/bracket.ts";
import type { RBTournament } from "~/types/RBTournament.ts";
import type { NexusQueueStatus } from "~/types/NexusQueueStatus.ts";
import type {
  TeamRanking,
  TeamScheduleMatch,
  TeamScheduleResponse,
} from "~/types/TeamSchedule.ts";

const REFRESH_INTERVAL_ACTIVE_MS = 30_000;
const REFRESH_INTERVAL_IDLE_MS = 30_000;

function hasRed4(matches: TeamScheduleMatch[]): boolean {
  return matches.some((m) => m.red4 !== 0);
}

function hasBlue4(matches: TeamScheduleMatch[]): boolean {
  return matches.some((m) => m.blue4 !== 0);
}

function TeamCell({
  team,
  ownerTeam,
}: {
  team: number;
  ownerTeam: number;
}) {
  if (team === 0) return <td className="schedule-col-team"></td>;
  const isOwner = team === ownerTeam;
  return <td className="schedule-col-team" style={isOwner ? { fontWeight: 700 } : undefined}>{team}</td>;
}

function AllianceCell({
  match,
  ownerTeam,
}: {
  match: TeamScheduleMatch;
  ownerTeam: number;
}) {
  const info = getStationForTeam(match, ownerTeam);
  if (!info) return <td className="schedule-col-alliance"></td>;
  return (
    <td className={`schedule-col-alliance alliance-${info.alliance}-text`}>
      {info.alliance === "red" ? "Red" : "Blue"}{info.station}
    </td>
  );
}

function ScoreCell({ match }: { match: TeamScheduleMatch }) {
  if (match.winningAlliance === 0 || match.redScore === null || match.blueScore === null) {
    return <td></td>;
  }
  return (
    <td className="schedule-score-cell">
      <span className="alliance-red-text">{match.redScore}</span>
      {":"}
      <span className="alliance-blue-text">{match.blueScore}</span>
    </td>
  );
}

function getStationForTeam(
  match: TeamScheduleMatch,
  teamNumber: number,
): { alliance: "red" | "blue"; station: number } | null {
  if (match.red1 === teamNumber) return { alliance: "red", station: 1 };
  if (match.red2 === teamNumber) return { alliance: "red", station: 2 };
  if (match.red3 === teamNumber) return { alliance: "red", station: 3 };
  if (match.red4 === teamNumber) return { alliance: "red", station: 4 };
  if (match.blue1 === teamNumber) return { alliance: "blue", station: 1 };
  if (match.blue2 === teamNumber) return { alliance: "blue", station: 2 };
  if (match.blue3 === teamNumber) return { alliance: "blue", station: 3 };
  if (match.blue4 === teamNumber) return { alliance: "blue", station: 4 };
  return null;
}

function getAllianceForTeam(
  match: TeamScheduleMatch,
  teamNumber: number,
): "red" | "blue" | null {
  return getStationForTeam(match, teamNumber)?.alliance ?? null;
}

function RpCell({
  match,
  ownerTeam,
  isElimination,
}: {
  match: TeamScheduleMatch;
  ownerTeam: number;
  isElimination: boolean;
}) {
  if (match.winningAlliance === 0 || match.redScore === null || match.blueScore === null) {
    return <td></td>;
  }

  const alliance = getAllianceForTeam(match, ownerTeam);
  const won =
    alliance === "red" ? match.winningAlliance === 1 :
    alliance === "blue" ? match.winningAlliance === 2 :
    null;

  if (isElimination) {
    return <td className="schedule-score-cell">{won !== null ? (won ? "W" : "L") : ""}</td>;
  }

  const redRp = match.redRp ?? 0;
  const blueRp = match.blueRp ?? 0;
  return (
    <td className="schedule-score-cell">
      <span className="alliance-red-text">{redRp}</span>
      {":"}
      <span className="alliance-blue-text">{blueRp}</span>
      {won !== null && <> {won ? "W" : "L"}</>}
    </td>
  );
}

function formatMatchTime(time24: string | null): string {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, "0")} ${suffix}`;
}

function formatQueueTime(unixMs: number | null): string | null {
  if (unixMs == null) return null;
  const date = new Date(unixMs);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function QueueBanner({ queueStatus }: { queueStatus: NexusQueueStatus | null }) {
  if (!queueStatus || !queueStatus.teamStatus) return null;

  const allianceClass = queueStatus.teamAlliance
    ? `queue-alliance-${queueStatus.teamAlliance}`
    : "";
  const startTime = formatQueueTime(queueStatus.estimatedStartTime);
  const queueTime = formatQueueTime(queueStatus.estimatedQueueTime);

  const status = queueStatus.teamStatus;
  const stateClass = status === "On field"
    ? "banner-queue-onfield"
    : status === "On deck"
      ? "banner-queue-ondeck"
      : status === "Now queuing"
        ? "banner-queue-queuing"
        : "banner-queue-idle";

  return (
    <div className={`banner banner-queue ${stateClass}`}>
      <div className="queue-summary">
        {queueStatus.teamMatchLabel && (
          <span className={`queue-match-badge ${allianceClass}`}>
            {queueStatus.teamMatchLabel}
          </span>
        )}
        <span>{queueStatus.teamStatus}</span>
        {startTime && <span className="queue-time">est. {startTime}</span>}
      </div>
      {(queueStatus.nowQueuing || queueTime || (queueStatus.announcements && queueStatus.announcements.length > 0)) && (
        <div className="queue-details">
          {queueStatus.nowQueuing && (
            <><span className="queue-detail-label">Now queuing</span> {queueStatus.nowQueuing}</>
          )}
          {queueStatus.nowQueuing && (queueTime || startTime) && (
            <span className="queue-detail-sep">&middot;</span>
          )}
          {queueTime && (
            <><span className="queue-detail-label">Queue</span> {queueTime}</>
          )}
          {queueTime && startTime && (
            <span className="queue-detail-sep">&middot;</span>
          )}
          {startTime && (
            <><span className="queue-detail-label">Start</span> {startTime}</>
          )}
          {(queueStatus.announcements ?? []).map((a, i) => (
            <div key={i} className="queue-announcement">{a.content}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function useActiveTeamTournamentsFromApi() {
  const [list, setList] = useState<RBTournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    getActiveTeamTournaments()
      .then((data) => {
        if (isMounted) setList(data);
      })
      .catch((err) => console.error("Failed to load active tournaments", err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return { list, loading };
}

function ScheduleTable({
  label,
  level,
  matches,
  ownerTeam,
  showAll,
  hasData,
  tournamentId,
  onFetchSchedule,
  fetching,
  countdown,
  ownerRank,
  ownerRp,
  ownerRs,
  loggedIn,
  highlightMatch,
}: {
  label: string;
  level: string;
  matches: TeamScheduleMatch[];
  ownerTeam: number;
  showAll: boolean;
  hasData: boolean;
  tournamentId: string;
  onFetchSchedule: () => void;
  fetching: boolean;
  countdown: number;
  ownerRank?: number | null;
  ownerRp?: number | null;
  ownerRs?: number | null;
  loggedIn: boolean;
  highlightMatch?: number | null;
}) {
  const isElimination = level === "Playoff";
  const allLevelMatches = (matches ?? []).filter((m) => m.level === level);
  const levelMatches = showAll
    ? allLevelMatches
    : allLevelMatches.filter((m) => getAllianceForTeam(m, ownerTeam) !== null);
  const showRed4 = hasRed4(levelMatches);
  const showBlue4 = hasBlue4(levelMatches);
  return (
    <section className="card schedule-card">
      <h3>
        {label}
        {" "}<span className="schedule-countdown">refreshing in {countdown}s</span>
        {ownerRank != null && (
          <span className="schedule-rank">
            <span className="rank">Rank: {ownerRank}</span><span className="rp">RP: {ownerRp ?? 0}</span><span className="avg">RS: {ownerRs != null ? ownerRs.toFixed(2) : "—"}</span>
            <a href="#rankings" className="schedule-rank-more">Full Rankings</a>
          </span>
        )}
      </h3>
      {!hasData ? (
        loggedIn ? (
          <button onClick={onFetchSchedule} disabled={fetching}>
            {fetching ? "Fetching..." : "Fetch Schedule"}
          </button>
        ) : (
          <p>No {label.toLowerCase()} matches scheduled yet.</p>
        )
      ) : levelMatches.length === 0 ? (
        <p>No {label.toLowerCase()} matches scheduled.</p>
      ) : (
        <div className="schedule-table-wrapper">
          <p className="schedule-rotate-hint">Rotate device to see full details</p>
          <table className="schedule-table">
            <thead>
              <tr>
                <th></th>
                <th></th>
                <th className="schedule-col-alliance">Alliance</th>
                <th className="alliance-red-text schedule-col-team">R1</th>
                <th className="alliance-red-text schedule-col-team">R2</th>
                <th className="alliance-red-text schedule-col-team">R3</th>
                {showRed4 && <th className="alliance-red-text schedule-col-team">R4</th>}
                <th className="alliance-blue-text schedule-col-team">B1</th>
                <th className="alliance-blue-text schedule-col-team">B2</th>
                <th className="alliance-blue-text schedule-col-team">B3</th>
                {showBlue4 && <th className="alliance-blue-text schedule-col-team">B4</th>}
                <th>Score</th>
                <th>{isElimination ? "W / L" : "RP"}</th>
              </tr>
            </thead>
            <tbody>
              {levelMatches.map((m) => {
                const alliance = getAllianceForTeam(m, ownerTeam);
                const classes = [
                  alliance === "red" ? "schedule-row-our-red" : alliance === "blue" ? "schedule-row-our-blue" : "",
                  highlightMatch === m.match ? "schedule-row-highlight" : "",
                ].filter(Boolean).join(" ");
                return (
                  <tr key={`${m.level}-${m.match}`} className={classes}>
                    <td className="schedule-match-num">{m.match}</td>
                    <td className="schedule-time">
                      {formatMatchTime(m.startTime)}
                    </td>
                    <AllianceCell match={m} ownerTeam={ownerTeam} />
                    <TeamCell team={m.red1} ownerTeam={ownerTeam} />
                    <TeamCell team={m.red2} ownerTeam={ownerTeam} />
                    <TeamCell team={m.red3} ownerTeam={ownerTeam} />
                    {showRed4 && (
                      <TeamCell team={m.red4} ownerTeam={ownerTeam} />
                    )}
                    <TeamCell team={m.blue1} ownerTeam={ownerTeam} />
                    <TeamCell team={m.blue2} ownerTeam={ownerTeam} />
                    <TeamCell team={m.blue3} ownerTeam={ownerTeam} />
                    {showBlue4 && (
                      <TeamCell team={m.blue4} ownerTeam={ownerTeam} />
                    )}
                    <ScoreCell match={m} />
                    <RpCell match={m} ownerTeam={ownerTeam} isElimination={isElimination} />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RankingsTable({
  rankings,
  ownerTeam,
}: {
  rankings: TeamRanking[];
  ownerTeam: number;
}) {
  if (!rankings || rankings.length === 0) return null;

  return (
    <section id="rankings" className="card schedule-card">
      <h3>Rankings</h3>
      <div className="schedule-table-wrapper">
        <table className="schedule-table rankings-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team</th>
              <th className="rankings-col-name">Name</th>
              <th>RP</th>
              <th>RS</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((r, i) => (
              <tr
                key={r.teamNumber}
                className={r.teamNumber === ownerTeam ? "rankings-row-owner" : ""}
              >
                <td>{i + 1}</td>
                <td>{r.teamNumber}</td>
                <td className="rankings-col-name">{r.teamName}</td>
                <td>{r.rp}</td>
                <td>{r.rs.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function groupByWeek(tournaments: RBTournament[]): Map<number, RBTournament[]> {
  const groups = new Map<number, RBTournament[]>();
  for (const t of tournaments) {
    const list = groups.get(t.weekNumber) ?? [];
    list.push(t);
    groups.set(t.weekNumber, list);
  }
  return groups;
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function isCurrentWeek(tournaments: RBTournament[]): boolean {
  const now = Date.now();
  return tournaments.some((t) => {
    const start = new Date(t.startTime).getTime();
    const end = new Date(t.endTime).getTime();
    return start <= now && end >= now;
  });
}

function TournamentPicker({ onSelect, activeTournaments = [] }: { onSelect: (t: RBTournament) => void; activeTournaments?: RBTournament[] }) {
  const activeTournamentIds = activeTournaments.map((t) => t.id);
  const [tournaments, setTournaments] = useState<RBTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterInput, setFilterInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const filterRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getTournamentList()
      .then((all) => {
        const now = Date.now();
        const currentYear = new Date().getFullYear();
        setTournaments(
          all
            .filter((t) => t.season === currentYear)
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
        );
      })
      .catch((e) => console.error("Failed to load tournaments", e))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && filterRef.current) {
      filterRef.current.focus();
    }
  }, [loading]);

  const filterLower = filterInput.toLowerCase();
  const filteredTournaments = filterInput
    ? tournaments.filter(
        (t) =>
          t.name.toLowerCase().includes(filterLower) ||
          t.id.toLowerCase().includes(filterLower),
      )
    : tournaments;

  const suggestions = filterInput ? filteredTournaments.slice(0, 8) : [];

  const weekGroups = groupByWeek(filteredTournaments);

  return (
    <main>
      <div className="page-header schedule-header">
        <h1>Tournament Report</h1>
        <p><a href="#" onClick={(e) => { e.preventDefault(); window.history.back(); }}>&larr; Back</a></p>
      </div>
      <p>Select a tournament to view its schedule.</p>
      {!loading && activeTournaments.length > 0 && !filterInput && (
        <section className="card">
          {activeTournaments.map((t) => (
            <div key={t.id} className="tournament-row">
              <button
                className="tournament-btn"
                onClick={() => onSelect(t)}
              >
                {t.id.slice(String(t.season).length)}
              </button>
              <div className="tournament-info">
                <span className="tournament-name">{t.name} (active)</span>
                <span className="tournament-date">
                  {formatDate(t.startTime)} – {formatDate(t.endTime)}
                </span>
              </div>
            </div>
          ))}
        </section>
      )}
      {loading && <Spinner />}
      {!loading && tournaments.length === 0 && <p>No tournaments available.</p>}
      {!loading && tournaments.length > 0 && (
        <section className="card">
          <div className="typeahead">
            <input
              ref={filterRef}
              className="form-field"
              type="text"
              placeholder="Filter by name or code..."
              value={filterInput}
              onChange={(e) => {
                setFilterInput(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && suggestions.length === 1) {
                  setShowSuggestions(false);
                  onSelect(suggestions[0]);
                }
              }}
            />
            {showSuggestions && filterInput && suggestions.length > 0 && (
              <ul className="typeahead-suggestions">
                {suggestions.map((t) => (
                  <li key={t.id}>
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setShowSuggestions(false);
                        onSelect(t);
                      }}
                    >
                      {t.id.slice(String(t.season).length)} — {t.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {[...weekGroups.entries()].map(([weekNum, weekTournaments]) => {
            const firstStart = weekTournaments[0].startTime;
            const lastEnd = weekTournaments[weekTournaments.length - 1].endTime;
            const weekLabel = `Week ${weekNum} — ${formatDate(firstStart)} – ${formatDate(lastEnd)}`;
            return (
              <details
                key={weekNum}
                className="tournament-week-group"
                open={isCurrentWeek(weekTournaments)}
              >
                <summary>{weekLabel}</summary>
                {weekTournaments.map((t) => (
                  <div key={t.id} className="tournament-row">
                    <button
                      className="tournament-btn"
                      onClick={() => onSelect(t)}
                    >
                      {t.id.slice(String(t.season).length)}
                    </button>
                    <div className="tournament-info">
                      <span className="tournament-name">{t.name}{activeTournamentIds.includes(t.id) ? " (active)" : ""}</span>
                      <span className="tournament-date">
                        {formatDate(t.startTime)} – {formatDate(t.endTime)}
                      </span>
                    </div>
                  </div>
                ))}
              </details>
            );
          })}
        </section>
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Playoff bracket + alliance components for schedule page
// ---------------------------------------------------------------------------

function ScheduleAllianceList({
  alliances,
  ownerTeam,
  rankings,
}: {
  alliances: Alliance[];
  ownerTeam: number;
  rankings: TeamRanking[];
}) {
  const rankByTeam = new Map<number, number>();
  rankings.forEach((r, i) => rankByTeam.set(r.teamNumber, i + 1));

  return (
    <div className="schedule-alliance-list">
      <h3>Alliances</h3>
      <div className="schedule-alliance-grid">
      {alliances.map((a) => (
        <div
          key={a.seed}
          className={[
            "schedule-alliance-card",
            a.isOwner ? "schedule-alliance-owner" : "",
            a.eliminated ? "schedule-alliance-eliminated" : "",
          ].filter(Boolean).join(" ")}
        >
          <span className="schedule-alliance-seed">{a.seed}</span>
          <span className="schedule-alliance-teams">
            {a.teams.map((t) => (
              <span
                key={t}
                className={[
                  t === ownerTeam ? "schedule-alliance-owner-team" : "",
                  t === a.captain ? "schedule-alliance-captain" : "",
                ].filter(Boolean).join(" ")}
              >
                {t}
                {rankByTeam.has(t) && (
                  <span className="schedule-alliance-rank">({rankByTeam.get(t)})</span>
                )}
              </span>
            ))}
          </span>
        </div>
      ))}
      </div>
    </div>
  );
}

// SVG bracket for schedule page — reuses layout constants from kiosk
const SCH_FONT = "-apple-system, system-ui, sans-serif";
const SCH_BOX_W = 140;
const SCH_BOX_H = 36;
const SCH_HALF = SCH_BOX_H / 2;
const SCH_COL = SCH_BOX_W + 45;
const SCH_PAD = 20;
const SCH_LB_TOP = 210;
const SCH_FINALS_X = SCH_COL * 4 + 35;

const SCH_POSITIONS: Record<number, { x: number; y: number }> = {
  1: { x: SCH_PAD, y: 10 }, 2: { x: SCH_PAD, y: 55 },
  3: { x: SCH_PAD, y: 100 }, 4: { x: SCH_PAD, y: 145 },
  7: { x: SCH_PAD + SCH_COL, y: 32 }, 8: { x: SCH_PAD + SCH_COL, y: 122 },
  11: { x: SCH_PAD + SCH_COL * 2, y: 77 },
  5: { x: SCH_PAD, y: SCH_LB_TOP }, 6: { x: SCH_PAD, y: SCH_LB_TOP + 45 },
  9: { x: SCH_PAD + SCH_COL, y: SCH_LB_TOP }, 10: { x: SCH_PAD + SCH_COL, y: SCH_LB_TOP + 45 },
  12: { x: SCH_PAD + SCH_COL * 2, y: SCH_LB_TOP + 22 },
  13: { x: SCH_PAD + SCH_COL * 3, y: SCH_LB_TOP + 22 },
  14: { x: SCH_PAD + SCH_FINALS_X, y: 130 },
  15: { x: SCH_PAD + SCH_FINALS_X, y: 170 },
  16: { x: SCH_PAD + SCH_FINALS_X, y: 210 },
};

function ScheduleBracketSvg({
  resolvedMatches,
  ownerTeam,
  alliances,
}: {
  resolvedMatches: ResolvedMatch[];
  ownerTeam: number;
  alliances: Alliance[];
}) {
  const captains = new Set(alliances.map((a) => a.captain).filter(Boolean) as number[]);
  const ownerSeedNum = (() => {
    for (const rm of resolvedMatches) {
      if (rm.redTeams.includes(ownerTeam)) return rm.redSeed;
      if (rm.blueTeams.includes(ownerTeam)) return rm.blueSeed;
    }
    return null;
  })();

  function srcLabel(source: { type: string; seed?: number; match?: number }): string {
    if (source.type === "seed") return `Alliance ${source.seed}`;
    if (source.type === "winner") return `W ${BRACKET_8.find((s) => s.match === source.match)?.label ?? ""}`;
    if (source.type === "loser") return `L ${BRACKET_8.find((s) => s.match === source.match)?.label ?? ""}`;
    return "TBD";
  }

  // Build connectors
  const paths: string[] = [];
  for (const rm of resolvedMatches) {
    const toPos = SCH_POSITIONS[rm.slot.match];
    if (!toPos) continue;
    for (const [i, source] of [rm.slot.redSource, rm.slot.blueSource].entries()) {
      if (source.type === "seed") continue;
      const fromPos = SCH_POSITIONS[source.match];
      if (!fromPos) continue;
      const fromX = fromPos.x + SCH_BOX_W;
      const fromY = fromPos.y + SCH_HALF;
      const toX = toPos.x;
      const toY = toPos.y + (i === 0 ? SCH_HALF * 0.5 : SCH_HALF * 1.5);
      const midX = (fromX + toX) / 2;
      paths.push(`M${fromX},${fromY} H${midX} V${toY} H${toX}`);
    }
  }

  const svgW = SCH_PAD + SCH_FINALS_X + SCH_BOX_W + 10;
  const svgH = SCH_LB_TOP + 95;

  function renderHalf(
    x: number, y: number, teams: number[], seed: number | null,
    score: number | null, isWinner: boolean, isLoser: boolean, isTop: boolean,
    source: { type: string; seed?: number; match?: number },
  ) {
    const isOwner = seed === ownerSeedNum;
    const halfY = isTop ? y : y + SCH_HALF;
    const bgFill = isWinner ? "var(--color-bg-tertiary)" : "var(--color-bg-secondary)";
    const textFill = isLoser ? "var(--color-text-tertiary)" : isOwner ? "var(--runnymede-red)" : "var(--color-text-primary)";
    const weight = isWinner ? "bold" : "normal";
    const seedStr = seed != null ? String(seed) : "?";
    const scoreStr = score != null ? String(score) : "";
    const hasTeams = teams.length > 0;

    return (
      <g>
        <rect x={x} y={halfY} width={SCH_BOX_W} height={SCH_HALF} fill={bgFill} rx={isTop ? 3 : 0} />
        {!isTop && <rect x={x} y={halfY} width={SCH_BOX_W} height={SCH_HALF} fill={bgFill} rx={3} />}
        <rect x={x + 1} y={halfY + 1} width={16} height={SCH_HALF - 2} fill={isOwner ? "rgba(255,56,32,0.15)" : "rgba(128,128,128,0.1)"} rx={2} />
        <text x={x + 9} y={halfY + SCH_HALF / 2 + 4} fill={isOwner ? "var(--runnymede-red)" : "var(--color-text-tertiary)"} fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily={SCH_FONT}>{seedStr}</text>
        <text x={x + 20} y={halfY + SCH_HALF / 2 + 4} fill={textFill} fontSize="9" fontWeight={weight} fontFamily={SCH_FONT}>
          {hasTeams
            ? teams.map((t, ti) => (
                <tspan key={t} fontWeight={captains.has(t) ? "bold" : weight}>{ti > 0 ? "  " : ""}{t}</tspan>
              ))
            : srcLabel(source)}
        </text>
        {scoreStr && (
          <text x={x + SCH_BOX_W - 4} y={halfY + SCH_HALF / 2 + 4} fill={textFill} fontSize="10" fontWeight={weight} textAnchor="end" fontFamily={SCH_FONT}>{scoreStr}</text>
        )}
        {isWinner && <rect x={x + SCH_BOX_W - 3} y={halfY + 2} width={3} height={SCH_HALF - 4} fill="var(--color-success)" rx={1} />}
      </g>
    );
  }

  function renderMatch(rm: ResolvedMatch) {
    const pos = SCH_POSITIONS[rm.slot.match];
    if (!pos) return null;
    const { x, y } = pos;
    const isLive = rm.matchData != null && rm.winner === null;
    return (
      <g key={rm.slot.match}>
        <rect x={x} y={y} width={SCH_BOX_W} height={SCH_BOX_H} fill="none" rx={3} stroke={isLive ? "var(--color-warning)" : "var(--color-bg-tertiary)"} strokeWidth={isLive ? 2 : 1} />
        <text x={x - 3} y={y + SCH_BOX_H / 2 + 3} fill="var(--color-text-tertiary)" fontSize="7" textAnchor="end" fontFamily={SCH_FONT}>{rm.slot.label}</text>
        {renderHalf(x, y, rm.redTeams, rm.redSeed, rm.redScore, rm.winner === "red", rm.winner === "blue", true, rm.slot.redSource)}
        <line x1={x} y1={y + SCH_HALF} x2={x + SCH_BOX_W} y2={y + SCH_HALF} stroke="var(--color-bg-tertiary)" strokeWidth={0.5} />
        {renderHalf(x, y, rm.blueTeams, rm.blueSeed, rm.blueScore, rm.winner === "blue", rm.winner === "red", false, rm.slot.blueSource)}
      </g>
    );
  }

  return (
    <svg viewBox={`0 -15 ${svgW} ${svgH + 15}`} preserveAspectRatio="xMidYMid meet" width="100%" style={{ maxHeight: "400px" }}>
      <text x={SCH_PAD} y={3} fill="var(--color-text-tertiary)" fontSize="8" fontWeight="bold" fontFamily={SCH_FONT} letterSpacing="0.5">UPPER BRACKET</text>
      <text x={SCH_PAD} y={SCH_LB_TOP - 7} fill="var(--color-text-tertiary)" fontSize="8" fontWeight="bold" fontFamily={SCH_FONT} letterSpacing="0.5">LOWER BRACKET</text>
      <text x={SCH_PAD + SCH_FINALS_X} y={125} fill="var(--color-text-tertiary)" fontSize="8" fontWeight="bold" fontFamily={SCH_FONT} letterSpacing="0.5">FINALS</text>
      <line x1={SCH_PAD} y1={SCH_LB_TOP - 12} x2={SCH_PAD + SCH_FINALS_X - 10} y2={SCH_LB_TOP - 12} stroke="var(--color-bg-tertiary)" strokeWidth={1} />
      {paths.map((d, i) => <path key={i} d={d} fill="none" stroke="var(--color-bg-tertiary)" strokeWidth={1} />)}
      {resolvedMatches.map((rm) => renderMatch(rm))}
    </svg>
  );
}

const TeamScheduleContent = ({ autoSelect = false }: { autoSelect?: boolean }) => {
  const { list: activeTournaments, loading: tournamentsLoading } =
    useActiveTeamTournamentsFromApi();
  const { loggedIn } = useLoginStatus();
  const [schedule, setSchedule] = useState<TeamScheduleResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAll, setShowAll] = useState(true);
  const [showAllInitialized, setShowAllInitialized] = useState(false);
  const [queueStatus, setQueueStatus] = useState<NexusQueueStatus | null>(null);
  const [countdown, setCountdown] = useState(60);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [manualTournament, setManualTournament] = useState<RBTournament | null>(null);
  const autoSelectedRef = useRef(false);

  // Auto-select first active tournament when using /schedule/active
  useEffect(() => {
    if (autoSelect && !autoSelectedRef.current && !tournamentsLoading && activeTournaments.length > 0) {
      autoSelectedRef.current = true;
      setManualTournament(activeTournaments[0]);
    }
  }, [autoSelect, tournamentsLoading, activeTournaments]);
  const loggedInRef = useRef(loggedIn);
  const showAllInitializedRef = useRef(showAllInitialized);

  const selectedTournament = manualTournament;
  const selectedTournamentId = selectedTournament?.id ?? null;

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (manualTournament) {
      setManualTournament(null);
      setSchedule(null);
      setError(null);
      setShowAllInitialized(false);
    } else {
      window.history.back();
    }
  };
  const matches = schedule?.matches ?? [];

  const hasScored = matches.some((m) => m.winningAlliance !== 0);
  const hasUnscored = matches.some((m) => m.winningAlliance === 0);
  const isActive = hasScored && hasUnscored;
  const refreshInterval = isActive
    ? REFRESH_INTERVAL_ACTIVE_MS
    : REFRESH_INTERVAL_IDLE_MS;
  const countdownStart = refreshInterval / 1000;

  useEffect(() => { loggedInRef.current = loggedIn; }, [loggedIn]);
  useEffect(() => { showAllInitializedRef.current = showAllInitialized; }, [showAllInitialized]);

  const loadSchedule = useCallback(
    async (tournamentId: string, isRefresh: boolean) => {
      if (isRefresh) setRefreshing(true);
      try {
        const data = await getTeamSchedulePublic(tournamentId);
        setSchedule(data);
        setError(null);
        const ownerInMatches = (data.matches ?? []).some(
          (m) => getAllianceForTeam(m, data.teamNumber) !== null,
        );
        if (!showAllInitializedRef.current && (data.matches ?? []).length > 0) {
          setShowAll(!ownerInMatches);
          setShowAllInitialized(true);
          showAllInitializedRef.current = true;
        }
        if (ownerInMatches) {
          getNexusQueueStatus(tournamentId).then(setQueueStatus);
        } else {
          setQueueStatus(null);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load schedule");
      } finally {
        if (isRefresh) setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!selectedTournamentId) return;
    setShowAllInitialized(false);
    showAllInitializedRef.current = false;
    setShowAll(true);
    setLoading(true);
    loadSchedule(selectedTournamentId, false).finally(() => setLoading(false));

    setCountdown(countdownStart);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? countdownStart : prev - 1));
    }, 1000);

    intervalRef.current = setInterval(() => {
      setCountdown(countdownStart);
      loadSchedule(selectedTournamentId, true);
    }, refreshInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [selectedTournamentId, loadSchedule, refreshInterval, countdownStart]);

  const handleFetchSchedule = async () => {
    if (!selectedTournamentId) return;
    setFetching(true);
    try {
      await fetchTournamentSchedule(selectedTournamentId);
      await loadSchedule(selectedTournamentId, false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to fetch schedule from FRC",
      );
    } finally {
      setFetching(false);
    }
  };

  const ownerRankEntry = schedule?.rankings?.find(
    (r) => r.teamNumber === schedule.teamNumber,
  );
  const ownerRank = ownerRankEntry
    ? schedule!.rankings.indexOf(ownerRankEntry) + 1
    : null;
  const ownerRp = ownerRankEntry?.rp ?? null;
  const ownerRs = ownerRankEntry?.rs ?? null;

  // Order schedule sections so the current phase appears first.
  // Rotate forward each time the last match in a phase is scored.
  const allSections = [
    { label: "Practice", level: "Practice" as const, hasData: schedule?.hasPractice ?? false },
    { label: "Qualification", level: "Qualification" as const, hasData: schedule?.hasQualification ?? false },
    { label: "Elimination", level: "Playoff" as const, hasData: schedule?.hasPlayoff ?? false },
  ];
  const isLastMatchScored = (level: string) => {
    const phaseMatches = matches.filter((m) => m.level === level);
    if (phaseMatches.length === 0) return false;
    const lastMatch = phaseMatches.reduce((a, b) => (b.match > a.match ? b : a));
    return lastMatch.winningAlliance !== 0;
  };
  const isQualQueuing = queueStatus?.nowQueuing?.startsWith("Qualification") ?? false;
  // Practice may never be scored — move past it when quals start queueing or are scored
  const practiceOver = isLastMatchScored("Practice") || isQualQueuing || isLastMatchScored("Qualification");
  const currentIndex =
    !practiceOver ? 0
    : !isLastMatchScored("Qualification") ? 1
    : !isLastMatchScored("Playoff") ? 2
    : 0;
  const scheduleSections = [
    ...allSections.slice(currentIndex),
    ...allSections.slice(0, currentIndex),
  ];

  // Determine which match to highlight per level.
  // showAll → highlight the match currently being queued (from nexus).
  // owner-only → highlight the owner's next unplayed match.
  const highlightByLevel: Record<string, number | null> = {};
  if (schedule) {
    for (const section of allSections) {
      const levelMatches = (schedule.matches ?? []).filter(
        (m) => m.level === section.level,
      );
      if (showAll) {
        // Highlight the next unplayed match for any team
        const nextUnplayed = levelMatches.find(
          (m) => m.redScore == null && m.blueScore == null,
        );
        highlightByLevel[section.level] = nextUnplayed?.match ?? null;
      } else {
        const nextOwner = levelMatches.find(
          (m) =>
            getAllianceForTeam(m, schedule.teamNumber) !== null &&
            m.redScore == null &&
            m.blueScore == null,
        );
        highlightByLevel[section.level] = nextOwner?.match ?? null;
      }
    }
  }

  // Playoff bracket data
  const playoffMatches = matches.filter((m) => m.level === "Playoff");
  const hasPlayoffBracket = schedule?.hasPlayoff === true && playoffMatches.length >= 4;
  const playoffAlliances = hasPlayoffBracket
    ? deriveAlliances(playoffMatches, schedule!.teamNumber, schedule!.rankings)
    : [];
  const playoffResolved = hasPlayoffBracket ? resolveBracket(playoffMatches) : [];

  // Livestream links — only show for active tournaments
  const isActiveTournament = activeTournaments.some(
    (t) => t.id === selectedTournamentId,
  );
  const webcastUrls: string[] = (() => {
    if (!isActiveTournament || !selectedTournament) return [];
    const raw = selectedTournament.webcasts;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string" && raw.length > 0) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* ignore */ }
    }
    return [];
  })();

  const title = schedule?.tournamentName || "Tournament Report";

  if (tournamentsLoading) {
    return (
      <main>
        <div className="page-header schedule-header">
          <h1>{title}</h1>
          <p><a href="#" onClick={handleBack}>&larr; Back</a></p>
        </div>
        <Spinner />
      </main>
    );
  }

  if (!selectedTournament) {
    return <TournamentPicker onSelect={(t) => setManualTournament(t)} activeTournaments={activeTournaments} />;
  }

  if ((loading || !schedule) && !schedule) {
    return (
      <main>
        <div className="page-header schedule-header">
          <h1>{title}</h1>
          <p><a href="#" onClick={handleBack}>&larr; Back</a></p>
        </div>
        <Spinner />
      </main>
    );
  }

  if (error && !schedule) {
    return (
      <main>
        <div className="page-header schedule-header">
          <h1>{title}</h1>
          <p><a href="#" onClick={handleBack}>&larr; Back</a></p>
        </div>
        <p className="banner banner-warning">{error}</p>
      </main>
    );
  }

  if (!schedule) {
    return (
      <main>
        <div className="page-header schedule-header">
          <h1>{title}</h1>
          <p><a href="#" onClick={handleBack}>&larr; Back</a></p>
        </div>
        <Spinner />
      </main>
    );
  }

  if ((schedule.matches ?? []).length === 0 && !schedule.hasPractice && !schedule.hasQualification && !schedule.hasPlayoff) {
    return (
      <main>
        <div className="page-header schedule-header">
          <h1>{title}</h1>
          <p><a href="#" onClick={handleBack}>&larr; Back</a></p>
        </div>
        <section className="card">
          <p>Schedule data is being loaded for this tournament. It will appear here automatically within a few minutes.</p>
          <p className="schedule-countdown">Checking again in {countdown}s</p>
        </section>
      </main>
    );
  }

  return (
    <main>
      <div className="page-header schedule-header">
        <h1>
          {title}
          {refreshing && <span className="schedule-refresh-indicator"><Spinner /></span>}
        </h1>
        <p className="schedule-nav-row">
          <a href="#" onClick={handleBack}>&larr; Back</a>
          <button
            className="schedule-toggle-btn"
            onClick={() => setShowAll((prev) => !prev)}
          >
            {showAll ? `${schedule.teamNumber} Only` : "All Teams"}
          </button>
        </p>
      </div>
      <QueueBanner queueStatus={queueStatus} />
      {webcastUrls.length > 0 && (
        <div className="schedule-livestream-links">
          {webcastUrls.map((url, i) => {
            const isYt = /youtube\.com|youtu\.be/.test(url);
            const isTw = /twitch\.tv/.test(url);
            const label = isYt ? `YouTube${webcastUrls.filter(u => /youtube|youtu/.test(u)).length > 1 ? ` ${i + 1}` : ""}` : isTw ? "Twitch" : `Stream ${i + 1}`;
            return (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="schedule-livestream-link">
                {label} &#x2197;
              </a>
            );
          })}
        </div>
      )}
      {scheduleSections.map((section) =>
        section.level === "Qualification" ? (
          <ScheduleTable
            key={section.level}
            label={section.label}
            level={section.level}
            matches={schedule.matches}
            ownerTeam={schedule.teamNumber}
            showAll={showAll}
            hasData={section.hasData}
            tournamentId={schedule.tournamentId}
            onFetchSchedule={handleFetchSchedule}
            fetching={fetching}
            countdown={countdown}
            ownerRank={ownerRank}
            ownerRp={ownerRp}
            ownerRs={ownerRs}
            loggedIn={loggedIn}
            highlightMatch={highlightByLevel[section.level]}
          />
        ) : section.level === "Playoff" && hasPlayoffBracket ? (
          <div key={section.level}>
            <section className="card schedule-bracket-section">
              <ScheduleAllianceList
                alliances={playoffAlliances}
                ownerTeam={schedule.teamNumber}
                rankings={schedule.rankings}
              />
              <ScheduleBracketSvg
                resolvedMatches={playoffResolved}
                ownerTeam={schedule.teamNumber}
                alliances={playoffAlliances}
              />
            </section>
            <ScheduleTable
              label={section.label}
              level={section.level}
              matches={schedule.matches}
              ownerTeam={schedule.teamNumber}
              showAll={showAll}
              hasData={section.hasData}
              tournamentId={schedule.tournamentId}
              onFetchSchedule={handleFetchSchedule}
              fetching={fetching}
              countdown={countdown}
              loggedIn={loggedIn}
              highlightMatch={highlightByLevel[section.level]}
            />
          </div>
        ) : (
          <ScheduleTable
            key={section.level}
            label={section.label}
            level={section.level}
            matches={schedule.matches}
            ownerTeam={schedule.teamNumber}
            showAll={showAll}
            hasData={section.hasData}
            tournamentId={schedule.tournamentId}
            onFetchSchedule={handleFetchSchedule}
            fetching={fetching}
            countdown={countdown}
            loggedIn={loggedIn}
            highlightMatch={highlightByLevel[section.level]}
          />
        ),
      )}
      <RankingsTable
        rankings={schedule.rankings}
        ownerTeam={schedule.teamNumber}
      />
      {queueStatus && queueStatus.teamStatus && (
        <p style={{ textAlign: "center", fontSize: "0.75rem", marginTop: "1rem" }}>
          Queueing data from{" "}
          <a href="https://frc.nexus" target="_blank" rel="noopener noreferrer">
            frc.nexus
          </a>
        </p>
      )}
    </main>
  );
};

const TeamSchedulePage = () => {
  return <TeamScheduleContent />;
};

export const TeamScheduleActivePage = () => {
  return <TeamScheduleContent autoSelect />;
};

export default TeamSchedulePage;
