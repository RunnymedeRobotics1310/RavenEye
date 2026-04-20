import { BRACKET_8, isFinalsDecided } from "~/common/bracket.ts";
import type { ResolvedMatch } from "~/common/bracket.ts";

// ---------------------------------------------------------------------------
// Layout constants (shared)
// ---------------------------------------------------------------------------

const FONT = "-apple-system, system-ui, sans-serif";
const BOX_W = 155;
const BOX_H = 40;
const HALF_H = BOX_H / 2;

// ---------------------------------------------------------------------------
// Full 8-alliance layout
// ---------------------------------------------------------------------------

const COL_W = BOX_W + 50;
const LEFT_PAD = 22;

const UPPER_R1_Y = [10, 60, 110, 160];
const UPPER_SF_Y = [35, 135];
const UPPER_F_Y = [85];

const LB_TOP = 230;
const LOWER_R1_Y = [LB_TOP, LB_TOP + 50];
const LOWER_R2_Y = [LB_TOP, LB_TOP + 50];
const LOWER_R3_Y = [LB_TOP + 25];
const LOWER_FINAL_Y = [LB_TOP];

const LB_SHIFT = COL_W / 2;

const M13_RIGHT = LEFT_PAD + COL_W * 3 + LB_SHIFT + BOX_W;
const DOT_X = M13_RIGHT + 45 - 5;
const DOT_Y = UPPER_F_Y[0] + BOX_H / 2;
const DOT_R = 3.5;
const FINALS_LABEL_X = DOT_X + DOT_R + 6;

const FINALS_Y = [DOT_Y - 42.5, DOT_Y + 2.5, DOT_Y + 47.5];

const POSITIONS_8: Record<number, { x: number; y: number }> = {
  1: { x: LEFT_PAD, y: UPPER_R1_Y[0] },
  2: { x: LEFT_PAD, y: UPPER_R1_Y[1] },
  3: { x: LEFT_PAD, y: UPPER_R1_Y[2] },
  4: { x: LEFT_PAD, y: UPPER_R1_Y[3] },
  7: { x: LEFT_PAD + COL_W, y: UPPER_SF_Y[0] },
  8: { x: LEFT_PAD + COL_W, y: UPPER_SF_Y[1] },
  11: { x: LEFT_PAD + COL_W * 2, y: UPPER_F_Y[0] },
  5: { x: LEFT_PAD + LB_SHIFT, y: LOWER_R1_Y[0] },
  6: { x: LEFT_PAD + LB_SHIFT, y: LOWER_R1_Y[1] },
  9: { x: LEFT_PAD + COL_W + LB_SHIFT, y: LOWER_R2_Y[0] },
  10: { x: LEFT_PAD + COL_W + LB_SHIFT, y: LOWER_R2_Y[1] },
  12: { x: LEFT_PAD + COL_W * 2 + LB_SHIFT, y: LOWER_R3_Y[0] },
  13: { x: LEFT_PAD + COL_W * 3 + LB_SHIFT, y: LOWER_FINAL_Y[0] },
  14: { x: FINALS_LABEL_X + 25, y: FINALS_Y[0] },
  15: { x: FINALS_LABEL_X + 25, y: FINALS_Y[1] },
  16: { x: FINALS_LABEL_X + 25, y: FINALS_Y[2] },
};

const SVG_W_8 = FINALS_LABEL_X + 25 + BOX_W + 10;
const SVG_H_8 = LB_TOP + 100;

// ---------------------------------------------------------------------------
// Color themes
// ---------------------------------------------------------------------------

interface BracketColors {
  bgWinner: string;
  bgLoser: string;
  textPrimary: string;
  textSecondary: string;
  textOwner: string;
  seedOwner: string;
  seedDefault: string;
  seedBgOwner: string;
  seedBgDefault: string;
  border: string;
  borderLive: string;
  divider: string;
  connector: string;
  winIndicator: string;
  label: string;
  allianceRed: string;
  allianceBlue: string;
}

