import { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { useSequenceTypeList } from "~/common/storage/dbhooks.ts";
import {
  getPmvaReport,
  getTournamentSequenceReport,
} from "~/common/storage/rb.ts";
import Spinner from "~/common/Spinner.tsx";
import Star from "~/common/icons/Star.tsx";
import type { TournamentSequenceReport } from "~/types/SequenceReport.ts";
import type {
  PmvaReport,
  MatchComment,
  GeneralSection,
  HopperSection,
  LoadingStats,
  ShootingView,
  MatchCycleData,
  SequenceShotData,
} from "~/types/PmvaReport.ts";

const LEVEL_PREFIX: Record<string, string> = {
  Practice: "P",
  Qualification: "Q",
  Playoff: "E",
};

function matchLabel(level: string, matchId: number): string {
  return (LEVEL_PREFIX[level] ?? level.charAt(0)) + matchId;
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

function StarRating({ value }: { value: number }) {
  const full = Math.floor(value);
  const empty = 5 - full;
  return (
    <span className="pmva-stars" title={value.toFixed(1) + " / 5"}>
      {Array.from({ length: full }, (_, i) => (
        <Star key={`f${i}`} filled={true} />
      ))}
      {Array.from({ length: empty }, (_, i) => (
        <Star key={`e${i}`} filled={false} />
      ))}
    </span>
  );
}

function CommentAccordion({
  title,
  comments,
}: {
  title: string;
  comments: MatchComment[];
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
                <td>{matchLabel(c.level, c.matchId)}</td>
                <td>{c.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function GeneralCard({ general, matchCount }: { general: GeneralSection; matchCount: number }) {
  return (
    <section className="card">
      <h2>Summary &amp; General</h2>

      <table className="pmva-stats-table">
        <tbody>
          <tr>
            <td>Matches with Robot Breakdown</td>
            <td>
              {general.breakdownCount} / {matchCount} ({formatPct(general.breakdownPercentage)})
            </td>
          </tr>
        </tbody>
      </table>

      <CommentAccordion title="Breakdown Details" comments={general.breakdownNotes} />
      <CommentAccordion title="Intake Comments" comments={general.intakeComments} />
      <CommentAccordion title="Shooter Comments" comments={general.shooterComments} />
      <CommentAccordion title="General Comments" comments={general.generalComments} />
      <CommentAccordion title="Suggestions" comments={general.suggestions} />
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

// ── SVG Chart Components ───────────────────────────────────────────────

function MatchCyclesChart({
  data,
  avg,
  max,
}: {
  data: MatchCycleData[];
  avg: number;
  max: number;
}) {
  if (data.length === 0) return null;
  const W = 500;
  const H = 210;
  const pad = { top: 20, right: 20, bottom: 40, left: 35 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const yMax = Math.max(max, 1);
  const barW = Math.min(plotW / data.length - 4, 40);

  return (
    <div className="pmva-svg-chart">
      <h4>Cycles per Match</h4>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        {/* Y axis gridlines */}
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
        {/* Bars */}
        {data.map((d, i) => {
          const x = pad.left + (i + 0.5) * (plotW / data.length) - barW / 2;
          const barH = (d.cycleCount / yMax) * plotH;
          const y = pad.top + plotH - barH;
          return (
            <g key={`${d.level}-${d.matchId}`}>
              <rect x={x} y={y} width={barW} height={barH} fill="var(--color-accent)" rx={2} />
              <text className="axis-label" x={x + barW / 2} y={H - pad.bottom + 14} textAnchor="middle">
                {matchLabel(d.level, d.matchId)}
              </text>
              <text className="axis-label" x={x + barW / 2} y={y - 4} textAnchor="middle" fontWeight={700}>
                {d.cycleCount}
              </text>
            </g>
          );
        })}
        {/* Average line */}
        {avg > 0 && (
          <>
            <line
              className="avg-line"
              x1={pad.left}
              y1={pad.top + plotH - (avg / yMax) * plotH}
              x2={W - pad.right}
              y2={pad.top + plotH - (avg / yMax) * plotH}
            />
            <text className="axis-label" x={W - pad.right + 2} y={pad.top + plotH - (avg / yMax) * plotH + 3} fill="var(--color-accent)" fontSize={9}>
              avg {formatNum(avg)}
            </text>
          </>
        )}
        {/* Max line */}
        <line
          className="max-line"
          x1={pad.left}
          y1={pad.top + plotH - (max / yMax) * plotH}
          x2={W - pad.right}
          y2={pad.top + plotH - (max / yMax) * plotH}
        />
        {/* Axes */}
        <line className="axis-line" x1={pad.left} y1={pad.top} x2={pad.left} y2={H - pad.bottom} />
        <line className="axis-line" x1={pad.left} y1={H - pad.bottom} x2={W - pad.right} y2={H - pad.bottom} />
        {/* X axis title */}
        <text className="axis-label" x={pad.left + plotW / 2} y={H - 4} textAnchor="middle">Match</text>
      </svg>
    </div>
  );
}

function HitsMissesChart({ data }: { data: MatchCycleData[] }) {
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
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        {/* Y gridlines */}
        {Array.from({ length: 5 }, (_, i) => {
          const yVal = (yMax / 4) * i;
          const y = pad.top + plotH - (yVal / yMax) * plotH;
          return (
            <g key={i}>
              <line className="grid-line" x1={pad.left} y1={y} x2={W - pad.right} y2={y} />
              <text className="axis-label" x={pad.left - 4} y={y + 3} textAnchor="end">{Math.round(yVal)}</text>
            </g>
          );
        })}
        {/* Grouped bars */}
        {data.map((d, i) => {
          const groupX = pad.left + i * groupW;
          const cx = groupX + groupW / 2;
          return (
            <g key={`${d.level}-${d.matchId}`}>
              {series.map((s, si) => {
                const val = d[s.key];
                const barH = (val / yMax) * plotH;
                const x = cx - (series.length * barW) / 2 + si * barW;
                return (
                  <rect
                    key={s.key}
                    x={x}
                    y={pad.top + plotH - barH}
                    width={barW}
                    height={barH}
                    fill={s.color}
                    rx={1}
                  />
                );
              })}
              <text className="axis-label" x={cx} y={H - pad.bottom + 14} textAnchor="middle">
                {matchLabel(d.level, d.matchId)}
              </text>
            </g>
          );
        })}
        {/* Axes */}
        <line className="axis-line" x1={pad.left} y1={pad.top} x2={pad.left} y2={H - pad.bottom} />
        <line className="axis-line" x1={pad.left} y1={H - pad.bottom} x2={W - pad.right} y2={H - pad.bottom} />
        {/* X axis title */}
        <text className="axis-label" x={pad.left + plotW / 2} y={H - 4} textAnchor="middle">Match</text>
      </svg>
    </div>
  );
}

function SuccessPercentChart({ data, tournamentId }: { data: SequenceShotData[]; tournamentId: string }) {
  const [hover, setHover] = useState<{ x: number; y: number; label: string } | null>(null);
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
    if (data[i].matchId !== data[i - 1].matchId || data[i].level !== data[i - 1].level) {
      matchBoundaries.push(i);
    }
  }

  return (
    <div className="pmva-svg-chart">
      <h4>Successful Shots per Cycle</h4>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" onMouseLeave={() => setHover(null)}>
        {/* Y gridlines at 0%, 25%, 50%, 75%, 100% */}
        {[0, 25, 50, 75, 100].map((yVal) => {
          const y = yOf(yVal);
          return (
            <g key={yVal}>
              <line className="grid-line" x1={pad.left} y1={y} x2={W - pad.right} y2={y} />
              <text className="axis-label" x={pad.left - 4} y={y + 3} textAnchor="end">{yVal}%</text>
            </g>
          );
        })}
        {/* Match separators */}
        {matchBoundaries.map((bi) => (
          <line key={bi} className="match-separator" x1={xOf(bi) - plotW / n / 2} y1={pad.top} x2={xOf(bi) - plotW / n / 2} y2={H - pad.bottom} />
        ))}
        {/* Line */}
        <path d={toPath} fill="none" stroke={COLOR_SCORES} strokeWidth={2} />
        {/* Hover points */}
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
                label: `${tournamentId} ${matchLabel(d.level, d.matchId)} Seq ${d.sequenceIndex}: ${formatPct(pctData[i])} (${d.scores}/${d.shots})`,
              })
            }
            onMouseLeave={() => setHover(null)}
          />
        ))}
        {/* Axes */}
        <line className="axis-line" x1={pad.left} y1={pad.top} x2={pad.left} y2={H - pad.bottom} />
        <line className="axis-line" x1={pad.left} y1={H - pad.bottom} x2={W - pad.right} y2={H - pad.bottom} />
        {/* X axis title */}
        <text className="axis-label" x={pad.left + plotW / 2} y={H - 4} textAnchor="middle">Cycle</text>
      </svg>
      {hover && (
        <div
          className="pmva-tooltip"
          style={{ left: `${(hover.x / W) * 100}%`, top: `${(hover.y / H) * 100}%` }}
        >
          {hover.label}
        </div>
      )}
    </div>
  );
}

