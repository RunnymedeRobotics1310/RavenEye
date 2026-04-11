import { useState } from "react";
import Star from "~/common/icons/Star.tsx";
import type {
  PmvaReport,
  MatchComment,
  GeneralSection,
  ShootingSection,
  LoadingStats,
  ShootingView,
  MatchCycleData,
  SequenceShotData,
} from "~/types/PmvaReport.ts";

// ── Shared helpers ──────────────────────────────────────────────────────

const LEVEL_PREFIX: Record<string, string> = {
  Practice: "P",
  Qualification: "Q",
  Playoff: "E",
};

/**
 * Format a match identifier. When {@code showTournament} is true and a tournament id is present,
 * the label is prefixed with it — e.g. "2026onham Q7" — so cross-tournament charts and tables can
 * distinguish matches that share a match number.
 */
function matchLabel(
  level: string,
  matchId: number,
  tournamentId?: string,
  showTournament?: boolean,
): string {
  const base = (LEVEL_PREFIX[level] ?? level.charAt(0)) + matchId;
  return showTournament && tournamentId ? `${tournamentId} ${base}` : base;
}

function safeDivide(num: number, den: number): number {
  return den === 0 ? 0 : num / den;
}

function formatPct(value: number): string {
  return value.toFixed(1) + "%";
}

function formatNum(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  // Snap to the nearest half-star, clamp to [0, max].
  const clamped = Math.max(0, Math.min(max, value));
  const halves = Math.round(clamped * 2);
  const full = Math.floor(halves / 2);
  const hasHalf = halves % 2 === 1;
  const empty = max - full - (hasHalf ? 1 : 0);

  return (
    <span className="pmva-stars" title={value.toFixed(1) + " / " + max}>
      {Array.from({ length: full }, (_, i) => (
        <Star key={`f${i}`} filled={true} />
      ))}
      {hasHalf && <Star key="half" filled={false} half />}
      {Array.from({ length: empty }, (_, i) => (
        <Star key={`e${i}`} filled={false} />
      ))}
    </span>
  );
}

