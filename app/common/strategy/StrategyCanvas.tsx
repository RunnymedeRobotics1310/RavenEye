import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  RobotSlot,
  StrategyPoint,
  StrategyStroke,
} from "~/types/StrategyStroke.ts";
import { ROBOT_COLORS, colorIndexForSlot } from "~/common/strategy/colors.ts";

type Props = {
  backgroundSrc: string;
  strokes: StrategyStroke[];
  readOnly: boolean;
  selectedSlot: RobotSlot;
  onStrokeComplete?: (stroke: StrategyStroke) => void;
};

export type StrategyCanvasHandle = {
  play: (speed: 1 | 2) => void;
  stop: () => void;
};

const STROKE_WIDTH = 5;
const ARROW_HEAD_LEN = 18;
const ARROW_HEAD_ANGLE = Math.PI / 6;

const StrategyCanvas = forwardRef<StrategyCanvasHandle, Props>(
  function StrategyCanvas(props, ref) {
    const { backgroundSrc, strokes, readOnly, selectedSlot, onStrokeComplete } =
      props;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
    const currentStrokeRef = useRef<StrategyStroke | null>(null);
    const strokeStartMsRef = useRef<number>(0);
    const playbackRef = useRef<{ cancelled: boolean } | null>(null);
    const [playbackSlice, setPlaybackSlice] = useState<{
      doneStrokes: number;
      currentStrokePoints: StrategyPoint[] | null;
      currentStrokeIndex: number;
    } | null>(null);

    // Load background image.
    useEffect(() => {
      const img = new Image();
      img.onload = () => setBgImage(img);
      img.src = backgroundSrc;
    }, [backgroundSrc]);

    // Ensure canvas backing store matches its display size (HiDPI-aware).
    const resizeCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      const wrapper = wrapperRef.current;
      if (!canvas || !wrapper) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = wrapper.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    }, []);

    useEffect(() => {
      resizeCanvas();
      const obs = new ResizeObserver(() => {
        resizeCanvas();
        redraw();
      });
      if (wrapperRef.current) obs.observe(wrapperRef.current);
      return () => obs.disconnect();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resizeCanvas]);

    const drawStroke = useCallback(
      (
        ctx: CanvasRenderingContext2D,
        stroke: StrategyStroke,
        points: StrategyPoint[],
        cssW: number,
        cssH: number,
        drawArrow: boolean,
      ) => {
        if (points.length === 0) return;
        const color =
          ROBOT_COLORS[stroke.colorIndex] ??
          ROBOT_COLORS[colorIndexForSlot(stroke.robotSlot)]!;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = STROKE_WIDTH;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(points[0]!.x * cssW, points[0]!.y * cssH);
        if (points.length < 3) {
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i]!.x * cssW, points[i]!.y * cssH);
          }
        } else {
          // Quadratic smoothing: use midpoints as curve endpoints.
          for (let i = 1; i < points.length - 1; i++) {
            const xc = ((points[i]!.x + points[i + 1]!.x) / 2) * cssW;
            const yc = ((points[i]!.y + points[i + 1]!.y) / 2) * cssH;
            ctx.quadraticCurveTo(
              points[i]!.x * cssW,
              points[i]!.y * cssH,
              xc,
              yc,
            );
          }
          const last = points[points.length - 1]!;
          ctx.lineTo(last.x * cssW, last.y * cssH);
        }
        ctx.stroke();

        if (drawArrow && points.length >= 2) {
          const last = points[points.length - 1]!;
          // Use a point ~15 samples back to determine direction, if available.
          const refIdx = Math.max(0, points.length - 15);
          const ref = points[refIdx]!;
          const dx = (last.x - ref.x) * cssW;
          const dy = (last.y - ref.y) * cssH;
          if (dx * dx + dy * dy > 4) {
            const angle = Math.atan2(dy, dx);
            const tipX = last.x * cssW;
            const tipY = last.y * cssH;
            ctx.beginPath();
            ctx.moveTo(tipX, tipY);
            ctx.lineTo(
              tipX - ARROW_HEAD_LEN * Math.cos(angle - ARROW_HEAD_ANGLE),
              tipY - ARROW_HEAD_LEN * Math.sin(angle - ARROW_HEAD_ANGLE),
            );
            ctx.lineTo(
              tipX - ARROW_HEAD_LEN * Math.cos(angle + ARROW_HEAD_ANGLE),
              tipY - ARROW_HEAD_LEN * Math.sin(angle + ARROW_HEAD_ANGLE),
            );
            ctx.closePath();
            ctx.fill();
          }
        }
      },
      [],
    );

    const redraw = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const cssW = canvas.width / dpr;
      const cssH = canvas.height / dpr;
      ctx.clearRect(0, 0, cssW, cssH);

      if (bgImage) {
        // Preserve aspect ratio of background image, fit inside canvas.
        const aspectImg = bgImage.width / bgImage.height;
        const aspectCanvas = cssW / cssH;
        let drawW, drawH, dx, dy;
        if (aspectImg > aspectCanvas) {
          drawW = cssW;
          drawH = cssW / aspectImg;
          dx = 0;
          dy = (cssH - drawH) / 2;
        } else {
          drawH = cssH;
          drawW = cssH * aspectImg;
          dx = (cssW - drawW) / 2;
          dy = 0;
        }
        ctx.drawImage(bgImage, dx, dy, drawW, drawH);
      }

      const strokesToDraw = playbackSlice
        ? strokes.slice(0, playbackSlice.doneStrokes)
        : strokes;
      for (const s of strokesToDraw) {
        drawStroke(ctx, s, s.points, cssW, cssH, true);
      }
      if (playbackSlice && playbackSlice.currentStrokePoints) {
        const stroke = strokes[playbackSlice.currentStrokeIndex];
        if (stroke) {
          drawStroke(
            ctx,
            stroke,
            playbackSlice.currentStrokePoints,
            cssW,
            cssH,
            false,
          );
        }
      }
      if (currentStrokeRef.current) {
        drawStroke(
          ctx,
          currentStrokeRef.current,
          currentStrokeRef.current.points,
          cssW,
          cssH,
          false,
        );
      }
    }, [bgImage, strokes, drawStroke, playbackSlice]);

    useEffect(() => {
      redraw();
    }, [redraw]);

    // ----- Pointer events -----
    const pointToNormalized = useCallback(
      (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        return {
          x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
          y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
        };
      },
      [],
    );

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (readOnly) return;
      if (playbackRef.current) return;
      e.preventDefault();
      canvasRef.current?.setPointerCapture(e.pointerId);
      strokeStartMsRef.current = performance.now();
      const { x, y } = pointToNormalized(e);
      currentStrokeRef.current = {
        robotSlot: selectedSlot,
        colorIndex: colorIndexForSlot(selectedSlot),
        points: [{ x, y, t: 0 }],
      };
      redraw();
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!currentStrokeRef.current) return;
      e.preventDefault();
      const { x, y } = pointToNormalized(e);
      const t = performance.now() - strokeStartMsRef.current;
      currentStrokeRef.current.points.push({ x, y, t });
      redraw();
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!currentStrokeRef.current) return;
      e.preventDefault();
      canvasRef.current?.releasePointerCapture(e.pointerId);
      const finished = currentStrokeRef.current;
      currentStrokeRef.current = null;
      if (finished.points.length >= 2) {
        onStrokeComplete?.(finished);
      } else {
        redraw();
      }
    };

    // ----- Imperative playback -----
    useImperativeHandle(
      ref,
      () => ({
        play(speed) {
          if (playbackRef.current) {
            playbackRef.current.cancelled = true;
          }
          const token = { cancelled: false };
          playbackRef.current = token;
          (async () => {
            for (let i = 0; i < strokes.length; i++) {
              if (token.cancelled) break;
              const stroke = strokes[i]!;
              const start = performance.now();
              for (let p = 1; p <= stroke.points.length; p++) {
                if (token.cancelled) break;
                const slice = stroke.points.slice(0, p);
                setPlaybackSlice({
                  doneStrokes: i,
                  currentStrokePoints: slice,
                  currentStrokeIndex: i,
                });
                const nextT =
                  p < stroke.points.length ? stroke.points[p]!.t : slice[slice.length - 1]!.t;
                const elapsed = (performance.now() - start) * speed;
                const wait = nextT - elapsed;
                if (wait > 0) {
                  await new Promise((r) => setTimeout(r, wait));
                }
              }
              setPlaybackSlice({
                doneStrokes: i + 1,
                currentStrokePoints: null,
                currentStrokeIndex: i + 1,
              });
              // brief pause between strokes
              await new Promise((r) => setTimeout(r, 150 / speed));
            }
            if (!token.cancelled) {
              setPlaybackSlice(null);
              playbackRef.current = null;
            }
          })();
        },
        stop() {
          if (playbackRef.current) {
            playbackRef.current.cancelled = true;
            playbackRef.current = null;
          }
          setPlaybackSlice(null);
        },
      }),
      [strokes],
    );

    // Stop playback if strokes change mid-play.
    useEffect(() => {
      return () => {
        if (playbackRef.current) playbackRef.current.cancelled = true;
      };
    }, []);

    const cursorStyle = useMemo(
      () => (readOnly ? "default" : "crosshair"),
      [readOnly],
    );

    return (
      <div
        ref={wrapperRef}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 9",
          background: "var(--color-surface, #222)",
          touchAction: "none",
          userSelect: "none",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            inset: 0,
            touchAction: "none",
            cursor: cursorStyle,
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>
    );
  },
);

export default StrategyCanvas;
