import { BRACKET_8, isFinalsDecided } from "~/common/bracket.ts";
import type { ResolvedMatch } from "~/common/bracket.ts";

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const FONT = "-apple-system, system-ui, sans-serif";
const BOX_W = 155;
const BOX_H = 40;
const HALF_H = BOX_H / 2;
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

const FINALS_Y = [115, 160, 205];

const LB_SHIFT = COL_W / 2;

// M13 right edge determines where the dot and finals go
const M13_RIGHT = LEFT_PAD + COL_W * 3 + LB_SHIFT + BOX_W;
const DOT_X = M13_RIGHT + 45;
const DOT_Y = UPPER_F_Y[0] + BOX_H / 2; // aligned with M11 center
const DOT_R = 5;
const FINALS_LABEL_X = DOT_X + DOT_R + 6;

const POSITIONS: Record<number, { x: number; y: number }> = {
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

const SVG_W = FINALS_LABEL_X + 25 + BOX_W + 10;
const SVG_H = LB_TOP + 100;

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
}

const DARK_COLORS: BracketColors = {
  bgWinner: "#3a3a3a",
  bgLoser: "#2a2a2a",
  textPrimary: "#ddd",
  textSecondary: "#555",
  textOwner: "#FF5A47",
  seedOwner: "#FF5A47",
  seedDefault: "#999",
  seedBgOwner: "rgba(255,56,32,0.25)",
  seedBgDefault: "rgba(255,255,255,0.06)",
  border: "#444",
  borderLive: "#e67e22",
  divider: "#555",
  connector: "#444",
  winIndicator: "#4CAF50",
  label: "#666",
};

const AUTO_COLORS: BracketColors = {
  bgWinner: "var(--color-bg-tertiary)",
  bgLoser: "var(--color-bg-secondary)",
  textPrimary: "var(--color-text-primary)",
  textSecondary: "var(--color-text-tertiary)",
  textOwner: "var(--runnymede-red)",
  seedOwner: "var(--runnymede-red)",
  seedDefault: "var(--color-text-tertiary)",
  seedBgOwner: "rgba(255,56,32,0.15)",
  seedBgDefault: "rgba(128,128,128,0.1)",
  border: "var(--color-bg-tertiary)",
  borderLive: "var(--color-warning)",
  divider: "var(--color-bg-tertiary)",
  connector: "var(--color-bg-tertiary)",
  winIndicator: "var(--color-success)",
  label: "var(--color-text-tertiary)",
};

// ---------------------------------------------------------------------------
// Connectors
// ---------------------------------------------------------------------------

function buildConnectors(resolvedMatches: ResolvedMatch[]): string[] {
  const paths: string[] = [];
  for (const rm of resolvedMatches) {
    if (rm.slot.region === "finals") continue;
    const toPos = POSITIONS[rm.slot.match];
    if (!toPos) continue;
    for (const [i, source] of [rm.slot.redSource, rm.slot.blueSource].entries()) {
      if (source.type === "seed") continue;
      const fromPos = POSITIONS[source.match];
      if (!fromPos) continue;
      const fromX = fromPos.x + BOX_W;
      const fromY = fromPos.y + HALF_H;
      const toX = toPos.x;
      const toY = toPos.y + (i === 0 ? HALF_H * 0.5 : HALF_H * 1.5);
      let midX = (fromX + toX) / 2;
      // Avoid vertical segment overlapping M12 (M11 loser → M13)
      if (source.match === 11 && rm.slot.match === 13) {
        midX = (POSITIONS[12].x + BOX_W + POSITIONS[13].x) / 2;
      }
      // Separate overlapping vertical risers in lower bracket
      if (source.match === 5 && rm.slot.match === 10) midX -= 9;
      if (source.match === 7 && rm.slot.match === 9) midX -= 4.5;
      if (source.match === 8 && rm.slot.match === 10) midX += 4.5;
      // Separate M1/M2→M5 and M3/M4→M6 crossover lines horizontally
      if (source.match === 1 && rm.slot.match === 5) midX -= 13.5;
      if (source.match === 2 && rm.slot.match === 5) midX -= 4.5;
      if (source.match === 3 && rm.slot.match === 6) midX += 4.5;
      if (source.match === 4 && rm.slot.match === 6) midX += 13.5;
      paths.push(`M${fromX},${fromY} H${midX} V${toY} H${toX}`);
    }
  }
  for (const matchNum of [11, 13]) {
    const fromPos = POSITIONS[matchNum];
    if (!fromPos) continue;
    const fromX = fromPos.x + BOX_W;
    const fromY = fromPos.y + HALF_H;
    const midX = (fromX + DOT_X) / 2;
    paths.push(`M${fromX},${fromY} H${midX} V${DOT_Y} H${DOT_X - DOT_R}`);
  }
  return paths;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function sourceLabel(source: { type: string; seed?: number; match?: number }): string {
  if (source.type === "seed") return `Alliance ${source.seed}`;
  if (source.type === "winner") return `W ${BRACKET_8.find((s) => s.match === source.match)?.label ?? `M${source.match}`}`;
  if (source.type === "loser") return `L ${BRACKET_8.find((s) => s.match === source.match)?.label ?? `M${source.match}`}`;
  return "TBD";
}

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

  const connectorPaths = buildConnectors(resolvedMatches);

  const finalsDecided = isFinalsDecided(resolvedMatches);

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
    const textFill = isLoser ? c.textSecondary : isOwner ? c.textOwner : c.textPrimary;
    const weight = isWinner ? "bold" : "normal";
    const seedStr = seed != null ? String(seed) : "?";
    const hasTeams = teams.length > 0;
    const scoreStr = score != null ? String(score) : "";

    return (
      <g>
        <rect x={x} y={halfY} width={BOX_W} height={HALF_H} fill={bgFill} rx={isTop ? 3 : 0} ry={isTop ? 3 : 0} />
        {!isTop && <rect x={x} y={halfY} width={BOX_W} height={HALF_H} fill={bgFill} rx={3} ry={3} />}
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

  function renderMatchBox(rm: ResolvedMatch) {
    const pos = POSITIONS[rm.slot.match];
    if (!pos) return null;
    const { x, y } = pos;
    const isLive = rm.matchData != null && rm.winner === null;
    const isUnnecessary = rm.slot.match === 16 && finalsDecided && rm.winner === null;

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

  return (
    <svg
      viewBox={`-5 -18 ${SVG_W + 10} ${SVG_H + 20}`}
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      height="100%"
    >
      <text x={0} y={3} fill={c.label} fontSize="9" fontWeight="bold" fontFamily={FONT} letterSpacing="0.5">UPPER BRACKET</text>
      <text x={0} y={LB_TOP - 7} fill={c.label} fontSize="9" fontWeight="bold" fontFamily={FONT} letterSpacing="0.5">LOWER BRACKET</text>
      {connectorPaths.map((d, i) => <path key={i} d={d} fill="none" stroke={c.connector} strokeWidth={1} />)}
      <circle cx={DOT_X} cy={DOT_Y} r={DOT_R} fill={c.connector} />
      <text x={FINALS_LABEL_X} y={DOT_Y + 3} fill={c.label} fontSize="9" fontWeight="bold" fontFamily={FONT} letterSpacing="0.5">FINALS</text>
      {resolvedMatches.map((rm) => renderMatchBox(rm))}
    </svg>
  );
}
