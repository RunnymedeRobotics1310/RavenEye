import { useCallback, useEffect, useRef, useState } from "react";
import {
  getActiveTeamTournaments,
  getTeamSchedulePublic,
  getNexusQueueStatus,
} from "~/common/storage/rb.ts";
import type { RBTournament } from "~/types/RBTournament.ts";
import type {
  TeamScheduleResponse,
  TeamScheduleMatch,
  TeamRanking,
} from "~/types/TeamSchedule.ts";
import type { NexusQueueStatus } from "~/types/NexusQueueStatus.ts";
import logoUrl from "~/assets/images/logo.png";
import Title from "~/common/icons/Title.tsx";
import Spinner from "~/common/Spinner.tsx";
import {
  BRACKET_8,
  deriveAlliances,
  resolveBracket,
  type Alliance,
  type ResolvedMatch,
} from "~/common/bracket.ts";

const REFRESH_MS = 15_000;
const SCROLL_PX_PER_SEC = 18;

function AutoScrollViewport({
  children,
  deps,
}: {
  children: React.ReactNode;
  deps: unknown[];
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    const viewport = viewportRef.current;
    const inner = innerRef.current;
    if (!viewport || !inner) return;
    const overflow = inner.scrollHeight - viewport.clientHeight;
    if (overflow > 0) {
      const duration = (inner.scrollHeight * 2) / SCROLL_PX_PER_SEC;
      setStyle({
        "--scroll-duration": `${duration}s`,
        "--scroll-distance": `${-overflow}px`,
      } as React.CSSProperties);
    } else {
      setStyle({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return (
    <div ref={viewportRef} style={{ flex: 1, overflow: "hidden" }}>
      <div ref={innerRef} className="kiosk-scroll-inner" style={style}>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAllianceForTeam(
  match: TeamScheduleMatch,
  teamNumber: number,
): "red" | "blue" | null {
  if (
    match.red1 === teamNumber ||
    match.red2 === teamNumber ||
    match.red3 === teamNumber ||
    match.red4 === teamNumber
  )
    return "red";
  if (
    match.blue1 === teamNumber ||
    match.blue2 === teamNumber ||
    match.blue3 === teamNumber ||
    match.blue4 === teamNumber
  )
    return "blue";
  return null;
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

type WebcastProvider = "youtube" | "twitch" | "unknown";

interface ParsedWebcast {
  provider: WebcastProvider;
  embedUrl: string;
  label: string;
}

function parseWebcast(url: string): ParsedWebcast {
  // YouTube
  const ytMatch =
    url.match(/youtube\.com\/watch\?v=([^&]+)/) ||
    url.match(/youtu\.be\/([^?]+)/) ||
    url.match(/youtube\.com\/live\/([^?]+)/);
  if (ytMatch) {
    return {
      provider: "youtube",
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&rel=0&enablejsapi=1`,
      label: "YouTube",
    };
  }
  // Twitch
  const twMatch = url.match(/twitch\.tv\/([^/?]+)/);
  if (twMatch) {
    return {
      provider: "twitch",
      embedUrl: `https://player.twitch.tv/?channel=${twMatch[1]}&parent=${window.location.hostname}&muted=true`,
      label: "Twitch",
    };
  }
  return { provider: "unknown", embedUrl: url, label: "Stream" };
}


// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TopBar({
  queueStatus,
  webcasts,
  activeWebcast,
  onSelectWebcast,
}: {
  queueStatus: NexusQueueStatus | null;
  webcasts: ParsedWebcast[];
  activeWebcast: number;
  onSelectWebcast: (i: number) => void;
}) {
  const startTime = formatQueueTime(queueStatus?.estimatedStartTime ?? null);
  const queueTime = formatQueueTime(queueStatus?.estimatedQueueTime ?? null);

  const status = queueStatus?.teamStatus ?? null;
  const barClass = status === "On field"
    ? "kiosk-bar-onfield"
    : status === "On deck"
      ? "kiosk-bar-ondeck"
      : status === "Now queuing"
        ? "kiosk-bar-queuing"
        : status === "Queuing soon"
          ? "kiosk-bar-soon"
          : "kiosk-bar-idle";

  return (
    <div className={`kiosk-top-bar ${barClass}`}>
      <a href="/report/schedule/active" className="kiosk-brand">
        <img src={logoUrl} alt="" className="kiosk-logo" />
        <Title />
      </a>
      <div className="kiosk-queue-status">
        {queueStatus?.teamStatus && (
          <>
            {queueStatus.teamMatchLabel && (
              <span
                className={`kiosk-queue-badge ${queueStatus.teamAlliance ? `queue-alliance-${queueStatus.teamAlliance}` : ""}`}
              >
                {queueStatus.teamMatchLabel}
              </span>
            )}
            <span>{queueStatus.teamStatus}</span>
            {queueStatus.nowQueuing && (
              <>
                <span className="kiosk-queue-sep">&middot;</span>
                <span className="kiosk-queue-dim">Queuing</span>{" "}
                {queueStatus.nowQueuing}
              </>
            )}
            {queueTime && (
              <>
                <span className="kiosk-queue-sep">&middot;</span>
                <span className="kiosk-queue-dim">Queue</span> {queueTime}
              </>
            )}
            {startTime && (
              <>
                <span className="kiosk-queue-sep">&middot;</span>
                <span className="kiosk-queue-dim">Start</span> {startTime}
              </>
            )}
          </>
        )}
      </div>
      <div className="kiosk-stream-tabs">
        {webcasts.length > 1 &&
          webcasts.map((w, i) => (
            <button
              key={i}
              className={`kiosk-stream-tab ${i === activeWebcast ? "active" : ""}`}
              onClick={() => onSelectWebcast(i)}
            >
              {w.label}
            </button>
          ))}
      </div>
    </div>
  );
}

function OwnerScoresPanel({
  matches,
  ownerTeam,
  countdown,
}: {
  matches: TeamScheduleMatch[];
  ownerTeam: number;
  countdown: number;
}) {
  const ownerMatches = matches.filter(
    (m) => getAllianceForTeam(m, ownerTeam) !== null,
  );
  // Show scored matches, oldest first
  const scored = ownerMatches
    .filter((m) => m.winningAlliance !== 0)
    .sort((a, b) => a.match - b.match);

  return (
    <div className="kiosk-owner-scores">
      <h2 className="kiosk-section-title">
        1310 Scores
        {scored.length > 0 && (() => {
          let wins = 0;
          let losses = 0;
          for (const m of scored) {
            const a = getAllianceForTeam(m, ownerTeam)!;
            const w = (a === "red" && m.winningAlliance === 1) || (a === "blue" && m.winningAlliance === 2);
            if (w) wins++; else losses++;
          }
          return (
            <span className="kiosk-wl-tally">{wins}W  {losses}L</span>
          );
        })()}
        <span className="kiosk-countdown">{countdown}s</span>
      </h2>
      <div>
        <table className="kiosk-owner-scores-table">
          <thead>
            <tr>
              <th>Match</th>
              <th>Score</th>
              <th>W/L</th>
            </tr>
          </thead>
          <tbody>
            {scored.length === 0 && (
              <tr>
                <td colSpan={3} className="kiosk-owner-scores-empty">
                  No scores yet
                </td>
              </tr>
            )}
            {scored.map((m) => {
              const alliance = getAllianceForTeam(m, ownerTeam)!;
              const won =
                (alliance === "red" && m.winningAlliance === 1) ||
                (alliance === "blue" && m.winningAlliance === 2);
              const rp = alliance === "red" ? m.redRp : m.blueRp;
              return (
                <tr key={`${m.level}-${m.match}`}>
                  <td className={`kiosk-match-num ${alliance === "red" ? "kiosk-score-red" : "kiosk-score-blue"}`}>{levelPrefix(m.level)}{m.match}</td>
                  <td>
                  <span className={"kiosk-score-red"}>{m.redScore}</span>-
                    <span className="kiosk-score-blue">{m.blueScore}</span>
                  </td>
                  <td>
                    {won ? "W" : "L"}{rp != null ? rp : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RankingsPanel({
  rankings,
  ownerTeam,
}: {
  rankings: TeamRanking[];
  ownerTeam: number;
}) {
  return (
    <div className="kiosk-rankings">
      <table className="kiosk-rankings-table kiosk-rankings-header">
        <colgroup>
          <col style={{ width: "30%" }} />
          <col style={{ width: "40%" }} />
          <col style={{ width: "30%" }} />
        </colgroup>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Team</th>
            <th>RP</th>
          </tr>
        </thead>
      </table>
      <AutoScrollViewport deps={[rankings.length]}>
        <table className="kiosk-rankings-table">
          <colgroup>
            <col style={{ width: "30%" }} />
            <col style={{ width: "40%" }} />
            <col style={{ width: "30%" }} />
          </colgroup>
          <tbody>
            {rankings.map((r, idx) => (
              <tr
                key={r.teamNumber}
                className={
                  r.teamNumber === ownerTeam ? "kiosk-rank-owner" : ""
                }
              >
                <td>{idx + 1}</td>
                <td>{r.teamNumber}</td>
                <td>{r.rp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </AutoScrollViewport>
    </div>
  );
}

function VideoEmbed({ webcast }: { webcast: ParsedWebcast | null }) {
  if (!webcast) return null;
  return (
    <div className="kiosk-video-wrapper">
      <iframe
        src={webcast.embedUrl}
        title="Livestream"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

function levelPrefix(level: string): string {
  if (level === "Practice") return "P";
  if (level === "Qualification") return "Q";
  if (level === "Playoff") return "E";
  return "";
}

function SchedulePanel({
  matches,
  ownerTeam,
  highlightMatch,
  rankings,
}: {
  matches: TeamScheduleMatch[];
  ownerTeam: number;
  highlightMatch: number | null;
  rankings: TeamRanking[];
}) {
  const rankByTeam = new Map<number, number>();
  rankings.forEach((r, i) => rankByTeam.set(r.teamNumber, i + 1));

  const hasQuals = matches.some((m) => m.level === "Qualification");
  const allOwner = matches.filter(
    (m) =>
      getAllianceForTeam(m, ownerTeam) !== null &&
      !(hasQuals && m.level === "Practice"),
  );
  const upcoming = allOwner.filter((m) => m.winningAlliance === 0);
  const completed = allOwner
    .filter((m) => m.winningAlliance !== 0)
    .sort((a, b) => b.match - a.match);

  const viewportRef = useRef<HTMLDivElement>(null);
  const highlightRowRef = useRef<HTMLTableRowElement>(null);

  // Scroll so the next match is at the top of the viewport
  useEffect(() => {
    if (highlightRowRef.current && viewportRef.current) {
      const rowTop = highlightRowRef.current.offsetTop;
      viewportRef.current.scrollTop = Math.max(0, rowTop);
    }
  }, [highlightMatch]);

  function renderRow(m: TeamScheduleMatch, ref?: React.Ref<HTMLTableRowElement>) {
    const alliance = getAllianceForTeam(m, ownerTeam)!;
    const isHighlight = highlightMatch === m.match;
    const rowClass = [
      alliance === "red" ? "kiosk-row-our-red" : "kiosk-row-our-blue",
      isHighlight ? "kiosk-row-highlight" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const redTeams = [m.red1, m.red2, m.red3, m.red4].filter(Boolean);
    const blueTeams = [m.blue1, m.blue2, m.blue3, m.blue4].filter(Boolean);
    const hasScore =
      m.redScore != null && m.blueScore != null && m.winningAlliance !== 0;
    return (
      <tr key={`${m.level}-${m.match}`} className={rowClass} ref={ref}>
        <td className="kiosk-match-num">
          {levelPrefix(m.level)}{m.match}
        </td>
        <td className="kiosk-match-time">
          {formatMatchTime(m.startTime)}
        </td>
        <td className="kiosk-alliance-cell kiosk-col-red">
          {redTeams.map((t) => (
            <span key={t} className={t === ownerTeam ? "kiosk-team-owner" : ""}>
              {t}{rankByTeam.has(t) && <span className="kiosk-team-rank">({rankByTeam.get(t)})</span>}
            </span>
          ))}
        </td>
        <td className="kiosk-alliance-cell kiosk-col-blue">
          {blueTeams.map((t) => (
            <span key={t} className={t === ownerTeam ? "kiosk-team-owner" : ""}>
              {t}{rankByTeam.has(t) && <span className="kiosk-team-rank">({rankByTeam.get(t)})</span>}
            </span>
          ))}
        </td>
        <td className="kiosk-score-cell">
          {hasScore ? (
            <>
              <span className="kiosk-score-red">{m.redScore}</span>
              {"-"}
              <span className="kiosk-score-blue">{m.blueScore}</span>
            </>
          ) : (
            ""
          )}
        </td>
      </tr>
    );
  }

  return (
    <div className="kiosk-schedule">
      <div className="kiosk-schedule-viewport" ref={viewportRef}>
        <table className="kiosk-schedule-table">
          <tbody>
            {upcoming.map((m) =>
              renderRow(m, highlightMatch === m.match ? highlightRowRef : undefined),
            )}
            {completed.length > 0 && upcoming.length > 0 && (
              <tr className="kiosk-schedule-separator">
                <td colSpan={5}></td>
              </tr>
            )}
            {completed.map((m) => renderRow(m))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Playoff components
// ---------------------------------------------------------------------------

function AllianceListPanel({
  alliances,
  ownerTeam,
  countdown,
  rankings,
}: {
  alliances: Alliance[];
  ownerTeam: number;
  countdown: number;
  rankings: TeamRanking[];
}) {
  const rankByTeam = new Map<number, number>();
  rankings.forEach((r, i) => rankByTeam.set(r.teamNumber, i + 1));

  return (
    <div className="kiosk-alliance-list">
      <h2 className="kiosk-section-title">
        Alliances
        <span className="kiosk-countdown">{countdown}s</span>
      </h2>
      <div className="kiosk-alliance-cards">
        {alliances.map((a) => (
          <div
            key={a.seed}
            className={[
              "kiosk-alliance-card",
              a.isOwner ? "kiosk-alliance-owner" : "",
              a.eliminated ? "kiosk-alliance-eliminated" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="kiosk-alliance-seed">{a.seed}</span>
            <span className="kiosk-alliance-teams">
              {a.teams.map((t) => (
                <span key={t} className={t === ownerTeam ? "kiosk-alliance-owner-team" : ""}>
                  {t}
                  {rankByTeam.has(t) && (
                    <span className="kiosk-alliance-team-rank">({rankByTeam.get(t)})</span>
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

// ---------------------------------------------------------------------------
// SVG Bracket — FRC double-elimination style
// ---------------------------------------------------------------------------

// Layout: explicit x,y positions for each match to replicate the FRC manual bracket.
// Upper bracket flows left→right top half, lower bracket left→right bottom half,
// finals column on far right, vertically centered.

const FONT = "-apple-system, system-ui, sans-serif";
const BOX_W = 155;
const BOX_H = 40;
const HALF_H = BOX_H / 2;
const COL_W = BOX_W + 50; // column spacing
const LEFT_PAD = 22; // room for match labels to the left

// Explicit positions: [matchNumber, x, y]
// Upper bracket
const UPPER_R1_Y = [10, 60, 110, 160]; // 4 matches
const UPPER_SF_Y = [35, 135]; // 2 matches centered between feeders
const UPPER_F_Y = [85]; // 1 match centered

// Lower bracket — starts below upper with gap
const LB_TOP = 230;
const LOWER_R1_Y = [LB_TOP, LB_TOP + 50];
const LOWER_R2_Y = [LB_TOP, LB_TOP + 50];
const LOWER_R3_Y = [LB_TOP + 25];
const LOWER_FINAL_Y = [LB_TOP + 25];

// Finals — far right, vertically centered
const FINALS_X = COL_W * 4 + 40;
const FINALS_Y = [140, 185, 230];

const MATCH_POSITIONS: Record<number, { x: number; y: number }> = {
  // Upper R1 (col 0)
  1: { x: LEFT_PAD, y: UPPER_R1_Y[0] },
  2: { x: LEFT_PAD, y: UPPER_R1_Y[1] },
  3: { x: LEFT_PAD, y: UPPER_R1_Y[2] },
  4: { x: LEFT_PAD, y: UPPER_R1_Y[3] },
  // Upper SF (col 1)
  7: { x: LEFT_PAD + COL_W, y: UPPER_SF_Y[0] },
  8: { x: LEFT_PAD + COL_W, y: UPPER_SF_Y[1] },
  // Upper Final (col 2)
  11: { x: LEFT_PAD + COL_W * 2, y: UPPER_F_Y[0] },
  // Lower R1 (col 0)
  5: { x: LEFT_PAD, y: LOWER_R1_Y[0] },
  6: { x: LEFT_PAD, y: LOWER_R1_Y[1] },
  // Lower R2 (col 1)
  9: { x: LEFT_PAD + COL_W, y: LOWER_R2_Y[0] },
  10: { x: LEFT_PAD + COL_W, y: LOWER_R2_Y[1] },
  // Lower R3 (col 2)
  12: { x: LEFT_PAD + COL_W * 2, y: LOWER_R3_Y[0] },
  // Lower Final (col 3)
  13: { x: LEFT_PAD + COL_W * 3, y: LOWER_FINAL_Y[0] },
  // Finals
  14: { x: LEFT_PAD + FINALS_X, y: FINALS_Y[0] },
  15: { x: LEFT_PAD + FINALS_X, y: FINALS_Y[1] },
  16: { x: LEFT_PAD + FINALS_X, y: FINALS_Y[2] },
};

const SVG_W = LEFT_PAD + FINALS_X + BOX_W + 10;
const SVG_H = LB_TOP + 100;

// Connector: from right edge of source match to left edge of target match
// Uses classic bracket-tree right-angle connector paths
function buildConnectors(resolvedMatches: ResolvedMatch[]) {
  const paths: string[] = [];
  for (const rm of resolvedMatches) {
    const toPos = MATCH_POSITIONS[rm.slot.match];
    if (!toPos) continue;
    for (const [i, source] of [rm.slot.redSource, rm.slot.blueSource].entries()) {
      if (source.type === "seed") continue;
      const fromPos = MATCH_POSITIONS[source.match];
      if (!fromPos) continue;

      const fromX = fromPos.x + BOX_W;
      const fromY = fromPos.y + HALF_H;
      const toX = toPos.x;
      const toY = toPos.y + (i === 0 ? HALF_H * 0.5 : HALF_H * 1.5);
      const midX = (fromX + toX) / 2;

      paths.push(`M${fromX},${fromY} H${midX} V${toY} H${toX}`);
    }
  }
  return paths;
}

function BracketPanel({
  resolvedMatches,
  ownerTeam,
}: {
  resolvedMatches: ResolvedMatch[];
  ownerTeam: number;
}) {
  const ownerSeedNum = (() => {
    for (const rm of resolvedMatches) {
      if (rm.redTeams.includes(ownerTeam)) return rm.redSeed;
      if (rm.blueTeams.includes(ownerTeam)) return rm.blueSeed;
    }
    return null;
  })();

  const connectorPaths = buildConnectors(resolvedMatches);

  function sourceLabel(source: { type: string; seed?: number; match?: number }): string {
    if (source.type === "seed") return `Alliance ${source.seed}`;
    if (source.type === "winner") return `W ${BRACKET_8.find((s) => s.match === source.match)?.label ?? `M${source.match}`}`;
    if (source.type === "loser") return `L ${BRACKET_8.find((s) => s.match === source.match)?.label ?? `M${source.match}`}`;
    return "TBD";
  }

  function renderAllianceHalf(
    x: number,
    y: number,
    teams: number[],
    seed: number | null,
    score: number | null,
    isWinner: boolean,
    isLoser: boolean,
    isTop: boolean,
    source: { type: string; seed?: number; match?: number },
  ) {
    const isOwner = seed === ownerSeedNum;
    const halfY = isTop ? y : y + HALF_H;
    const bgFill = isWinner ? "#3a3a3a" : "#2a2a2a";
    const textFill = isLoser ? "#555" : isOwner ? "#FF5A47" : "#ddd";
    const weight = isWinner ? "bold" : "normal";
    const seedStr = seed != null ? String(seed) : "?";
    const teamStr = teams.length > 0 ? teams.join("  ") : sourceLabel(source);
    const scoreStr = score != null ? String(score) : "";

    return (
      <g>
        {/* Half background */}
        <rect
          x={x}
          y={halfY}
          width={BOX_W}
          height={HALF_H}
          fill={bgFill}
          rx={isTop ? 3 : 0}
          ry={isTop ? 3 : 0}
        />
        {/* Clip bottom corners for top half, top corners for bottom half */}
        {!isTop && (
          <rect x={x} y={halfY} width={BOX_W} height={HALF_H} fill={bgFill} rx={3} ry={3} />
        )}
        {/* Seed badge */}
        <rect
          x={x + 1}
          y={halfY + 1}
          width={18}
          height={HALF_H - 2}
          fill={isOwner ? "rgba(255,56,32,0.25)" : "rgba(255,255,255,0.06)"}
          rx={2}
        />
        <text
          x={x + 10}
          y={halfY + HALF_H / 2 + 4}
          fill={isOwner ? "#FF5A47" : "#999"}
          fontSize="11"
          fontWeight="bold"
          textAnchor="middle"
          fontFamily={FONT}
        >
          {seedStr}
        </text>
        {/* Team numbers */}
        <text
          x={x + 22}
          y={halfY + HALF_H / 2 + 4}
          fill={textFill}
          fontSize="10"
          fontWeight={weight}
          fontFamily={FONT}
        >
          {teamStr}
        </text>
        {/* Score */}
        {scoreStr && (
          <text
            x={x + BOX_W - 5}
            y={halfY + HALF_H / 2 + 4}
            fill={textFill}
            fontSize="11"
            fontWeight={weight}
            textAnchor="end"
            fontFamily={FONT}
          >
            {scoreStr}
          </text>
        )}
        {/* Winner indicator */}
        {isWinner && (
          <rect
            x={x + BOX_W - 3}
            y={halfY + 2}
            width={3}
            height={HALF_H - 4}
            fill="#4CAF50"
            rx={1}
          />
        )}
      </g>
    );
  }

  function renderMatchBox(rm: ResolvedMatch) {
    const pos = MATCH_POSITIONS[rm.slot.match];
    if (!pos) return null;
    const { x, y } = pos;
    const isLive = rm.matchData != null && rm.winner === null;

    return (
      <g key={rm.slot.match}>
        {/* Outer border */}
        <rect
          x={x}
          y={y}
          width={BOX_W}
          height={BOX_H}
          fill="none"
          rx={3}
          stroke={isLive ? "#e67e22" : "#444"}
          strokeWidth={isLive ? 2 : 1}
        />
        {/* Match label to the left of box, vertically centered */}
        <text
          x={x - 4}
          y={y + BOX_H / 2 + 3}
          fill="#666"
          fontSize="8"
          textAnchor="end"
          fontFamily={FONT}
        >
          {rm.slot.label}
        </text>
        {/* Top alliance (red side) */}
        {renderAllianceHalf(
          x, y,
          rm.redTeams, rm.redSeed, rm.redScore,
          rm.winner === "red", rm.winner === "blue",
          true, rm.slot.redSource,
        )}
        {/* Divider */}
        <line
          x1={x} y1={y + HALF_H}
          x2={x + BOX_W} y2={y + HALF_H}
          stroke="#555" strokeWidth={0.5}
        />
        {/* Bottom alliance (blue side) */}
        {renderAllianceHalf(
          x, y,
          rm.blueTeams, rm.blueSeed, rm.blueScore,
          rm.winner === "blue", rm.winner === "red",
          false, rm.slot.blueSource,
        )}
      </g>
    );
  }

  return (
    <div className="kiosk-bracket">
      <svg
        viewBox={`-5 -18 ${SVG_W + 10} ${SVG_H + 20}`}
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height="100%"
      >
        {/* Region labels */}
        <text x={0} y={3} fill="#555" fontSize="9" fontWeight="bold" fontFamily={FONT} letterSpacing="0.5">
          UPPER BRACKET
        </text>
        <text x={0} y={LB_TOP - 7} fill="#555" fontSize="9" fontWeight="bold" fontFamily={FONT} letterSpacing="0.5">
          LOWER BRACKET
        </text>
        <text x={FINALS_X} y={FINALS_Y[0] - 7} fill="#555" fontSize="9" fontWeight="bold" fontFamily={FONT} letterSpacing="0.5">
          FINALS
        </text>

        {/* Separator between upper and lower */}
        <line
          x1={0} y1={LB_TOP - 15}
          x2={FINALS_X - 15} y2={LB_TOP - 15}
          stroke="#333" strokeWidth={1}
        />

        {/* Connector lines */}
        {connectorPaths.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#444" strokeWidth={1} />
        ))}

        {/* Match boxes */}
        {resolvedMatches.map((rm) => renderMatchBox(rm))}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PitKioskPage() {
  const [activeTournaments, setActiveTournaments] = useState<RBTournament[]>(
    [],
  );
  const [schedule, setSchedule] = useState<TeamScheduleResponse | null>(null);
  const [queueStatus, setQueueStatus] = useState<NexusQueueStatus | null>(
    null,
  );
  const [activeWebcast, setActiveWebcast] = useState(0);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(REFRESH_MS / 1000);

  // Hide app header/footer
  useEffect(() => {
    const layout = document.getElementById("layout");
    if (layout) layout.classList.add("kiosk-active");
    return () => {
      layout?.classList.remove("kiosk-active");
    };
  }, []);

  // Load active tournaments on mount
  useEffect(() => {
    getActiveTeamTournaments()
      .then(setActiveTournaments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const tournament = activeTournaments.length > 0 ? activeTournaments[0] : null;
  const tournamentId = tournament?.id ?? null;

  const loadData = useCallback(
    async (tid: string) => {
      try {
        const data = await getTeamSchedulePublic(tid);
        setSchedule(data);
        const ownerInMatches = (data.matches ?? []).some(
          (m) => getAllianceForTeam(m, data.teamNumber) !== null,
        );
        if (ownerInMatches) {
          getNexusQueueStatus(tid).then(setQueueStatus);
        } else {
          setQueueStatus(null);
        }
      } catch {
        // Silently retry on next interval
      }
    },
    [],
  );

  // Auto-refresh every 15s with countdown
  useEffect(() => {
    if (!tournamentId) return;
    loadData(tournamentId);
    setCountdown(REFRESH_MS / 1000);
    const refreshInterval = setInterval(() => {
      loadData(tournamentId);
      setCountdown(REFRESH_MS / 1000);
    }, REFRESH_MS);
    const countdownInterval = setInterval(() => {
      setCountdown((c) => (c > 1 ? c - 1 : c));
    }, 1000);
    return () => {
      clearInterval(refreshInterval);
      clearInterval(countdownInterval);
    };
  }, [tournamentId, loadData]);

  const matches = schedule?.matches ?? [];
  const rankings = schedule?.rankings ?? [];
  const ownerTeam = schedule?.teamNumber ?? 1310;

  // Playoff mode detection
  const playoffMatches = matches.filter((m) => m.level === "Playoff");
  const isPlayoffMode =
    schedule?.hasPlayoff === true && playoffMatches.length >= 4;
  const alliances = isPlayoffMode
    ? deriveAlliances(playoffMatches, ownerTeam)
    : [];
  const resolvedMatches = isPlayoffMode ? resolveBracket(playoffMatches) : [];

  // Highlight the owner team's next unplayed match
  const nextOwnerMatch = matches.find(
    (m) =>
      getAllianceForTeam(m, ownerTeam) !== null &&
      m.redScore == null &&
      m.blueScore == null,
  );
  const highlightMatch = nextOwnerMatch?.match ?? null;

  // Parse webcasts from tournament. Backend stores as JSON string, so handle both formats.
  let webcastUrls: string[] = [];
  const raw = tournament?.webcasts;
  if (Array.isArray(raw)) {
    webcastUrls = raw;
  } else if (typeof raw === "string" && raw.length > 0) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) webcastUrls = parsed;
    } catch { /* ignore */ }
  }
  const webcasts: ParsedWebcast[] = webcastUrls.map((url, i) => {
    const parsed = parseWebcast(url);
    // Label duplicate providers with a number for clarity
    const sameProviderCount = webcastUrls
      .slice(0, i)
      .filter((u) => parseWebcast(u).provider === parsed.provider).length;
    if (sameProviderCount > 0) {
      parsed.label = `${parsed.label} ${sameProviderCount + 1}`;
    }
    return parsed;
  });
  const hasVideo = webcasts.length > 0;

  if (loading) {
    return (
      <main className="kiosk kiosk-loading">
        <Spinner />
      </main>
    );
  }

  if (!tournament) {
    return (
      <main className="kiosk kiosk-loading">
        <p>No active tournament found.</p>
      </main>
    );
  }

  const kioskClass = [
    "kiosk",
    !hasVideo ? "kiosk-no-video" : "",
    isPlayoffMode ? "kiosk-playoff" : "",
  ].filter(Boolean).join(" ");

  return (
    <main className={kioskClass}>
      <TopBar
        queueStatus={queueStatus}
        webcasts={webcasts}
        activeWebcast={activeWebcast}
        onSelectWebcast={setActiveWebcast}
      />
      <div className="kiosk-left">
        {isPlayoffMode ? (
          <AllianceListPanel
            alliances={alliances}
            ownerTeam={ownerTeam}
            countdown={countdown}
            rankings={rankings}
          />
        ) : (
          <>
            <OwnerScoresPanel matches={matches} ownerTeam={ownerTeam} countdown={countdown} />
            <RankingsPanel rankings={rankings} ownerTeam={ownerTeam} />
          </>
        )}
      </div>
      <div className="kiosk-main">
        {hasVideo && (
          <VideoEmbed webcast={webcasts[activeWebcast] ?? webcasts[0]} />
        )}
        {isPlayoffMode ? (
          <BracketPanel
            resolvedMatches={resolvedMatches}
            ownerTeam={ownerTeam}
          />
        ) : (
          <SchedulePanel
            matches={matches}
            ownerTeam={ownerTeam}
            highlightMatch={highlightMatch}
            rankings={rankings}
          />
        )}
      </div>
    </main>
  );
}
