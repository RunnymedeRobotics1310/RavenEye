import { useMemo, type MouseEvent } from "react";
import {
  type Point,
  applyHomography,
  computeHomography,
} from "~/common/field/homography.ts";

export type OverlayPhase =
  | "idle"
  | "picking-corner-0"
  | "picking-corner-1"
  | "picking-corner-2"
  | "picking-corner-3"
  | "ready";

export type FieldPose = { xm: number; ym: number; headingDeg: number };

type Props = {
  imageUrl: string;
  fieldL: number;
  fieldW: number;
  robotL: number;
  robotW: number;
  /** Picked image corners (normalized 0..1). 0 to 4 entries. */
  corners: Point[];
  phase: OverlayPhase;
  /** Pose to draw in the ready state. Omitted → no robot rendered. */
  pose?: FieldPose;
  /** Click-through: called with normalized image coords in [0, 1]. */
  onCornerClick?: (p: Point) => void;
};

const CORNER_LABELS = ["A", "B", "C", "D"] as const;

/**
 * Field image + normalized-coord SVG overlay. The SVG sits directly on top of
 * the `<img>` at the same rendered rect; its `viewBox="0 0 1 1"` with
 * `preserveAspectRatio="none"` means each SVG coordinate is a normalized 0..1
 * image coord — exactly what clicks produce, and exactly what the backend
 * stores.
 */
export default function FieldCalibrationOverlay({
  imageUrl,
  fieldL,
  fieldW,
  robotL,
  robotW,
  corners,
  phase,
  pose,
  onCornerClick,
}: Props) {
  const isPicking = phase.startsWith("picking-") || phase === "idle";
  const isReady = phase === "ready" && corners.length === 4;

  // Compute the field→image homography once per calibration snapshot. When
  // picking, `corners` grows click by click so the homography isn't valid
  // until we're in `ready`.
  const fieldToImage = useMemo(() => {
    if (!isReady) return null;
    const src: Point[] = [
      { x: 0, y: 0 },
      { x: fieldL, y: 0 },
      { x: fieldL, y: fieldW },
      { x: 0, y: fieldW },
    ];
    const h = computeHomography(src, corners);
    return (p: Point) => applyHomography(h, p);
  }, [isReady, fieldL, fieldW, corners]);

  const handleClick = (e: MouseEvent<SVGSVGElement>) => {
    if (!onCornerClick || !isPicking) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    onCornerClick({ x, y });
  };

  return (
    <div className="field-map" style={{ aspectRatio: `${fieldL} / ${fieldW}` }}>
      <img src={imageUrl} alt="FRC field" draggable={false} />
      <svg
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
        onClick={handleClick}
        style={{ cursor: isPicking && onCornerClick ? "crosshair" : "default" }}
      >
        {/* Picked corners — shown during calibration and still visible in
            ready so the user can see what they clicked. */}
        {corners.map((c, i) => (
          <g key={`corner-${i}`}>
            <circle
              cx={c.x}
              cy={c.y}
              r="0.008"
              fill="var(--field-corner)"
              stroke="#ffffff"
              strokeWidth="0.0015"
            />
            <text
              x={c.x + 0.012}
              y={c.y - 0.012}
              fontSize="0.025"
              fontWeight="700"
              fill="var(--field-corner)"
              stroke="#ffffff"
              strokeWidth="0.0015"
              paintOrder="stroke"
            >
              {CORNER_LABELS[i]}
            </text>
          </g>
        ))}

        {isReady && fieldToImage && (
          <>
            <GridAndAxes
              fieldL={fieldL}
              fieldW={fieldW}
              fieldToImage={fieldToImage}
            />
            {pose && (
              <Robot
                pose={pose}
                robotL={robotL}
                robotW={robotW}
                fieldToImage={fieldToImage}
              />
            )}
          </>
        )}
      </svg>
    </div>
  );
}