function CommentAccordion({
  title,
  comments,
  showTournament,
}: {
  title: string;
  comments: MatchComment[];
  showTournament: boolean;
}) {
  if (!comments || comments.length === 0) return null;
  return (
    <details className="pmva-accordion">
      <summary>
        {title} ({comments.length})
      </summary>
      <div className="pmva-accordion-body">
        <table className="pmva-stats-table">
          <thead>
            <tr>
              <th>Match</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {comments.map((c, i) => (
              <tr key={i}>
                <td>{matchLabel(c.level, c.matchId, c.tournamentId, showTournament)}</td>
                <td>{c.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

// ── General Card ────────────────────────────────────────────────────────

function GeneralCard({
  general,
  matchCount,
  showTournament,
}: {
  general: GeneralSection;
  matchCount: number;
  showTournament: boolean;
}) {
  return (
    <section className="card">
      <h2>Summary &amp; General</h2>

      <table className="pmva-stats-table">
        <tbody>
          <tr>
            <td>Matches with Robot Breakdown</td>
            <td>
              {general.breakdownCount} / {matchCount} (
              {formatPct(general.breakdownPercentage)})
            </td>
          </tr>
        </tbody>
      </table>

      <CommentAccordion
        title="Breakdown Details"
        comments={general.breakdownNotes}
        showTournament={showTournament}
      />
      <CommentAccordion
        title="Intake Comments"
        comments={general.intakeComments}
        showTournament={showTournament}
      />
      <CommentAccordion
        title="Shooter Comments"
        comments={general.shooterComments}
        showTournament={showTournament}
      />
      <CommentAccordion
        title="General Comments"
        comments={general.generalComments}
        showTournament={showTournament}
      />
      <CommentAccordion
        title="Suggestions"
        comments={general.suggestions}
        showTournament={showTournament}
      />
    </section>
  );
}

// ── Chart color constants ──────────────────────────────────────────────

const COLOR_SHOTS = "#6b7280";
const COLOR_SCORES = "#22c55e";
const COLOR_MISSES = "#ef4444";
const COLOR_STUCK = "#f59e0b";
const COLOR_SHOTS_SEC = "#8b5cf6";
const COLOR_SCORES_SEC = "#06b6d4";
const COLOR_UNLOAD = "#6366f1";

// ── SVG Chart Components ───────────────────────────────────────────────

function MatchCyclesChart({
  data,
  showTournament,
}: {
  data: MatchCycleData[];
  showTournament: boolean;
}) {
  const [hover, setHover] = useState<
    { x: number; y: number; tournament: string; detail: string } | null
  >(null);
  if (data.length === 0) return null;
  const W = 500;
  const H = 210;
  const pad = { top: 20, right: 20, bottom: 40, left: 35 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const max = Math.max(...data.map((d) => d.cycleCount));
  const avg = data.reduce((sum, d) => sum + d.cycleCount, 0) / data.length;
  const yMax = Math.max(max, 1);
  const barW = Math.min(plotW / data.length - 4, 40);

  // Tournament boundaries (between bar i-1 and bar i) — only rendered when showing tournaments.
  const tournamentBoundaries: number[] = [];
  if (showTournament) {
    for (let i = 1; i < data.length; i++) {
      if (data[i].tournamentId !== data[i - 1].tournamentId) {
        tournamentBoundaries.push(i);
      }
    }
  }

  return (
    <div className="pmva-svg-chart">
      <h4>Cycles per Tracked Match</h4>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHover(null)}
      >
        {Array.from({ length: 5 }, (_, i) => {
          const yVal = (yMax / 4) * i;
          const y = pad.top + plotH - (yVal / yMax) * plotH;
          return (
            <g key={i}>
              <line className="grid-line" x1={pad.left} y1={y} x2={W - pad.right} y2={y} />
              <text className="axis-label" x={pad.left - 4} y={y + 3} textAnchor="end">
                {Math.round(yVal)}
              </text>
            </g>
          );
        })}
        {tournamentBoundaries.map((bi) => {
          const x = pad.left + bi * (plotW / data.length);
          return (
            <line
              key={`tb-${bi}`}
              className="tournament-separator"
              x1={x}
              y1={pad.top}
              x2={x}
              y2={H - pad.bottom}
            />
          );
        })}
        {data.map((d, i) => {
          const x = pad.left + (i + 0.5) * (plotW / data.length) - barW / 2;
          const barH = (d.cycleCount / yMax) * plotH;
          const y = pad.top + plotH - barH;
          return (
            <g key={`${d.tournamentId}-${d.level}-${d.matchId}`}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                fill="var(--color-accent)"
                rx={2}
                onMouseEnter={() =>
                  setHover({
                    x: x + barW / 2,
                    y,
                    tournament: d.tournamentId,
                    detail: `${matchLabel(d.level, d.matchId)}: ${d.cycleCount} cycle${d.cycleCount === 1 ? "" : "s"}`,
                  })
                }
                onMouseLeave={() => setHover(null)}
              />
              {!showTournament && (
                <text
                  className="axis-label"
                  x={x + barW / 2}
                  y={H - pad.bottom + 14}
                  textAnchor="middle"
                >
                  {matchLabel(d.level, d.matchId)}
                </text>
              )}
              <text
                className="axis-label"
                x={x + barW / 2}
                y={y - 4}
                textAnchor="middle"
                fontWeight={700}
              >
                {d.cycleCount}
              </text>
            </g>
          );
        })}
        {avg > 0 && (
          <>
            <line
              className="avg-line"
              x1={pad.left}
              y1={pad.top + plotH - (avg / yMax) * plotH}
              x2={W - pad.right}
              y2={pad.top + plotH - (avg / yMax) * plotH}
            />
            <text
              className="axis-label"
              x={W - pad.right + 2}
              y={pad.top + plotH - (avg / yMax) * plotH + 3}
              fill="var(--color-accent)"
              fontSize={9}
            >
              avg {formatNum(avg)}
            </text>
          </>
        )}
        <line
          className="max-line"
          x1={pad.left}
          y1={pad.top + plotH - (max / yMax) * plotH}
          x2={W - pad.right}
          y2={pad.top + plotH - (max / yMax) * plotH}
        />
        <line className="axis-line" x1={pad.left} y1={pad.top} x2={pad.left} y2={H - pad.bottom} />
        <line
          className="axis-line"
          x1={pad.left}
          y1={H - pad.bottom}
          x2={W - pad.right}
          y2={H - pad.bottom}
        />
        <text className="axis-label" x={pad.left + plotW / 2} y={H - 4} textAnchor="middle">
          Match
        </text>
      </svg>
      {hover && (
        <div
          className="pmva-tooltip"
          style={{ left: `${(hover.x / W) * 100}%`, top: `${(hover.y / H) * 100}%` }}
        >
          <div>{hover.tournament}</div>
          <div>{hover.detail}</div>
        </div>
      )}
    </div>
  );
}

function HitsMissesChart({
  data,
  showTournament,
}: {
  data: MatchCycleData[];
  showTournament: boolean;
}) {
  const [hover, setHover] = useState<
    { x: number; y: number; tournament: string; detail: string } | null
  >(null);
  if (data.length === 0) return null;
  const W = 500;
  const H = 230;
  const pad = { top: 20, right: 20, bottom: 40, left: 35 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const yMax = Math.max(
    ...data.map((d) => Math.max(d.totalShots, d.totalScores, d.totalMisses, d.totalStuck)),
    1,
  );
  const groupW = plotW / data.length;
  const barW = Math.min(groupW / 5, 14);
  const series = [
    { key: "totalShots" as const, color: COLOR_SHOTS, label: "Shots" },
    { key: "totalScores" as const, color: COLOR_SCORES, label: "Scores" },
    { key: "totalMisses" as const, color: COLOR_MISSES, label: "Misses" },
    { key: "totalStuck" as const, color: COLOR_STUCK, label: "Stuck" },
  ];

  const tournamentBoundaries: number[] = [];
  if (showTournament) {
    for (let i = 1; i < data.length; i++) {
      if (data[i].tournamentId !== data[i - 1].tournamentId) {
        tournamentBoundaries.push(i);
      }
    }
  }

  return (
    <div className="pmva-svg-chart">
      <h4>Shots per Match</h4>
      <div className="pmva-chart-legend">
        {series.map((s) => (
          <span key={s.key} className="pmva-chart-legend-item">
            <span className="pmva-chart-legend-swatch" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHover(null)}
      >
        {Array.from({ length: 5 }, (_, i) => {
          const yVal = (yMax / 4) * i;
          const y = pad.top + plotH - (yVal / yMax) * plotH;
          return (
            <g key={i}>
              <line className="grid-line" x1={pad.left} y1={y} x2={W - pad.right} y2={y} />
              <text className="axis-label" x={pad.left - 4} y={y + 3} textAnchor="end">
                {Math.round(yVal)}
              </text>
            </g>
          );
        })}
        {tournamentBoundaries.map((bi) => {
          const x = pad.left + bi * groupW;
          return (
            <line
              key={`tb-${bi}`}
              className="tournament-separator"
              x1={x}
              y1={pad.top}
              x2={x}
              y2={H - pad.bottom}
            />
          );
        })}
        {data.map((d, i) => {
          const groupX = pad.left + i * groupW;
          const cx = groupX + groupW / 2;
          return (
            <g key={`${d.tournamentId}-${d.level}-${d.matchId}`}>
              {series.map((s, si) => {
                const val = d[s.key];
                const barH = (val / yMax) * plotH;
                const x = cx - (series.length * barW) / 2 + si * barW;
                const barY = pad.top + plotH - barH;
                return (
                  <rect
                    key={s.key}
                    x={x}
                    y={barY}
                    width={barW}
                    height={barH}
                    fill={s.color}
                    rx={1}
                    onMouseEnter={() =>
                      setHover({
                        x: x + barW / 2,
                        y: barY,
                        tournament: d.tournamentId,
                        detail: `${matchLabel(d.level, d.matchId)} ${s.label}: ${val}`,
                      })
                    }
                    onMouseLeave={() => setHover(null)}
                  />
                );
              })}
              {!showTournament && (
                <text
                  className="axis-label"
                  x={cx}
                  y={H - pad.bottom + 14}
                  textAnchor="middle"
                >
                  {matchLabel(d.level, d.matchId)}
                </text>
              )}
            </g>
          );
        })}
        <line className="axis-line" x1={pad.left} y1={pad.top} x2={pad.left} y2={H - pad.bottom} />
        <line
          className="axis-line"
          x1={pad.left}
          y1={H - pad.bottom}
          x2={W - pad.right}
          y2={H - pad.bottom}
        />
        <text className="axis-label" x={pad.left + plotW / 2} y={H - 4} textAnchor="middle">
          Match
        </text>
      </svg>
      {hover && (
        <div
          className="pmva-tooltip"
          style={{ left: `${(hover.x / W) * 100}%`, top: `${(hover.y / H) * 100}%` }}
        >
          <div>{hover.tournament}</div>
          <div>{hover.detail}</div>
        </div>
      )}
    </div>
  );
}

/**
 * Per-match grouped bar chart showing shot rate (shots/sec) and score rate (scores/sec) as a
 * match-level aggregate of the underlying sequence data. Mirrors HitsMissesChart in layout.
 */
function ShotScoreRatePerMatchChart({
  data,
  showTournament,
}: {
  data: SequenceShotData[];
  showTournament: boolean;
}) {
  const [hover, setHover] = useState<
    { x: number; y: number; tournament: string; detail: string } | null
  >(null);
  if (data.length === 0) return null;

  // Group sequences by (tournamentId, level, matchId), preserving insertion order.
  type MatchRate = {
    tournamentId: string;
    level: string;
    matchId: number;
    shotRate: number;
    scoreRate: number;
  };
  const groups = new Map<string, SequenceShotData[]>();
  for (const s of data) {
    const key = `${s.tournamentId}:${s.level}:${s.matchId}`;
    const list = groups.get(key) ?? [];
    list.push(s);
    groups.set(key, list);
  }
  const rows: MatchRate[] = [];
  for (const list of groups.values()) {
    const first = list[0];
    const totalShots = list.reduce((sum, s) => sum + s.shots, 0);
    const totalScores = list.reduce((sum, s) => sum + s.scores, 0);
    const totalTime = list.reduce((sum, s) => sum + s.unloadSeconds, 0);
    rows.push({
      tournamentId: first.tournamentId,
      level: first.level,
      matchId: first.matchId,
      shotRate: totalTime > 0 ? totalShots / totalTime : 0,
      scoreRate: totalTime > 0 ? totalScores / totalTime : 0,
    });
  }

  const W = 500;
  const H = 230;
  const pad = { top: 20, right: 20, bottom: 40, left: 35 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const yMax = Math.max(
    ...rows.map((r) => Math.max(r.shotRate, r.scoreRate)),
    0.1,
  );
  const groupW = plotW / rows.length;
  const barW = Math.min(groupW / 3, 18);
  const series = [
    { key: "shotRate" as const, color: COLOR_SHOTS_SEC, label: "Shots/sec" },
    { key: "scoreRate" as const, color: COLOR_SCORES_SEC, label: "Scores/sec" },
  ];

  const tournamentBoundaries: number[] = [];
  if (showTournament) {
    for (let i = 1; i < rows.length; i++) {
      if (rows[i].tournamentId !== rows[i - 1].tournamentId) {
        tournamentBoundaries.push(i);
      }
    }
  }

  return (
    <div className="pmva-svg-chart">
      <h4>Shots &amp; Score Rate per Match</h4>
      <div className="pmva-chart-legend">
        {series.map((s) => (
          <span key={s.key} className="pmva-chart-legend-item">
            <span className="pmva-chart-legend-swatch" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHover(null)}
      >
        {Array.from({ length: 5 }, (_, i) => {
          const yVal = (yMax / 4) * i;
          const y = pad.top + plotH - (yVal / yMax) * plotH;
          return (
            <g key={i}>
              <line className="grid-line" x1={pad.left} y1={y} x2={W - pad.right} y2={y} />
              <text className="axis-label" x={pad.left - 4} y={y + 3} textAnchor="end">
                {formatNum(yVal)}
              </text>
            </g>
          );
        })}
        {tournamentBoundaries.map((bi) => {
          const x = pad.left + bi * groupW;
          return (
            <line
              key={`tb-${bi}`}
              className="tournament-separator"
              x1={x}
              y1={pad.top}
              x2={x}
              y2={H - pad.bottom}
            />
          );
        })}
        {rows.map((r, i) => {
          const groupX = pad.left + i * groupW;
          const cx = groupX + groupW / 2;
          return (
            <g key={`${r.tournamentId}-${r.level}-${r.matchId}`}>
              {series.map((s, si) => {
                const val = r[s.key];
                const barH = (val / yMax) * plotH;
                const x = cx - (series.length * barW) / 2 + si * barW;
                const barY = pad.top + plotH - barH;
                return (
                  <rect
                    key={s.key}
                    x={x}
                    y={barY}
                    width={barW}
                    height={barH}
                    fill={s.color}
                    rx={1}
                    onMouseEnter={() =>
                      setHover({
                        x: x + barW / 2,
                        y: barY,
                        tournament: r.tournamentId,
                        detail: `${matchLabel(r.level, r.matchId)} ${s.label}: ${formatNum(val)}`,
                      })
                    }
                    onMouseLeave={() => setHover(null)}
                  />
                );
              })}
              {!showTournament && (
                <text
                  className="axis-label"
                  x={cx}
                  y={H - pad.bottom + 14}
                  textAnchor="middle"
                >
                  {matchLabel(r.level, r.matchId)}
                </text>
              )}
            </g>
          );
        })}
        <line className="axis-line" x1={pad.left} y1={pad.top} x2={pad.left} y2={H - pad.bottom} />
        <line
          className="axis-line"
          x1={pad.left}
          y1={H - pad.bottom}
          x2={W - pad.right}
          y2={H - pad.bottom}
        />
        <text className="axis-label" x={pad.left + plotW / 2} y={H - 4} textAnchor="middle">
          Match
        </text>
      </svg>
      {hover && (
        <div
          className="pmva-tooltip"
          style={{ left: `${(hover.x / W) * 100}%`, top: `${(hover.y / H) * 100}%` }}
        >
          <div>{hover.tournament}</div>
          <div>{hover.detail}</div>
        </div>
      )}
    </div>
  );
}

/**
 * Per-match single-bar chart showing overall shot success percentage (totalScores / totalShots).
 * Y axis is fixed at 0–100%.
 */
function ShotSuccessPerMatchChart({
  data,
  showTournament,
}: {
  data: MatchCycleData[];
  showTournament: boolean;
}) {
  const [hover, setHover] = useState<
    { x: number; y: number; tournament: string; detail: string } | null
  >(null);
  if (data.length === 0) return null;

  const W = 500;
  const H = 210;
  const pad = { top: 20, right: 20, bottom: 40, left: 35 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const yMax = 100;
  const barW = Math.min(plotW / data.length - 4, 40);

  const tournamentBoundaries: number[] = [];
  if (showTournament) {
    for (let i = 1; i < data.length; i++) {
      if (data[i].tournamentId !== data[i - 1].tournamentId) {
        tournamentBoundaries.push(i);
      }
    }
  }

  return (
    <div className="pmva-svg-chart">
      <h4>Shot Success Per Match</h4>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHover(null)}
      >
        {[0, 25, 50, 75, 100].map((yVal) => {
          const y = pad.top + plotH - (yVal / yMax) * plotH;
          return (
            <g key={yVal}>
              <line className="grid-line" x1={pad.left} y1={y} x2={W - pad.right} y2={y} />
              <text className="axis-label" x={pad.left - 4} y={y + 3} textAnchor="end">
                {yVal}%
              </text>
            </g>
          );
        })}
        {tournamentBoundaries.map((bi) => {
          const x = pad.left + bi * (plotW / data.length);
          return (
            <line
              key={`tb-${bi}`}
              className="tournament-separator"
              x1={x}
              y1={pad.top}
              x2={x}
              y2={H - pad.bottom}
            />
          );
        })}
        {data.map((d, i) => {
          const pct = d.totalShots > 0 ? (d.totalScores / d.totalShots) * 100 : 0;
          const x = pad.left + (i + 0.5) * (plotW / data.length) - barW / 2;
          const barH = (pct / yMax) * plotH;
          const y = pad.top + plotH - barH;
          return (
            <g key={`${d.tournamentId}-${d.level}-${d.matchId}`}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                fill={COLOR_SCORES}
                rx={2}
                onMouseEnter={() =>
                  setHover({
                    x: x + barW / 2,
                    y,
                    tournament: d.tournamentId,
                    detail: `${matchLabel(d.level, d.matchId)}: ${formatPct(pct)} (${d.totalScores}/${d.totalShots})`,
                  })
                }
                onMouseLeave={() => setHover(null)}
              />
              {!showTournament && (
                <text
                  className="axis-label"
                  x={x + barW / 2}
                  y={H - pad.bottom + 14}
                  textAnchor="middle"
                >
                  {matchLabel(d.level, d.matchId)}
                </text>
              )}
              <text
                className="axis-label"
                x={x + barW / 2}
                y={y - 4}
                textAnchor="middle"
                fontWeight={700}
              >
                {pct.toFixed(0)}
              </text>
            </g>
          );
        })}
        <line className="axis-line" x1={pad.left} y1={pad.top} x2={pad.left} y2={H - pad.bottom} />
        <line
          className="axis-line"
          x1={pad.left}
          y1={H - pad.bottom}
          x2={W - pad.right}
          y2={H - pad.bottom}
        />
        <text className="axis-label" x={pad.left + plotW / 2} y={H - 4} textAnchor="middle">
          Match
        </text>
      </svg>
      {hover && (
        <div
          className="pmva-tooltip"
          style={{ left: `${(hover.x / W) * 100}%`, top: `${(hover.y / H) * 100}%` }}
        >
          <div>{hover.tournament}</div>
          <div>{hover.detail}</div>
        </div>
      )}
    </div>
  );
}

function SuccessPercentChart({ data }: { data: SequenceShotData[] }) {
  const [hover, setHover] = useState<
    { x: number; y: number; tournament: string; detail: string } | null
  >(null);
  if (data.length === 0) return null;

  const W = 500;
  const H = 230;
  const pad = { top: 20, right: 20, bottom: 40, left: 35 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const yMax = 100;
  const n = data.length;

  const xOf = (i: number) => pad.left + (i + 0.5) * (plotW / n);
  const yOf = (v: number) => pad.top + plotH - (v / yMax) * plotH;

  const pctData = data.map((d) => (d.shots === 0 ? 0 : (d.scores / d.shots) * 100));
  const toPath = pctData.map((v, i) => `${i === 0 ? "M" : "L"}${xOf(i)},${yOf(v)}`).join(" ");

  const matchBoundaries: number[] = [];
  for (let i = 1; i < data.length; i++) {
    if (
      data[i].matchId !== data[i - 1].matchId ||
      data[i].level !== data[i - 1].level ||
      data[i].tournamentId !== data[i - 1].tournamentId
    ) {
      matchBoundaries.push(i);
    }
  }

  return (
    <div className="pmva-svg-chart">
      <h4>Successful Shots per Cycle</h4>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHover(null)}
      >
        {[0, 25, 50, 75, 100].map((yVal) => {
          const y = yOf(yVal);
          return (
            <g key={yVal}>
              <line className="grid-line" x1={pad.left} y1={y} x2={W - pad.right} y2={y} />
              <text className="axis-label" x={pad.left - 4} y={y + 3} textAnchor="end">
                {yVal}%
              </text>
            </g>
          );
        })}
        {matchBoundaries.map((bi) => (
          <line
            key={bi}
            className="match-separator"
            x1={xOf(bi) - plotW / n / 2}
            y1={pad.top}
            x2={xOf(bi) - plotW / n / 2}
            y2={H - pad.bottom}
          />
        ))}
        <path d={toPath} fill="none" stroke={COLOR_SCORES} strokeWidth={2} />
        {data.map((d, i) => (
          <circle
            key={i}
            className="data-point"
            cx={xOf(i)}
            cy={yOf(pctData[i])}
            r={4}
            fill={COLOR_SCORES}
            opacity={0}
            onMouseEnter={() =>
              setHover({
                x: xOf(i),
                y: yOf(pctData[i]),
                tournament: d.tournamentId,
                detail: `${matchLabel(d.level, d.matchId)} Seq ${d.sequenceIndex}: ${formatPct(pctData[i])} (${d.scores}/${d.shots})`,
              })
            }
            onMouseLeave={() => setHover(null)}
          />
        ))}
        <line className="axis-line" x1={pad.left} y1={pad.top} x2={pad.left} y2={H - pad.bottom} />
        <line
          className="axis-line"
          x1={pad.left}
          y1={H - pad.bottom}
          x2={W - pad.right}
          y2={H - pad.bottom}
        />
        <text className="axis-label" x={pad.left + plotW / 2} y={H - 4} textAnchor="middle">
          Cycle
        </text>
      </svg>
      {hover && (
        <div
          className="pmva-tooltip"
          style={{ left: `${(hover.x / W) * 100}%`, top: `${(hover.y / H) * 100}%` }}
        >
          <div>{hover.tournament}</div>
          <div>{hover.detail}</div>
        </div>
      )}
    </div>
  );
}

function ShotsLineChart({ data }: { data: SequenceShotData[] }) {
  const [hover, setHover] = useState<
    { x: number; y: number; tournament: string; detail: string } | null
  >(null);
  if (data.length === 0) return null;

  const W = 500;
  const H = 230;
  const pad = { top: 20, right: 20, bottom: 40, left: 35 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const yMax = Math.max(...data.map((d) => Math.max(d.shots, d.scores, d.misses)), 1);
  const n = data.length;

  const xOf = (i: number) => pad.left + (i + 0.5) * (plotW / n);
  const yOf = (v: number) => pad.top + plotH - (v / yMax) * plotH;

  const toPath = (getter: (d: SequenceShotData) => number) =>
    data.map((d, i) => `${i === 0 ? "M" : "L"}${xOf(i)},${yOf(getter(d))}`).join(" ");

  const matchBoundaries: number[] = [];
  for (let i = 1; i < data.length; i++) {
    if (
      data[i].matchId !== data[i - 1].matchId ||
      data[i].level !== data[i - 1].level ||
      data[i].tournamentId !== data[i - 1].tournamentId
    ) {
      matchBoundaries.push(i);
    }
  }

  const series = [
    { getter: (d: SequenceShotData) => d.shots, color: COLOR_SHOTS, label: "Shots" },
    { getter: (d: SequenceShotData) => d.scores, color: COLOR_SCORES, label: "Scores" },
    { getter: (d: SequenceShotData) => d.misses, color: COLOR_MISSES, label: "Misses" },
  ];

  return (
    <div className="pmva-svg-chart">
      <h4>Shots per Cycle</h4>
      <div className="pmva-chart-legend">
        {series.map((s) => (
          <span key={s.label} className="pmva-chart-legend-item">
            <span className="pmva-chart-legend-swatch" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHover(null)}
      >
        {Array.from({ length: 5 }, (_, i) => {
          const yVal = (yMax / 4) * i;
          const y = pad.top + plotH - (yVal / yMax) * plotH;
          return (
            <g key={i}>
              <line className="grid-line" x1={pad.left} y1={y} x2={W - pad.right} y2={y} />
              <text className="axis-label" x={pad.left - 4} y={y + 3} textAnchor="end">
                {Math.round(yVal)}
              </text>
            </g>
          );
        })}
        {matchBoundaries.map((bi) => (
          <line
            key={bi}
            className="match-separator"
            x1={xOf(bi) - plotW / n / 2}
            y1={pad.top}
            x2={xOf(bi) - plotW / n / 2}
            y2={H - pad.bottom}
          />
        ))}
        {series.map((s) => (
          <path key={s.label} d={toPath(s.getter)} fill="none" stroke={s.color} strokeWidth={2} />
        ))}
        {data.map((d, i) =>
          series.map((s) => (
            <circle
              key={`${s.label}-${i}`}
              className="data-point"
              cx={xOf(i)}
              cy={yOf(s.getter(d))}
              r={4}
              fill={s.color}
              opacity={0}
              onMouseEnter={() =>
                setHover({
                  x: xOf(i),
                  y: yOf(s.getter(d)),
                  tournament: d.tournamentId,
                  detail: `${matchLabel(d.level, d.matchId)} Seq ${d.sequenceIndex}, ${s.label.toLowerCase()}: ${s.getter(d)}`,
                })
              }
              onMouseLeave={() => setHover(null)}
            />
          )),
        )}
        <line className="axis-line" x1={pad.left} y1={pad.top} x2={pad.left} y2={H - pad.bottom} />
        <line
          className="axis-line"
          x1={pad.left}
          y1={H - pad.bottom}
          x2={W - pad.right}
          y2={H - pad.bottom}
        />
        <text className="axis-label" x={pad.left + plotW / 2} y={H - 4} textAnchor="middle">
          Cycle
        </text>
      </svg>
      {hover && (
        <div
          className="pmva-tooltip"
          style={{ left: `${(hover.x / W) * 100}%`, top: `${(hover.y / H) * 100}%` }}
        >
          <div>{hover.tournament}</div>
          <div>{hover.detail}</div>
        </div>
      )}
    </div>
  );
}

/**
 * Unload Time (s) per cycle — single-series line chart. Replaces one axis of the old combined
 * TimeLineChart so unload time can be read on its own scale (seconds).
 */
function UnloadTimeChart({ data }: { data: SequenceShotData[] }) {
  const [hover, setHover] = useState<
    { x: number; y: number; tournament: string; detail: string } | null
  >(null);
  if (data.length === 0) return null;

  const W = 500;
  const H = 210;
  const pad = { top: 20, right: 20, bottom: 40, left: 35 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const yMax = Math.max(...data.map((d) => d.unloadSeconds), 0.1);
  const n = data.length;

  const xOf = (i: number) => pad.left + (i + 0.5) * (plotW / n);
  const yOf = (v: number) => pad.top + plotH - ((v as number) / yMax) * plotH;

  const toPath = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${xOf(i)},${yOf(d.unloadSeconds)}`)
    .join(" ");

  const matchBoundaries: number[] = [];
  for (let i = 1; i < data.length; i++) {
    if (
      data[i].matchId !== data[i - 1].matchId ||
      data[i].level !== data[i - 1].level ||
      data[i].tournamentId !== data[i - 1].tournamentId
    ) {
      matchBoundaries.push(i);
    }
  }

  return (
    <div className="pmva-svg-chart">
      <h4>Unload Time (s)</h4>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHover(null)}
      >
        {Array.from({ length: 5 }, (_, i) => {
          const yVal = (yMax / 4) * i;
          const y = pad.top + plotH - (yVal / yMax) * plotH;
          return (
            <g key={i}>
              <line className="grid-line" x1={pad.left} y1={y} x2={W - pad.right} y2={y} />
              <text className="axis-label" x={pad.left - 4} y={y + 3} textAnchor="end">
                {formatNum(yVal)}
              </text>
            </g>
          );
        })}
        {matchBoundaries.map((bi) => (
          <line
            key={bi}
            className="match-separator"
            x1={xOf(bi) - plotW / n / 2}
            y1={pad.top}
            x2={xOf(bi) - plotW / n / 2}
            y2={H - pad.bottom}
          />
        ))}
        <path d={toPath} fill="none" stroke={COLOR_UNLOAD} strokeWidth={2} />
        {data.map((d, i) => (
          <circle
            key={i}
            className="data-point"
            cx={xOf(i)}
            cy={yOf(d.unloadSeconds)}
            r={4}
            fill={COLOR_UNLOAD}
            opacity={0}
            onMouseEnter={() =>
              setHover({
                x: xOf(i),
                y: yOf(d.unloadSeconds),
                tournament: d.tournamentId,
                detail: `${matchLabel(d.level, d.matchId)} Seq ${d.sequenceIndex}: ${formatNum(d.unloadSeconds)}s`,
              })
            }
            onMouseLeave={() => setHover(null)}
          />
        ))}
        <line className="axis-line" x1={pad.left} y1={pad.top} x2={pad.left} y2={H - pad.bottom} />
        <line
          className="axis-line"
          x1={pad.left}
          y1={H - pad.bottom}
          x2={W - pad.right}
          y2={H - pad.bottom}
        />
        <text className="axis-label" x={pad.left + plotW / 2} y={H - 4} textAnchor="middle">
          Cycle
        </text>
      </svg>
      {hover && (
        <div
          className="pmva-tooltip"
          style={{ left: `${(hover.x / W) * 100}%`, top: `${(hover.y / H) * 100}%` }}
        >
          <div>{hover.tournament}</div>
          <div>{hover.detail}</div>
        </div>
      )}
    </div>
  );
}

/**
 * Shots/sec and Scores/sec on a shared rate axis. Pair of the old combined timing chart, split
 * because unload-time-in-seconds and rate-per-second have incompatible scales on one axis.
 */
function ShotRateChart({ data }: { data: SequenceShotData[] }) {
  const [hover, setHover] = useState<
    { x: number; y: number; tournament: string; detail: string } | null
  >(null);
  if (data.length === 0) return null;

  const W = 500;
  const H = 230;
  const pad = { top: 20, right: 20, bottom: 40, left: 35 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const yMax = Math.max(
    ...data.map((d) => Math.max(d.shotsPerSecond, d.scoresPerSecond)),
    0.1,
  );
  const n = data.length;

  const xOf = (i: number) => pad.left + (i + 0.5) * (plotW / n);
  const yOf = (v: number) => pad.top + plotH - (v / yMax) * plotH;

  const toPath = (getter: (d: SequenceShotData) => number) =>
    data.map((d, i) => `${i === 0 ? "M" : "L"}${xOf(i)},${yOf(getter(d))}`).join(" ");

  const matchBoundaries: number[] = [];
  for (let i = 1; i < data.length; i++) {
    if (
      data[i].matchId !== data[i - 1].matchId ||
      data[i].level !== data[i - 1].level ||
      data[i].tournamentId !== data[i - 1].tournamentId
    ) {
      matchBoundaries.push(i);
    }
  }

  const series = [
    { getter: (d: SequenceShotData) => d.shotsPerSecond, color: COLOR_SHOTS_SEC, label: "Shots/sec" },
    { getter: (d: SequenceShotData) => d.scoresPerSecond, color: COLOR_SCORES_SEC, label: "Scores/sec" },
  ];

  return (
    <div className="pmva-svg-chart">
      <h4>Shot &amp; Score Rate per Cycle</h4>
      <div className="pmva-chart-legend">
        {series.map((s) => (
          <span key={s.label} className="pmva-chart-legend-item">
            <span className="pmva-chart-legend-swatch" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHover(null)}
      >
        {Array.from({ length: 5 }, (_, i) => {
          const yVal = (yMax / 4) * i;
          const y = pad.top + plotH - (yVal / yMax) * plotH;
          return (
            <g key={i}>
              <line className="grid-line" x1={pad.left} y1={y} x2={W - pad.right} y2={y} />
              <text className="axis-label" x={pad.left - 4} y={y + 3} textAnchor="end">
                {formatNum(yVal)}
              </text>
            </g>
          );
        })}
        {matchBoundaries.map((bi) => (
          <line
            key={bi}
            className="match-separator"
            x1={xOf(bi) - plotW / n / 2}
            y1={pad.top}
            x2={xOf(bi) - plotW / n / 2}
            y2={H - pad.bottom}
          />
        ))}
        {series.map((s) => (
          <path key={s.label} d={toPath(s.getter)} fill="none" stroke={s.color} strokeWidth={2} />
        ))}
        {data.map((d, i) =>
          series.map((s) => (
            <circle
              key={`${s.label}-${i}`}
              className="data-point"
              cx={xOf(i)}
              cy={yOf(s.getter(d))}
              r={4}
              fill={s.color}
              opacity={0}
              onMouseEnter={() =>
                setHover({
                  x: xOf(i),
                  y: yOf(s.getter(d)),
                  tournament: d.tournamentId,
                  detail: `${matchLabel(d.level, d.matchId)} Seq ${d.sequenceIndex}, ${s.label}: ${formatNum(s.getter(d))}`,
                })
              }
              onMouseLeave={() => setHover(null)}
            />
          )),
        )}
        <line className="axis-line" x1={pad.left} y1={pad.top} x2={pad.left} y2={H - pad.bottom} />
        <line
          className="axis-line"
          x1={pad.left}
          y1={H - pad.bottom}
          x2={W - pad.right}
          y2={H - pad.bottom}
        />
        <text className="axis-label" x={pad.left + plotW / 2} y={H - 4} textAnchor="middle">
          Cycle
        </text>
      </svg>
      {hover && (
        <div
          className="pmva-tooltip"
          style={{ left: `${(hover.x / W) * 100}%`, top: `${(hover.y / H) * 100}%` }}
        >
          <div>{hover.tournament}</div>
          <div>{hover.detail}</div>
        </div>
      )}
    </div>
  );
}

// ── Shooting subsections ────────────────────────────────────────────────

function LoadingSubsection({
  loading,
  showTournament,
}: {
  loading: LoadingStats;
  showTournament: boolean;
}) {
  return (
    <>
      <h3>Loading</h3>
      <table className="pmva-stats-table">
        <tbody>
          <tr>
            <td>Average Hopper Fill Count</td>
            <td>{formatNum(loading.avgFillCount)}</td>
          </tr>
          <tr>
            <td>Hopper Filled %</td>
            <td>{formatPct(loading.hopperFilledPercentage)}</td>
          </tr>
          <tr>
            <td>Max Hopper Fill (excl. intaking)</td>
            <td>{formatNum(loading.maxFillExcludingIntaking)}</td>
          </tr>
        </tbody>
      </table>
      <CommentAccordion
        title="Cycle Load Comments"
        comments={loading.loadComments}
        showTournament={showTournament}
      />
      <CommentAccordion
        title="Cycle Shoot Comments"
        comments={loading.shootComments}
        showTournament={showTournament}
      />
    </>
  );
}

function SequenceDrilldownTable({ sequences }: { sequences: SequenceShotData[] }) {
  if (sequences.length === 0) return null;
  return (
    <table className="pmva-stats-table">
      <thead>
        <tr>
          <th>Seq</th>
          <th>Shots</th>
          <th>Scores</th>
          <th>Misses</th>
          <th>Stuck</th>
          <th>Unload (s)</th>
          <th>Shots/sec</th>
          <th>Scores/sec</th>
        </tr>
      </thead>
      <tbody>
        {sequences.map((s) => (
          <tr key={s.sequenceIndex}>
            <td>{s.sequenceIndex}</td>
            <td>{s.shots}</td>
            <td>{s.scores}</td>
            <td>{s.misses}</td>
            <td>{s.stuck}</td>
            <td>{formatNum(s.unloadSeconds)}</td>
            <td>{formatNum(s.shotsPerSecond)}</td>
            <td>{formatNum(s.scoresPerSecond)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ShootingViewAccordion({
  view,
  title,
  defaultOpen,
  showTournament,
  enableSequenceDrilldown,
}: {
  view: ShootingView;
  title: string;
  defaultOpen?: boolean;
  showTournament: boolean;
  enableSequenceDrilldown: boolean;
}) {
  if (view.sequenceCount === 0) return null;

  const avgUnload =
    view.sequenceShots.length > 0
      ? view.sequenceShots.reduce((sum, s) => sum + s.unloadSeconds, 0) / view.sequenceShots.length
      : 0;
  const totalShots = view.sequenceShots.reduce((sum, s) => sum + s.shots, 0);
  const totalTime = view.sequenceShots.reduce((sum, s) => sum + s.unloadSeconds, 0);
  const totalScores = view.sequenceShots.reduce((sum, s) => sum + s.scores, 0);
  const successPct = safeDivide(totalScores * 100, totalShots);
  const trackedMatches = view.matchCycles.length;
  const avgScoresPerMatch = safeDivide(totalScores, trackedMatches);

  // Group sequence shots by (tournamentId, level, matchId) for the per-match drill-down.
  const sequencesByMatchKey = new Map<string, SequenceShotData[]>();
  for (const s of view.sequenceShots) {
    const key = `${s.tournamentId}:${s.level}:${s.matchId}`;
    const list = sequencesByMatchKey.get(key) ?? [];
    list.push(s);
    sequencesByMatchKey.set(key, list);
  }

  return (
    <details className="pmva-accordion" open={defaultOpen}>
      <summary>
        {title} ({view.sequenceCount} sequences)
      </summary>
      <div className="pmva-accordion-body">
        <table className="pmva-stats-table">
          <tbody>
            <tr>
              <td>Average Scores Per Match</td>
              <td>{formatNum(avgScoresPerMatch)}</td>
            </tr>
            <tr>
              <td>Average Shots Per Second</td>
              <td>{formatNum(safeDivide(totalShots, totalTime))}</td>
            </tr>
            <tr>
              <td>Average Scores Per Second</td>
              <td>{formatNum(safeDivide(totalScores, totalTime))}</td>
            </tr>
            <tr>
              <td>Shot Success Rate</td>
              <td>
                {formatPct(successPct)} ({totalScores}/{totalShots})
              </td>
            </tr>
            <tr>
              <td>Shot Rating</td>
              <td>
                <StarRating value={successPct / 20} max={5} />
              </td>
            </tr>
            <tr>
              <td>Average Unload Time Per Cycle</td>
              <td>{formatNum(avgUnload)}s</td>
            </tr>
          </tbody>
        </table>

        <MatchCyclesChart data={view.matchCycles} showTournament={showTournament} />
        <HitsMissesChart data={view.matchCycles} showTournament={showTournament} />
        <ShotScoreRatePerMatchChart
          data={view.sequenceShots}
          showTournament={showTournament}
        />
        <ShotSuccessPerMatchChart
          data={view.matchCycles}
          showTournament={showTournament}
        />
        <ShotsLineChart data={view.sequenceShots} />
        <SuccessPercentChart data={view.sequenceShots} />
        <ShotRateChart data={view.sequenceShots} />
        <UnloadTimeChart data={view.sequenceShots} />

        {enableSequenceDrilldown && (
          <details className="pmva-accordion">
            <summary>Per-Match Sequence Detail ({view.matchCycles.length})</summary>
            <div className="pmva-accordion-body">
              {view.matchCycles.map((mc) => {
                const key = `${mc.tournamentId}:${mc.level}:${mc.matchId}`;
                const sequences = sequencesByMatchKey.get(key) ?? [];
                return (
                  <details className="pmva-accordion" key={key}>
                    <summary>
                      {matchLabel(mc.level, mc.matchId, mc.tournamentId, showTournament)} —{" "}
                      {mc.cycleCount} cycle{mc.cycleCount === 1 ? "" : "s"}
                    </summary>
                    <div className="pmva-accordion-body">
                      <SequenceDrilldownTable sequences={sequences} />
                    </div>
                  </details>
                );
              })}
            </div>
          </details>
        )}
      </div>
    </details>
  );
}

// ── Shooting Card (formerly Hopper) ─────────────────────────────────────

function ShootingCard({
  shooting,
  showTournament,
  enableSequenceDrilldown,
}: {
  shooting: ShootingSection;
  showTournament: boolean;
  enableSequenceDrilldown: boolean;
}) {
  const all = shooting.shootingAll;
  return (
    <section className="card">
      <h2>Intaking and Scoring</h2>
      <p className="pmva-legend">
        {all && all.matchCycles.length > 0 && (
          <>
            Matches analyzed:{" "}
            <strong>
              {all.matchCycles
                .map((m) => matchLabel(m.level, m.matchId, m.tournamentId, showTournament))
                .join(", ")}
            </strong>
            <br />
          </>
        )}
        Total count of cycles analyzed: <strong>{all?.sequenceCount ?? 0}</strong>
      </p>

      <LoadingSubsection loading={shooting.loading} showTournament={showTournament} />

      {all && (
        <ShootingViewAccordion
          view={all}
          title="Shooting — All"
          defaultOpen
          showTournament={showTournament}
          enableSequenceDrilldown={enableSequenceDrilldown}
        />
      )}
      {shooting.shootingClose && shooting.shootingClose.sequenceCount > 0 && (
        <ShootingViewAccordion
          view={shooting.shootingClose}
          title="Shooting — Close"
          showTournament={showTournament}
          enableSequenceDrilldown={enableSequenceDrilldown}
        />
      )}
      {shooting.shootingMid && shooting.shootingMid.sequenceCount > 0 && (
        <ShootingViewAccordion
          view={shooting.shootingMid}
          title="Shooting — Mid"
          showTournament={showTournament}
          enableSequenceDrilldown={enableSequenceDrilldown}
        />
      )}
      {shooting.shootingFar && shooting.shootingFar.sequenceCount > 0 && (
        <ShootingViewAccordion
          view={shooting.shootingFar}
          title="Shooting — Far"
          showTournament={showTournament}
          enableSequenceDrilldown={enableSequenceDrilldown}
        />
      )}
      {shooting.shootingMoving && shooting.shootingMoving.sequenceCount > 0 && (
        <ShootingViewAccordion
          view={shooting.shootingMoving}
          title="Shooting — Moving"
          showTournament={showTournament}
          enableSequenceDrilldown={enableSequenceDrilldown}
        />
      )}
      {shooting.shootingIntaking && shooting.shootingIntaking.sequenceCount > 0 && (
        <ShootingViewAccordion
          view={shooting.shootingIntaking}
          title="Shooting — Intaking (SWI)"
          showTournament={showTournament}
          enableSequenceDrilldown={enableSequenceDrilldown}
        />
      )}
    </section>
  );
}

// ── Public component ────────────────────────────────────────────────────

type PmvaTournamentViewProps = {
  report: PmvaReport;
  /**
   * When true, match labels, tooltips, and the "matches analyzed" list prefix every match with
   * its tournament id so cross-tournament aggregates (like the Robot Performance report) can
   * disambiguate matches that share numbers.
   */
  showTournamentInLabels?: boolean;
  /** Show the per-match sequence drill-down tables. Defaults to on. */
  enableSequenceDrilldown?: boolean;
};

export default function PmvaTournamentView({
  report,
  showTournamentInLabels = false,
  enableSequenceDrilldown = true,
}: PmvaTournamentViewProps) {
  if (report.matchCount === 0) {
    return <p>No PMVA data recorded.</p>;
  }

  return (
    <>
      <GeneralCard
        general={report.general}
        matchCount={report.matchCount}
        showTournament={showTournamentInLabels}
      />
      <ShootingCard
        shooting={report.shooting}
        showTournament={showTournamentInLabels}
        enableSequenceDrilldown={enableSequenceDrilldown}
      />
    </>
  );
}
