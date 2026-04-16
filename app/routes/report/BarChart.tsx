import { useId, useState } from "react";

export interface BarChartSeries {
  key: string;
  label: string;
  colorVar: string;
  pattern?: "solid" | "hatch";
}

export interface BarChartTooltipRow {
  label: string;
  value: string;
}

export interface BarChartDatum {
  label: string;
  values: Record<string, number>;
  tooltip: BarChartTooltipRow[];
}

interface BarChartProps {
  series: BarChartSeries[];
  data: BarChartDatum[];
  yAxisLabel?: string;
}

const VIEW_W = 800;
const VIEW_H = 320;
const PAD_LEFT = 48;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 56;
const PLOT_W = VIEW_W - PAD_LEFT - PAD_RIGHT;
const PLOT_H = VIEW_H - PAD_TOP - PAD_BOTTOM;
const GROUP_GAP_RATIO = 0.25;
const BAR_GAP = 2;
const LEGEND_GAP = 18;

const niceCeiling = (max: number): number => {
  if (max <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  const scaled = max / pow;
  let nice: number;
  if (scaled <= 1) nice = 1;
  else if (scaled <= 2) nice = 2;
  else if (scaled <= 5) nice = 5;
  else nice = 10;
  return nice * pow;
};

const BarChart = ({ series, data, yAxisLabel }: BarChartProps) => {
  const patternId = useId();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (data.length === 0) {
    return <p className="bar-chart-empty">No match data to chart.</p>;
  }

  const maxValue = data.reduce((m, d) => {
    const rowMax = series.reduce((mm, s) => Math.max(mm, d.values[s.key] ?? 0), 0);
    return Math.max(m, rowMax);
  }, 0);
  const yMax = niceCeiling(Math.max(maxValue * 1.1, 1));

  const gridStepCount = 5;
  const gridValues = Array.from({ length: gridStepCount + 1 }, (_, i) => (yMax * i) / gridStepCount);

  const groupWidth = PLOT_W / data.length;
  const innerGroupWidth = groupWidth * (1 - GROUP_GAP_RATIO);
  const barWidth = Math.max(2, (innerGroupWidth - BAR_GAP * (series.length - 1)) / series.length);

  const yToPx = (v: number) => PAD_TOP + PLOT_H - (v / yMax) * PLOT_H;

  return (
    <div className="bar-chart">
      <div className="bar-chart-legend" aria-hidden="false">
        {series.map((s) => (
          <span key={s.key} className="bar-chart-legend-item">
            <span
              className="bar-chart-legend-swatch"
              style={{
                background:
                  s.pattern === "hatch"
                    ? `repeating-linear-gradient(45deg, rgba(255,255,255,0.65) 0 4px, transparent 4px 8px), var(${s.colorVar})`
                    : `var(${s.colorVar})`,
                borderColor: `var(${s.colorVar})`,
              }}
            />
            {s.label}
          </span>
        ))}
      </div>
      <div className="bar-chart-svg-wrap">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={yAxisLabel ?? "Bar chart"}
          className="bar-chart-svg"
        >
          <defs>
            <pattern
              id={`${patternId}-hatch`}
              patternUnits="userSpaceOnUse"
              width={8}
              height={8}
              patternTransform="rotate(-45)"
            >
              <rect width={4} height={8} fill="rgba(255,255,255,0.65)" />
            </pattern>
          </defs>

          {gridValues.map((v, i) => (
            <g key={i}>
              <line
                x1={PAD_LEFT}
                x2={VIEW_W - PAD_RIGHT}
                y1={yToPx(v)}
                y2={yToPx(v)}
                className="bar-chart-grid"
              />
              <text
                x={PAD_LEFT - 6}
                y={yToPx(v) + 4}
                textAnchor="end"
                className="bar-chart-axis-text"
              >
                {Number.isInteger(v) ? v.toString() : v.toFixed(1)}
              </text>
            </g>
          ))}

          <line
            x1={PAD_LEFT}
            x2={PAD_LEFT}
            y1={PAD_TOP}
            y2={PAD_TOP + PLOT_H}
            className="bar-chart-axis"
          />
          <line
            x1={PAD_LEFT}
            x2={VIEW_W - PAD_RIGHT}
            y1={PAD_TOP + PLOT_H}
            y2={PAD_TOP + PLOT_H}
            className="bar-chart-axis"
          />

          {data.map((d, i) => {
            const groupX = PAD_LEFT + groupWidth * i;
            const innerX = groupX + (groupWidth - innerGroupWidth) / 2;
            const isHover = hoverIdx === i;
            return (
              <g key={i}>
                {series.map((s, si) => {
                  const v = d.values[s.key] ?? 0;
                  const h = (v / yMax) * PLOT_H;
                  const x = innerX + si * (barWidth + BAR_GAP);
                  const y = PAD_TOP + PLOT_H - h;
                  const hatch = s.pattern === "hatch";
                  return (
                    <g key={s.key}>
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={h}
                        fill={`var(${s.colorVar})`}
                        className={`bar-chart-bar${isHover ? " bar-chart-bar-hover" : ""}`}
                      />
                      {hatch && (
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={h}
                          fill={`url(#${patternId}-hatch)`}
                          className="bar-chart-bar-hatch"
                        />
                      )}
                    </g>
                  );
                })}
                <text
                  x={groupX + groupWidth / 2}
                  y={PAD_TOP + PLOT_H + 18}
                  textAnchor="middle"
                  className="bar-chart-axis-text"
                >
                  {d.label}
                </text>
                <rect
                  x={groupX}
                  y={PAD_TOP}
                  width={groupWidth}
                  height={PLOT_H + LEGEND_GAP}
                  fill="transparent"
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx((h) => (h === i ? null : h))}
                  onTouchStart={() => setHoverIdx(i)}
                  onClick={() => setHoverIdx((h) => (h === i ? null : i))}
                  style={{ cursor: "pointer" }}
                />
              </g>
            );
          })}
        </svg>
        {hoverIdx !== null && data[hoverIdx] && (
          <div
            className="bar-chart-tooltip"
            role="status"
            style={{
              left: `${((PAD_LEFT + groupWidth * hoverIdx + groupWidth / 2) / VIEW_W) * 100}%`,
            }}
          >
            <button
              type="button"
              className="bar-chart-tooltip-close"
              onClick={() => setHoverIdx(null)}
              aria-label="Close tooltip"
            >
              ×
            </button>
            <dl>
              {data[hoverIdx].tooltip.map((row) => (
                <div key={row.label} className="bar-chart-tooltip-row">
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
};

export default BarChart;