function ShotsLineChart({ data, tournamentId }: { data: SequenceShotData[]; tournamentId: string }) {
  const [hover, setHover] = useState<{ x: number; y: number; label: string } | null>(null);
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

  // Detect match boundaries for separators
  const matchBoundaries: number[] = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i].matchId !== data[i - 1].matchId || data[i].level !== data[i - 1].level) {
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
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" onMouseLeave={() => setHover(null)}>
        {/* Y gridlines */}
        {Array.from({ length: 5 }, (_, i) => {
          const yVal = (yMax / 4) * i;
          const y = pad.top + plotH - (yVal / yMax) * plotH;
          return (
            <g key={i}>
              <line className="grid-line" x1={pad.left} y1={y} x2={W - pad.right} y2={y} />
              <text className="axis-label" x={pad.left - 4} y={y + 3} textAnchor="end">{Math.round(yVal)}</text>
            </g>
          );
        })}
        {/* Match separators */}
        {matchBoundaries.map((bi) => (
          <line key={bi} className="match-separator" x1={xOf(bi) - plotW / n / 2} y1={pad.top} x2={xOf(bi) - plotW / n / 2} y2={H - pad.bottom} />
        ))}
        {/* Lines */}
        {series.map((s) => (
          <path key={s.label} d={toPath(s.getter)} fill="none" stroke={s.color} strokeWidth={2} />
        ))}
        {/* Hover points */}
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
                  label: `${tournamentId} ${matchLabel(d.level, d.matchId)} Seq ${d.sequenceIndex}, ${s.label.toLowerCase()}: ${s.getter(d)}`,
                })
              }
              onMouseLeave={() => setHover(null)}
            />
          )),
        )}
        {/* Axes */}
        <line className="axis-line" x1={pad.left} y1={pad.top} x2={pad.left} y2={H - pad.bottom} />
        <line className="axis-line" x1={pad.left} y1={H - pad.bottom} x2={W - pad.right} y2={H - pad.bottom} />
        {/* X axis title */}
        <text className="axis-label" x={pad.left + plotW / 2} y={H - 4} textAnchor="middle">Cycle</text>
      </svg>
      {hover && (
        <div
          className="pmva-tooltip"
          style={{ left: `${(hover.x / W) * 100}%`, top: `${(hover.y / H) * 100}%` }}
        >
          {hover.label}
        </div>
      )}
    </div>
  );
}