const DARK_COLORS: BracketColors = {
  bgWinner: "#3a3a3a",
  bgLoser: "#2a2a2a",
  textPrimary: "#ddd",
  textSecondary: "#555",
  textOwner: "#E8C840",
  seedOwner: "#E8C840",
  seedDefault: "#999",
  seedBgOwner: "rgba(200,170,40,0.2)",
  seedBgDefault: "rgba(255,255,255,0.06)",
  border: "#444",
  borderLive: "#e67e22",
  divider: "#555",
  connector: "#444",
  winIndicator: "#4CAF50",
  label: "#666",
  allianceRed: "#FF5A47",
  allianceBlue: "#4488ff",
};

const AUTO_COLORS: BracketColors = {
  bgWinner: "var(--color-bg-tertiary)",
  bgLoser: "var(--color-bg-secondary)",
  textPrimary: "var(--color-text-primary)",
  textSecondary: "var(--color-text-tertiary)",
  textOwner: "var(--runnymede-gold)",
  seedOwner: "var(--runnymede-gold)",
  seedDefault: "var(--color-text-tertiary)",
  seedBgOwner: "var(--runnymede-gold-bg)",
  seedBgDefault: "rgba(128,128,128,0.1)",
  border: "var(--color-bg-tertiary)",
  borderLive: "var(--color-warning)",
  divider: "var(--color-bg-tertiary)",
  connector: "var(--color-bg-tertiary)",
  winIndicator: "var(--color-success)",
  label: "var(--color-text-tertiary)",
  allianceRed: "var(--alliance-red)",
  allianceBlue: "var(--alliance-blue)",
};

// ---------------------------------------------------------------------------
// Connectors (full8 only)
// ---------------------------------------------------------------------------

function buildConnectors(resolvedMatches: ResolvedMatch[]): string[] {
  const paths: string[] = [];
  for (const rm of resolvedMatches) {
    if (rm.slot.region === "finals") continue;
    const toPos = POSITIONS_8[rm.slot.match];
    if (!toPos) continue;
    for (const [i, source] of [rm.slot.redSource, rm.slot.blueSource].entries()) {
      if (source.type === "seed") continue;
      const fromPos = POSITIONS_8[source.match];
      if (!fromPos) continue;
      const fromX = fromPos.x + BOX_W;
      const fromY = fromPos.y + HALF_H;
      const toX = toPos.x;
      const toY = toPos.y + (i === 0 ? HALF_H * 0.5 : HALF_H * 1.5);
      let midX = (fromX + toX) / 2;
      if (source.match === 11 && rm.slot.match === 13) {
        midX = (POSITIONS_8[12].x + BOX_W + POSITIONS_8[13].x) / 2;
      }
      if (source.match === 5 && rm.slot.match === 10) midX -= 9;
      if (source.match === 7 && rm.slot.match === 9) midX -= 4.5;
      if (source.match === 8 && rm.slot.match === 10) midX += 4.5;
      if (source.match === 1 && rm.slot.match === 5) midX -= 13.5;
      if (source.match === 2 && rm.slot.match === 5) midX -= 4.5;
      if (source.match === 3 && rm.slot.match === 6) midX += 4.5;
      if (source.match === 4 && rm.slot.match === 6) midX += 13.5;
      paths.push(`M${fromX},${fromY} H${midX} V${toY} H${toX}`);
    }
  }
  for (const matchNum of [11, 13]) {
    const fromPos = POSITIONS_8[matchNum];
    if (!fromPos) continue;
    const fromX = fromPos.x + BOX_W;
    const fromY = fromPos.y + HALF_H;
    const midX = (fromX + DOT_X) / 2;
    paths.push(`M${fromX},${fromY} H${midX} V${DOT_Y} H${DOT_X - DOT_R}`);
  }
  return paths;
}