function GridAndAxes({
  fieldL,
  fieldW,
  fieldToImage,
}: {
  fieldL: number;
  fieldW: number;
  fieldToImage: (p: Point) => Point;
}) {
  // One-metre spaced lines across the whole field.
  const xLines: number[] = [];
  for (let x = 0; x <= fieldL + 1e-9; x += 1) xLines.push(Math.min(x, fieldL));
  const yLines: number[] = [];
  for (let y = 0; y <= fieldW + 1e-9; y += 1) yLines.push(Math.min(y, fieldW));

  const line = (a: Point, b: Point, key: string, cls: string) => {
    const ai = fieldToImage(a);
    const bi = fieldToImage(b);
    return (
      <line
        key={key}
        x1={ai.x}
        y1={ai.y}
        x2={bi.x}
        y2={bi.y}
        className={cls}
        vectorEffect="non-scaling-stroke"
      />
    );
  };

  const origin = fieldToImage({ x: 0, y: 0 });
  const xAxisEnd = fieldToImage({ x: fieldL, y: 0 });
  const yAxisEnd = fieldToImage({ x: 0, y: fieldW });

  return (
    <g className="field-overlay">
      {xLines.map((x, i) =>
        x > 0 && x < fieldL
          ? line({ x, y: 0 }, { x, y: fieldW }, `xg-${i}`, "field-grid-line")
          : null,
      )}
      {yLines.map((y, i) =>
        y > 0 && y < fieldW
          ? line({ x: 0, y }, { x: fieldL, y }, `yg-${i}`, "field-grid-line")
          : null,
      )}
      {/* X axis — thicker than Y for dual-encoded identification. */}
      <line
        x1={origin.x}
        y1={origin.y}
        x2={xAxisEnd.x}
        y2={xAxisEnd.y}
        className="field-axis-x"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={origin.x}
        y1={origin.y}
        x2={yAxisEnd.x}
        y2={yAxisEnd.y}
        className="field-axis-y"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={origin.x}
        cy={origin.y}
        r="0.007"
        className="field-origin-marker"
      />
      <text
        x={origin.x + 0.012}
        y={origin.y + 0.028}
        fontSize="0.022"
        fontWeight="700"
        className="field-origin-label"
        paintOrder="stroke"
      >
        0,0
      </text>
    </g>
  );
}

function Robot({
  pose,
  robotL,
  robotW,
  fieldToImage,
}: {
  pose: FieldPose;
  robotL: number;
  robotW: number;
  fieldToImage: (p: Point) => Point;
}) {
  const hl = robotL / 2;
  const hw = robotW / 2;
  const heading = (pose.headingDeg * Math.PI) / 180;
  const cos = Math.cos(heading);
  const sin = Math.sin(heading);

  // Local-frame corners: CCW starting at rear-right. Heading 0 ⇒ +X is front.
  const localBody: Point[] = [
    { x: -hl, y: -hw },
    { x: +hl, y: -hw },
    { x: +hl, y: +hw },
    { x: -hl, y: +hw },
  ];

  // Front-indicator triangle: base narrowed to ~40% of robot width centred on
  // the front edge; apex ~20% of robot length inward.
  const localFront: Point[] = [
    { x: +hl, y: -hw * 0.4 },
    { x: +hl, y: +hw * 0.4 },
    { x: +hl - robotL * 0.2, y: 0 },
  ];

  const toImage = (local: Point) => {
    const rx = cos * local.x - sin * local.y + pose.xm;
    const ry = sin * local.x + cos * local.y + pose.ym;
    return fieldToImage({ x: rx, y: ry });
  };

  const bodyPoints = localBody.map(toImage).map((p) => `${p.x},${p.y}`).join(" ");
  const frontPoints = localFront.map(toImage).map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <g className="field-robot">
      <polygon
        points={bodyPoints}
        className="robot-body-shape"
        vectorEffect="non-scaling-stroke"
      />
      <polygon
        points={frontPoints}
        className="robot-front-shape"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}