function TimeLineChart({ data, tournamentId }: { data: SequenceShotData[]; tournamentId: string }) {
  const [hover, setHover] = useState<{ x: number; y: number; label: string } | null>(null);
  if (data.length === 0) return null;

  const W = 500;
  const H = 230;
  const pad = { top: 20, right: 20, bottom: 40, left: 35 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const yMax = Math.max(
    ...data.map((d) => Math.max(d.unloadSeconds, d.shotsPerSecond, d.scoresPerSecond)),
    0.1,
  );
  const n = data.length;

  const xOf = (i: number) => pad.left + (i + 0.5) * (plotW / n);
  const yOf = (v: number) => pad.top + plotH - (v / yMax) * plotH;

  const toPath = (getter: (d: SequenceShotData) => number) =>
    data.map((d, i) => `${i === 0 ? "M" : "L"}${xOf(i)},${yOf(getter(d))}`).join(" ");

  const matchBoundaries: number[] = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i].matchId !== data[i - 1].matchId || data[i].level !== data[i - 1].level) {
      matchBoundaries.push(i);
    }
  }

  const series = [
    { getter: (d: SequenceShotData) => d.unloadSeconds, color: COLOR_SHOTS, label: "Unload Time (s)" },
    { getter: (d: SequenceShotData) => d.shotsPerSecond, color: COLOR_SHOTS_SEC, label: "Shots/sec" },
    { getter: (d: SequenceShotData) => d.scoresPerSecond, color: COLOR_SCORES_SEC, label: "Scores/sec" },
  ];

  return (
    <div className="pmva-svg-chart">
      <h4>Timing per Cycle</h4>
      <div className="pmva-chart-legend">
        {series.map((s) => (
          <span key={s.label} className="pmva-chart-legend-item">
            <span className="pmva-chart-legend-swatch" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" onMouseLeave={() => setHover(null)}>
        {/* Y gridlines */}
        {Array.from({ length: 5 }, (_, i) => {
          const yVal = (yMax / 4) * i;
          const y = pad.top + plotH - (yVal / yMax) * plotH;
          return (
            <g key={i}>
              <line className="grid-line" x1={pad.left} y1={y} x2={W - pad.right} y2={y} />
              <text className="axis-label" x={pad.left - 4} y={y + 3} textAnchor="end">{formatNum(yVal)}</text>
            </g>
          );
        })}
        {/* Match separators */}
        {matchBoundaries.map((bi) => (
          <line key={bi} className="match-separator" x1={xOf(bi) - plotW / n / 2} y1={pad.top} x2={xOf(bi) - plotW / n / 2} y2={H - pad.bottom} />
        ))}
        {/* Lines */}
        {series.map((s) => (
          <path key={s.label} d={toPath(s.getter)} fill="none" stroke={s.color} strokeWidth={2} />
        ))}
        {/* Hover points */}
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
                  label: `${tournamentId} ${matchLabel(d.level, d.matchId)} Seq ${d.sequenceIndex}, ${s.label}: ${formatNum(s.getter(d))}`,
                })
              }
              onMouseLeave={() => setHover(null)}
            />
          )),
        )}
        {/* Axes */}
        <line className="axis-line" x1={pad.left} y1={pad.top} x2={pad.left} y2={H - pad.bottom} />
        <line className="axis-line" x1={pad.left} y1={H - pad.bottom} x2={W - pad.right} y2={H - pad.bottom} />
        {/* X axis title */}
        <text className="axis-label" x={pad.left + plotW / 2} y={H - 4} textAnchor="middle">Cycle</text>
      </svg>
      {hover && (
        <div
          className="pmva-tooltip"
          style={{ left: `${(hover.x / W) * 100}%`, top: `${(hover.y / H) * 100}%` }}
        >
          {hover.label}
        </div>
      )}
    </div>
  );
}