// ---------------------------------------------------------------------------
// Source label (full8)
// ---------------------------------------------------------------------------

function sourceLabel(source: { type: string; seed?: number; match?: number }): string {
  if (source.type === "seed") return `Alliance ${source.seed}`;
  if (source.type === "winner") return `W ${BRACKET_8.find((s) => s.match === source.match)?.label ?? `M${source.match}`}`;
  if (source.type === "loser") return `L ${BRACKET_8.find((s) => s.match === source.match)?.label ?? `M${source.match}`}`;
  return "TBD";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BracketSvg({
  resolvedMatches,
  ownerTeam,
  captains,
  darkOnly = false,
}: {
  resolvedMatches: ResolvedMatch[];
  ownerTeam: number;
  captains: Set<number>;
  darkOnly?: boolean;
}) {
  const c = darkOnly ? DARK_COLORS : AUTO_COLORS;

  const ownerSeedNum = (() => {
    for (const rm of resolvedMatches) {
      if (rm.redTeams.includes(ownerTeam)) return rm.redSeed;
      if (rm.blueTeams.includes(ownerTeam)) return rm.blueSeed;
    }
    return null;
  })();

  const finalsDecided = isFinalsDecided(resolvedMatches);

  // Detect format: if any slot is in upper/lower region, it's a full 8-alliance
  // bracket; otherwise all slots are finals (finals3 layout).
  const isFull8 = resolvedMatches.some(
    (rm) => rm.slot.region === "upper" || rm.slot.region === "lower",
  );

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
    const bgFill = isWinner ? c.bgWinner : c.bgLoser;
    const textFill = isOwner ? c.textOwner : isLoser ? c.textSecondary : c.textPrimary;
    const weight = isWinner ? "bold" : "normal";
    const seedStr = seed != null ? String(seed) : "?";
    const hasTeams = teams.length > 0;
    const scoreStr = score != null ? String(score) : "";

    const allianceColor = isTop ? c.allianceRed : c.allianceBlue;

    return (
      <g>
        <rect x={x} y={halfY} width={BOX_W} height={HALF_H} fill={bgFill} rx={isTop ? 3 : 0} ry={isTop ? 3 : 0} />
        {!isTop && <rect x={x} y={halfY} width={BOX_W} height={HALF_H} fill={bgFill} rx={3} ry={3} />}
        <rect x={x} y={halfY + 1} width={3} height={HALF_H - 2} fill={allianceColor} rx={1} />
        <rect x={x + 1} y={halfY + 1} width={18} height={HALF_H - 2} fill={isOwner ? c.seedBgOwner : c.seedBgDefault} rx={2} />
        <text x={x + 10} y={halfY + HALF_H / 2 + 4} fill={isOwner ? c.seedOwner : c.seedDefault} fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily={FONT}>{seedStr}</text>
        <text x={x + 22} y={halfY + HALF_H / 2 + 4} fill={textFill} fontSize="10" fontWeight={weight} fontFamily={FONT}>
          {hasTeams
            ? teams.map((t, ti) => (
                <tspan key={t} fontWeight={captains.has(t) ? "bold" : weight}>{ti > 0 ? "  " : ""}{t}</tspan>
              ))
            : sourceLabel(source)}
        </text>
        {scoreStr && (
          <text x={x + BOX_W - 5} y={halfY + HALF_H / 2 + 4} fill={textFill} fontSize="11" fontWeight={weight} textAnchor="end" fontFamily={FONT}>{scoreStr}</text>
        )}
        {isWinner && <rect x={x + BOX_W - 3} y={halfY + 2} width={3} height={HALF_H - 4} fill={c.winIndicator} rx={1} />}
      </g>
    );
  }

  function renderMatchBox(rm: ResolvedMatch, pos: { x: number; y: number }) {
    const { x, y } = pos;
    const isLive = rm.matchData != null && rm.winner === null;
    // For full8, M16 becomes unnecessary if M14+M15 decide the series.
    // For finals3, the third match (row 2) is unnecessary if rows 0+1 decided it.
    const isUnnecessary =
      rm.slot.region === "finals" &&
      rm.slot.row === 2 &&
      finalsDecided &&
      rm.winner === null;

    return (
      <g key={rm.slot.match} opacity={isUnnecessary ? 0.3 : 1}>
        <rect x={x} y={y} width={BOX_W} height={BOX_H} fill="none" rx={3} stroke={isLive ? c.borderLive : c.border} strokeWidth={isLive ? 2 : 1} strokeDasharray={isUnnecessary ? "4 2" : "none"} />
        <text x={x - 4} y={y + BOX_H / 2 + 3} fill={c.label} fontSize="8" textAnchor="end" fontFamily={FONT}>{rm.slot.label}</text>
        {renderAllianceHalf(x, y, rm.redTeams, rm.redSeed, rm.redScore, rm.winner === "red", rm.winner === "blue", true, rm.slot.redSource)}
        <line x1={x} y1={y + HALF_H} x2={x + BOX_W} y2={y + HALF_H} stroke={c.divider} strokeWidth={0.5} />
        {renderAllianceHalf(x, y, rm.blueTeams, rm.blueSeed, rm.blueScore, rm.winner === "blue", rm.winner === "red", false, rm.slot.blueSource)}
      </g>
    );
  }

  if (isFull8) {
    const connectorPaths = buildConnectors(resolvedMatches);
    return (
      <svg
        viewBox={`-5 -18 ${SVG_W_8 + 10} ${SVG_H_8 + 20}`}
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height="100%"
      >
        <text x={0} y={3} fill={c.label} fontSize="9" fontWeight="bold" fontFamily={FONT} letterSpacing="0.5">UPPER BRACKET</text>
        <text x={0} y={LB_TOP - 7} fill={c.label} fontSize="9" fontWeight="bold" fontFamily={FONT} letterSpacing="0.5">LOWER BRACKET</text>
        {connectorPaths.map((d, i) => <path key={i} d={d} fill="none" stroke={c.connector} strokeWidth={1} />)}
        <circle cx={DOT_X} cy={DOT_Y} r={DOT_R} fill={c.connector} />
        <text x={FINALS_LABEL_X} y={FINALS_Y[0] - 7} fill={c.label} fontSize="9" fontWeight="bold" fontFamily={FONT} letterSpacing="0.5">FINALS</text>
        {resolvedMatches.map((rm) => {
          const pos = POSITIONS_8[rm.slot.match];
          return pos ? renderMatchBox(rm, pos) : null;
        })}
      </svg>
    );
  }

  // finals3 layout: horizontal row of up to 3 finals matches.
  // A wide-and-short aspect ratio scales sanely when the parent card is
  // full-width: height stays reasonable instead of ballooning the way a
  // vertical-stack viewBox would.
  const F3_LEFT = 22;
  const F3_TOP = 18;
  const F3_GAP = 28;
  const cols = [...resolvedMatches]
    .filter((rm) => rm.slot.region === "finals")
    .sort((a, b) => a.slot.row - b.slot.row);
  const svgW = F3_LEFT + cols.length * BOX_W + Math.max(0, cols.length - 1) * F3_GAP + 12;
  const svgH = F3_TOP + BOX_H + 6;

  return (
    <svg
      viewBox={`-5 -18 ${svgW + 10} ${svgH + 20}`}
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      height="100%"
    >
      <text x={0} y={3} fill={c.label} fontSize="9" fontWeight="bold" fontFamily={FONT} letterSpacing="0.5">FINALS</text>
      {cols.map((rm, i) =>
        renderMatchBox(rm, { x: F3_LEFT + i * (BOX_W + F3_GAP), y: F3_TOP }),
      )}
    </svg>
  );
}