// ── Section Components ─────────────────────────────────────────────────

function LoadingSection({ loading }: { loading: LoadingStats }) {
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
          <tr>
            <td>Hopper Filled Rating</td>
            <td>
              <StarRating value={loading.hopperFilledRating} /> ({formatNum(loading.hopperFilledRating)})
            </td>
          </tr>
        </tbody>
      </table>
      <CommentAccordion title="Cycle Load Comments" comments={loading.loadComments} />
      <CommentAccordion title="Cycle Shoot Comments" comments={loading.shootComments} />
    </>
  );
}

function ShootingSection({
  view,
  title,
  defaultOpen,
  tournamentId,
}: {
  view: ShootingView;
  title: string;
  defaultOpen?: boolean;
  tournamentId: string;
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

  return (
    <details className="pmva-accordion" open={defaultOpen}>
      <summary>{title} ({view.sequenceCount} sequences)</summary>
      <div className="pmva-accordion-body">

        <table className="pmva-stats-table">
          <tbody>
          <tr>
            <td>Average Unload Time Per Cycle</td>
            <td>{formatNum(avgUnload)}s</td>
          </tr>
          <tr>
            <td>Shots Per Second</td>
            <td>{formatNum(safeDivide(totalShots, totalTime))}</td>
          </tr>
          <tr>
            <td>Scores Per Second</td>
            <td>{formatNum(safeDivide(totalScores, totalTime))}</td>
          </tr>
          <tr>
            <td>Shot Success Rate</td>
            <td>{formatPct(successPct)} ({totalScores}/{totalShots})</td>
          </tr>
          </tbody>
        </table>

        <MatchCyclesChart data={view.matchCycles} avg={view.avgCyclesPerMatch} max={view.maxCyclesPerMatch} />

        <HitsMissesChart data={view.matchCycles} />

        <ShotsLineChart data={view.sequenceShots} tournamentId={tournamentId} />

        <SuccessPercentChart data={view.sequenceShots} tournamentId={tournamentId} />

        <TimeLineChart data={view.sequenceShots} tournamentId={tournamentId} />
      </div>
    </details>
  );
}

function HopperCard({ hopper, tournamentId }: { hopper: HopperSection; tournamentId: string }) {
  return (
    <section className="card">
      <h2>Intaking and Scoring</h2>
      <p className="pmva-legend">
        {hopper.shootingAll && hopper.shootingAll.matchCycles.length > 0 && (
            <>Matches analyzed: <strong>{hopper.shootingAll.matchCycles.map((m) => matchLabel(m.level, m.matchId)).join(", ")}</strong><br /></>
        )}
        Total count of cycles analyzed: <strong>{hopper.shootingAll?.sequenceCount ?? 0}</strong>
      </p>

      <LoadingSection loading={hopper.loading} />

      {hopper.shootingAll && (
        <ShootingSection view={hopper.shootingAll} title="Shooting — All" defaultOpen tournamentId={tournamentId} />
      )}
      {hopper.shootingClose && hopper.shootingClose.sequenceCount > 0 && (
        <ShootingSection view={hopper.shootingClose} title="Shooting — Close" tournamentId={tournamentId} />
      )}
      {hopper.shootingMid && hopper.shootingMid.sequenceCount > 0 && (
        <ShootingSection view={hopper.shootingMid} title="Shooting — Mid" tournamentId={tournamentId} />
      )}
      {hopper.shootingFar && hopper.shootingFar.sequenceCount > 0 && (
        <ShootingSection view={hopper.shootingFar} title="Shooting — Far" tournamentId={tournamentId} />
      )}
      {hopper.shootingMoving && hopper.shootingMoving.sequenceCount > 0 && (
        <ShootingSection view={hopper.shootingMoving} title="Shooting — Moving" tournamentId={tournamentId} />
      )}
      {hopper.shootingIntaking && hopper.shootingIntaking.sequenceCount > 0 && (
        <ShootingSection view={hopper.shootingIntaking} title="Shooting — Intaking" tournamentId={tournamentId} />
      )}
    </section>
  );
}

function RelatedReports({
  tournamentId,
  teamNumber,
}: {
  tournamentId: string;
  teamNumber: number;
}) {
  const currentYear = new Date().getFullYear();
  const { list: sequenceTypes } = useSequenceTypeList();
  const activeTypes = sequenceTypes.filter(
    (st) => !st.disabled && st.frcyear === currentYear,
  );

  return (
    <section className="card">
      <h2>Related Reports</h2>
      <ul className="nav-list">
        <li>
          <NavLink
            to={`/report/mega/${tournamentId}/${teamNumber}`}
            className="btn-secondary"
          >
            Mega Report
          </NavLink>
        </li>
        <li>
          <NavLink
            to={`/report/chrono/${tournamentId}/${teamNumber}`}
            className="btn-secondary"
          >
            Chronological Events
          </NavLink>
        </li>
      </ul>
      {activeTypes.length > 0 && (
        <>
          <h3>Cycle Reports</h3>
          {activeTypes.map((st) => (
            <SequenceTypeSummary
              key={st.id}
              code={st.code}
              id={st.id}
              name={st.name}
              teamNumber={teamNumber}
              tournamentId={tournamentId}
            />
          ))}
        </>
      )}
    </section>
  );
}

function msToSec(ms: number): string {
  return (ms / 1000).toFixed(2);
}

function SequenceTypeSummary({
  code,
  id,
  name,
  teamNumber,
  tournamentId,
}: {
  code: string;
  id: number;
  name: string;
  teamNumber: number;
  tournamentId: string;
}) {
  const [data, setData] = useState<TournamentSequenceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getTournamentSequenceReport(
      teamNumber,
      tournamentId,
      new Date().getFullYear(),
      id,
    )
      .then((resp) => {
        if (resp.success && resp.report) {
          setData(resp.report);
        }
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [teamNumber, tournamentId, id]);

  const seqCount = data?.aggregate?.sequences?.length ?? 0;
  const link = `/report/tournament/${code}/${teamNumber}/${tournamentId}`;

  return (
    <div className="pmva-seq-summary">
      <h3>{name}</h3>
      {loading && <Spinner />}
      {error && <p>Failed to load</p>}
      {!loading && !error && seqCount === 0 && <p>No data</p>}
      {!loading && !error && seqCount > 0 && data && (
        <>
          <table className="pmva-stats-table">
            <tbody>
              <tr>
                <td>Cycle</td>
                <td>{seqCount}</td>
              </tr>
              <tr>
                <td>Average</td>
                <td>{msToSec(data.aggregate.averageDuration)}s</td>
              </tr>
              <tr>
                <td>Fastest</td>
                <td>{msToSec(data.aggregate.fastestDuration)}s</td>
              </tr>
              <tr>
                <td>Slowest</td>
                <td>{msToSec(data.aggregate.slowestDuration)}s</td>
              </tr>
            </tbody>
          </table>
          <NavLink to={link} className="btn-secondary">
            View Details
          </NavLink>
        </>
      )}
    </div>
  );
}

const PmvaReportPage = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [report, setReport] = useState<PmvaReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) return;
    setLoading(true);
    getPmvaReport(tournamentId)
      .then((resp) => {
        if (resp.success && resp.report) {
          setReport(resp.report);
        } else {
          setError(resp.reason || "Failed to load PMVA report");
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [tournamentId]);

  return (
    <main>
      <div className="page-header">
        <h1>Post-Match Video Analysis Report — {tournamentId}</h1>
        <p>
          <NavLink to="/report/pmva">&larr; Back to Tournaments</NavLink>
        </p>
      </div>
      <RequireLogin>
        {loading && <Spinner />}
        {error && <p className="banner banner-warning">{error}</p>}
        {report && report.matchCount === 0 && (
          <p>No PMVA data recorded for this tournament.</p>
        )}
        {report && report.matchCount > 0 && (
          <>
            <p>
              <strong>Matches analyzed:</strong> {report.matchCount}
              <span className="pmva-legend"> (P = Practice, Q = Qualification, E = Elimination)</span>
            </p>

            <GeneralCard general={report.general} matchCount={report.matchCount} />
            <HopperCard hopper={report.hopper} tournamentId={tournamentId!} />

            <RelatedReports
              tournamentId={tournamentId!}
              teamNumber={report.teamNumber}
            />
          </>
        )}
      </RequireLogin>
    </main>
  );
};

export default PmvaReportPage;
