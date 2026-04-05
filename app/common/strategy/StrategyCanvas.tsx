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
import { loadFieldImage } from "~/common/strategy/fieldImage.ts";

export type CanvasTool = "draw" | "erase" | "pan";

/**
 * Display rotation applied to the field image and to stroke rendering. The
 * source image is stored with red alliance on the left and blue on the right;
 * strokes are persisted in that source frame. A non-zero rotation affects
 * rendering only — stored data stays in source space.
 *
 *   0   — source orientation (red on left)
 *   90  — clockwise 90°  (red on top, blue on bottom)
 *   270 — counter-clockwise 90° (red on bottom, blue on top)
 */
export type CanvasRotation = 0 | 90 | 270;

type Props = {
  backgroundSrc: string;
  strokes: StrategyStroke[];
  readOnly: boolean;
  selectedSlot: RobotSlot;
  /**
   * Whether new strokes should be drawn with an arrowhead (true) or as a
   * plain line (false). Only meaningful when `tool === "draw"`. Defaults to
   * true for backward compatibility.
   */
  selectedArrow?: boolean;
  /** Active canvas tool. "draw" creates new strokes; "erase" deletes them. */
  tool?: CanvasTool;
  /**
   * When non-null, only strokes whose `robotSlot === soloedSlot` are rendered,
   * hit-testable, and included in playback. Other strokes are hidden.
   */
  soloedSlot?: RobotSlot | null;
  /**
   * Display rotation. 0 is the native source frame; 90 / 270 rotate the
   * field image + strokes to keep the owner team's alliance at the bottom.
   */
  rotation?: CanvasRotation;
  /** View transform. zoom ≥ 1, pan in 0..1 canvas-normalized space. */
  zoom?: number;
  panX?: number;
  panY?: number;
  /**
   * When true, the canvas wrapper stretches to fill its parent's height
   * (via `flex: 1`) instead of using an aspect-ratio box matching the rotated
   * image. Use this inside a flex-column container — e.g. the fullscreen
   * overlay — to give the canvas all remaining vertical space.
   */
  fillHeight?: boolean;
  /** Called when the user pans via the Pan tool or two-finger drag. */
  onPanChange?: (panX: number, panY: number) => void;
  /** Called when the user pinches to zoom (also receives centroid for pan). */
  onZoomChange?: (zoom: number, panX: number, panY: number) => void;
  onStrokeComplete?: (stroke: StrategyStroke) => void;
  onEraseStroke?: (strokeIndex: number) => void;
  /** Fires when playback completes naturally (not when stop() is called). */
  onPlaybackEnd?: () => void;
};

export const MAX_ZOOM = 4.0;
export const MIN_ZOOM = 1.0;

const ERASE_HIT_RADIUS_CSS_PX = 14;

export type StrategyCanvasHandle = {
  play: (speed: number) => void;
  stop: () => void;
  /**
   * Compute a zoom/pan that makes the (rotated) image fill the canvas width,
   * with the image's bottom flush against the canvas bottom. Returns null if
   * the canvas / image dimensions aren't yet known, or if the fit would be a
   * no-op (rotation === 0 already fills exactly when the wrapper matches the
   * image aspect). Callers typically invoke this on entering fullscreen.
   */
  computeDefaultFit: () => { zoom: number; panX: number; panY: number } | null;
};

/**
 * Rotate a source-normalized point (u, v) ∈ [0,1]² into rotated display-
 * normalized space. Keep in sync with `unrotateNorm` (its exact inverse).
 */
function rotateNorm(
  u: number,
  v: number,
  rotation: CanvasRotation,
): [number, number] {
  if (rotation === 0) return [u, v];
  if (rotation === 90) return [1 - v, u];
  // 270 CW
  return [v, 1 - u];
}

/** Inverse of `rotateNorm`: rotated-normalized → source-normalized. */
function unrotateNorm(
  u: number,
  v: number,
  rotation: CanvasRotation,
): [number, number] {
  if (rotation === 0) return [u, v];
  if (rotation === 90) return [v, 1 - u];
  // 270 CW
  return [1 - v, u];
}

type ImageRect = {
  imgLeft: number;
  imgTop: number;
  imgW: number;
  imgH: number;
  cssW: number;
  cssH: number;
};

const STROKE_WIDTH = 5;
const ARROW_HEAD_LEN = 18;
const ARROW_HEAD_ANGLE = Math.PI / 6;

const StrategyCanvas = forwardRef<StrategyCanvasHandle, Props>(
  function StrategyCanvas(props, ref) {
    const {
      backgroundSrc,
      strokes,
      readOnly,
      selectedSlot,
      selectedArrow = true,
      tool = "draw",
      soloedSlot = null,
      rotation = 0,
      zoom = 1,
      panX = 0,
      panY = 0,
      fillHeight = false,
      onPanChange,
      onZoomChange,
      onStrokeComplete,
      onEraseStroke,
      onPlaybackEnd,
    } = props;

    // Clamp helpers for zoom/pan.
    const clampZoom = (z: number) =>
      Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
    const clampPan = (p: number, z: number) =>
      Math.min(1 - 1 / z, Math.max(0, p));

    // Indices into `strokes` that should be visible under the current solo
    // filter. Used by rendering, hit-testing, and playback.
    const visibleIndices = useMemo(() => {
      if (!soloedSlot) return strokes.map((_, i) => i);
      const out: number[] = [];
      for (let i = 0; i < strokes.length; i++) {
        if (strokes[i]!.robotSlot === soloedSlot) out.push(i);
      }
      return out;
    }, [strokes, soloedSlot]);
    const [eraseHoverIndex, setEraseHoverIndex] = useState<number | null>(null);
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

    // Load background image via the shared module-level cache. If this URL
    // has been decoded before in this session, the promise resolves
    // synchronously on the next microtask and we render with no visible
    // delay. Otherwise the decode runs once and is cached.
    useEffect(() => {
      let cancelled = false;
      loadFieldImage(backgroundSrc)
        .then((img) => {
          if (!cancelled) setBgImage(img);
        })
        .catch(() => {
          // swallow — canvas simply renders without a background
        });
      return () => {
        cancelled = true;
      };
    }, [backgroundSrc]);

    // Make the canvas fill the wrapper entirely (HiDPI-aware). The background
    // image is then letterboxed *inside* the canvas with the rotated aspect,
    // so the user-visible clipping region matches the wrapper (not just the
    // image rect). This is what makes "default zoom = image fills wrapper
    // width" work — at higher zoom the image scales past the image-fit-rect
    // and into the letterbox area, which is still inside the canvas.
    const resizeCanvas = useCallback((): boolean => {
      const canvas = canvasRef.current;
      const wrapper = wrapperRef.current;
      if (!canvas || !wrapper) return false;
      const dpr = window.devicePixelRatio || 1;
      const wrapperRect = wrapper.getBoundingClientRect();
      const wrapperW = Math.max(1, Math.floor(wrapperRect.width));
      const wrapperH = Math.max(1, Math.floor(wrapperRect.height));
      if (wrapperW < 1 || wrapperH < 1) return false;

      canvas.style.left = "0px";
      canvas.style.top = "0px";
      canvas.style.width = wrapperW + "px";
      canvas.style.height = wrapperH + "px";

      const targetW = Math.floor(wrapperW * dpr);
      const targetH = Math.floor(wrapperH * dpr);
      if (canvas.width === targetW && canvas.height === targetH) {
        return false;
      }
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      return true;
    }, []);

    // Keep the latest `redraw` in a ref so the ResizeObserver (installed once
    // at mount) always calls the fresh closure with current strokes / bgImage
    // / playback state, not the empty initial one.
    const redrawRef = useRef<() => void>(() => {});

    useEffect(() => {
      // Coalesce rapid resize fires (e.g. during a fullscreen-toggle layout
      // settle or a window-drag resize) into a single `requestAnimationFrame`
      // pass. Each `canvas.width = N` reallocates the backing store, so
      // batching avoids 10+ MB of churn per transition on HiDPI iPads.
      //
      // When ResizeObserver fires we ALWAYS redraw — the observed element's
      // size changed, so the previous draw (which used old cssW/cssH) is
      // stale for the background image aspect-fit + stroke placement even
      // when `resizeCanvas()` happens to return `false`.
      let rafId: number | null = null;
      const scheduleResize = () => {
        if (rafId != null) return;
        rafId = requestAnimationFrame(() => {
          rafId = null;
          resizeCanvas();
          redrawRef.current();
        });
      };
      // Initial sizing: resize + redraw immediately (the redraw happens via
      // the `useEffect(() => redraw(), [redraw])` below once redraw closes
      // over real state, but this gets pixels on the screen ASAP).
      resizeCanvas();
      const obs = new ResizeObserver(scheduleResize);
      // Observe the wrapper — its size determines the canvas's fit, which
      // resizeCanvas() computes from the wrapper rect + image aspect.
      if (wrapperRef.current) obs.observe(wrapperRef.current);
      return () => {
        obs.disconnect();
        if (rafId != null) cancelAnimationFrame(rafId);
      };
    }, [resizeCanvas]);

    // Translate a source-normalized stroke point to display canvas pixels
    // (pre-zoom/pan): first rotate into rotated-image space, then map onto
    // the image's letterbox rect inside the canvas.
    const pointToCanvasPx = useCallback(
      (
        u: number,
        v: number,
        rect: ImageRect,
      ): [number, number] => {
        const [ru, rv] = rotateNorm(u, v, rotation);
        return [rect.imgLeft + ru * rect.imgW, rect.imgTop + rv * rect.imgH];
      },
      [rotation],
    );

    const drawStroke = useCallback(
      (
        ctx: CanvasRenderingContext2D,
        stroke: StrategyStroke,
        points: StrategyPoint[],
        rect: ImageRect,
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
        const [x0, y0] = pointToCanvasPx(points[0]!.x, points[0]!.y, rect);
        ctx.moveTo(x0, y0);
        if (points.length < 3) {
          for (let i = 1; i < points.length; i++) {
            const [x, y] = pointToCanvasPx(points[i]!.x, points[i]!.y, rect);
            ctx.lineTo(x, y);
          }
        } else {
          // Quadratic smoothing: use midpoints as curve endpoints.
          for (let i = 1; i < points.length - 1; i++) {
            const [x, y] = pointToCanvasPx(points[i]!.x, points[i]!.y, rect);
            const [xn, yn] = pointToCanvasPx(
              points[i + 1]!.x,
              points[i + 1]!.y,
              rect,
            );
            const xc = (x + xn) / 2;
            const yc = (y + yn) / 2;
            ctx.quadraticCurveTo(x, y, xc, yc);
          }
          const last = points[points.length - 1]!;
          const [xL, yL] = pointToCanvasPx(last.x, last.y, rect);
          ctx.lineTo(xL, yL);
        }
        ctx.stroke();

        const strokeWantsArrow = stroke.arrow !== false;
        if (drawArrow && strokeWantsArrow && points.length >= 2) {
          const last = points[points.length - 1]!;
          // Use a point ~15 samples back to determine direction, if available.
          const refIdx = Math.max(0, points.length - 15);
          const ref = points[refIdx]!;
          const [lastPx, lastPy] = pointToCanvasPx(last.x, last.y, rect);
          const [refPx, refPy] = pointToCanvasPx(ref.x, ref.y, rect);
          const dx = lastPx - refPx;
          const dy = lastPy - refPy;
          if (dx * dx + dy * dy > 4) {
            const angle = Math.atan2(dy, dx);
            // The round line cap extends the stroke past `last` by
            // STROKE_WIDTH/.8. Advance the arrow tip forward by that amount so
            // it coincides with the visual end of the line.
            const advance = STROKE_WIDTH / .8;
            const tipX = lastPx + advance * Math.cos(angle);
            const tipY = lastPy + advance * Math.sin(angle);
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
      [pointToCanvasPx],
    );

    const getCanvasCssSize = useCallback((): { cssW: number; cssH: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { cssW: 0, cssH: 0 };
      const dpr = window.devicePixelRatio || 1;
      return { cssW: canvas.width / dpr, cssH: canvas.height / dpr };
    }, []);

    // Compute the rectangle inside the canvas where the (rotated) background
    // image will be drawn. The image is fit-inside-canvas preserving its
    // rotated aspect ratio, centered. Pre-load falls back to aspect 2.0 so
    // the canvas doesn't jump when the image decodes.
    const getImageRect = useCallback((): ImageRect | null => {
      const { cssW, cssH } = getCanvasCssSize();
      if (cssW < 1 || cssH < 1) return null;
      const bgAspect =
        bgImage && bgImage.height > 0 ? bgImage.width / bgImage.height : 2;
      const rotAspect = rotation === 0 ? bgAspect : 1 / bgAspect;
      const canvasAspect = cssW / cssH;
      let imgW: number;
      let imgH: number;
      let imgLeft: number;
      let imgTop: number;
      if (rotAspect > canvasAspect) {
        // Image is wider than the canvas — fit by width, letterbox top/bottom.
        imgW = cssW;
        imgH = cssW / rotAspect;
        imgLeft = 0;
        imgTop = (cssH - imgH) / 2;
      } else {
        // Fit by height, letterbox left/right.
        imgH = cssH;
        imgW = cssH * rotAspect;
        imgTop = 0;
        imgLeft = (cssW - imgW) / 2;
      }
      return { imgLeft, imgTop, imgW, imgH, cssW, cssH };
    }, [bgImage, rotation, getCanvasCssSize]);

    /**
     * Distance in CSS pixels from point (px, py) to the segment (ax,ay)-(bx,by).
     */
    const distPointToSegment = useCallback(
      (
        px: number,
        py: number,
        ax: number,
        ay: number,
        bx: number,
        by: number,
      ): number => {
        const dx = bx - ax;
        const dy = by - ay;
        const lenSq = dx * dx + dy * dy;
        let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const cx = ax + t * dx;
        const cy = ay + t * dy;
        const ex = px - cx;
        const ey = py - cy;
        return Math.sqrt(ex * ex + ey * ey);
      },
      [],
    );

    /**
     * Find the topmost (last-drawn) stroke whose closest point to the pointer
     * is within ERASE_HIT_RADIUS_CSS_PX. Both pointer and stroke points are
     * converted to pre-zoom canvas pixels (via the image rect + rotation) and
     * compared there. Returns its index, or null.
     */
    const hitTestStrokes = useCallback(
      (pointerCanvasPxX: number, pointerCanvasPxY: number): number | null => {
        const rect = getImageRect();
        if (!rect) return null;
        // The pointer's ~14-px reach on screen is `14 / zoom` in the
        // pre-zoom canvas-pixel coord space we're testing in.
        const hitRadius = ERASE_HIT_RADIUS_CSS_PX / zoom;
        for (let i = strokes.length - 1; i >= 0; i--) {
          const s = strokes[i]!;
          if (soloedSlot && s.robotSlot !== soloedSlot) continue;
          const pts = s.points;
          if (pts.length === 0) continue;
          if (pts.length === 1) {
            const [ax, ay] = pointToCanvasPx(pts[0]!.x, pts[0]!.y, rect);
            const d = Math.hypot(ax - pointerCanvasPxX, ay - pointerCanvasPxY);
            if (d <= hitRadius) return i;
            continue;
          }
          for (let j = 0; j < pts.length - 1; j++) {
            const [ax, ay] = pointToCanvasPx(pts[j]!.x, pts[j]!.y, rect);
            const [bx, by] = pointToCanvasPx(
              pts[j + 1]!.x,
              pts[j + 1]!.y,
              rect,
            );
            const d = distPointToSegment(
              pointerCanvasPxX,
              pointerCanvasPxY,
              ax,
              ay,
              bx,
              by,
            );
            if (d <= hitRadius) return i;
          }
        }
        return null;
      },
      [strokes, getImageRect, pointToCanvasPx, distPointToSegment, soloedSlot, zoom],
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

      const rect = getImageRect();
      if (!rect) return;

      // Zoom + pan transform on top of the existing dpr transform. Both the
      // background image and all strokes render in pre-zoom canvas-px coords
      // (i.e. 0..cssW × 0..cssH), so this single scale+translate is all we
      // need — rotation lives inside each drawImage call and inside
      // `pointToCanvasPx` for strokes.
      ctx.save();
      if (zoom !== 1 || panX !== 0 || panY !== 0) {
        ctx.scale(zoom, zoom);
        ctx.translate(-panX * cssW, -panY * cssH);
      }

      if (bgImage) {
        const { imgLeft, imgTop, imgW, imgH } = rect;
        ctx.save();
        if (rotation === 0) {
          ctx.drawImage(bgImage, imgLeft, imgTop, imgW, imgH);
        } else if (rotation === 90) {
          // Rotate around the image rect: the source's (0,0) corner lands at
          // the display rect's top-right.
          ctx.translate(imgLeft + imgW, imgTop);
          ctx.rotate(Math.PI / 2);
          ctx.drawImage(bgImage, 0, 0, imgH, imgW);
        } else {
          // 270° CW — source's (0,0) lands at the display rect's bottom-left.
          ctx.translate(imgLeft, imgTop + imgH);
          ctx.rotate(-Math.PI / 2);
          ctx.drawImage(bgImage, 0, 0, imgH, imgW);
        }
        ctx.restore();
      }

      const indicesToDraw = playbackSlice
        ? visibleIndices.slice(0, playbackSlice.doneStrokes)
        : visibleIndices;
      for (const origIdx of indicesToDraw) {
        const s = strokes[origIdx]!;
        drawStroke(ctx, s, s.points, rect, true);
      }
      if (playbackSlice && playbackSlice.currentStrokePoints) {
        const origIdx = visibleIndices[playbackSlice.currentStrokeIndex];
        if (origIdx != null) {
          const stroke = strokes[origIdx];
          if (stroke) {
            drawStroke(
              ctx,
              stroke,
              playbackSlice.currentStrokePoints,
              rect,
              false,
            );
          }
        }
      }
      if (currentStrokeRef.current) {
        drawStroke(
          ctx,
          currentStrokeRef.current,
          currentStrokeRef.current.points,
          rect,
          false,
        );
      }
      // Erase hover highlight — draw a red-dashed outline behind the candidate.
      // (hitTestStrokes already skips hidden strokes so the hover index will
      // only ever point at a visible one, but we double-check here.)
      if (
        tool === "erase" &&
        eraseHoverIndex != null &&
        eraseHoverIndex < strokes.length &&
        (!soloedSlot || strokes[eraseHoverIndex]!.robotSlot === soloedSlot)
      ) {
        const target = strokes[eraseHoverIndex]!;
        if (target.points.length > 0) {
          ctx.save();
          ctx.strokeStyle = "#ff3b30";
          ctx.lineWidth = (STROKE_WIDTH + 6) / zoom;
          ctx.setLineDash([6 / zoom, 4 / zoom]);
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          const [tx0, ty0] = pointToCanvasPx(
            target.points[0]!.x,
            target.points[0]!.y,
            rect,
          );
          ctx.moveTo(tx0, ty0);
          for (let i = 1; i < target.points.length; i++) {
            const [tx, ty] = pointToCanvasPx(
              target.points[i]!.x,
              target.points[i]!.y,
              rect,
            );
            ctx.lineTo(tx, ty);
          }
          ctx.stroke();
          ctx.restore();
        }
      }
      ctx.restore();
    }, [
      bgImage,
      rotation,
      strokes,
      drawStroke,
      pointToCanvasPx,
      getImageRect,
      playbackSlice,
      tool,
      eraseHoverIndex,
      visibleIndices,
      soloedSlot,
      zoom,
      panX,
      panY,
    ]);

    useEffect(() => {
      // Keep the ref pointed at the latest redraw closure so the
      // ResizeObserver callback (installed once) always runs the fresh
      // version — with current strokes, bgImage, playback state, etc.
      redrawRef.current = redraw;
      redraw();
    }, [redraw]);

    // ----- Pointer events -----
    // Returns the pointer's position in PRE-ZOOM canvas pixels (i.e.
    // 0..cssW × 0..cssH). This is the coord space in which strokes are
    // drawn (before the ctx.scale zoom), so hit-testing and stroke-
    // creation both operate here.
    const pointToCanvasPxEvent = useCallback(
      (e: { clientX: number; clientY: number }): { x: number; y: number } => {
        const canvas = canvasRef.current!;
        const clientRect = canvas.getBoundingClientRect();
        const { cssW, cssH } = getCanvasCssSize();
        const x =
          ((e.clientX - clientRect.left) / clientRect.width) * cssW / zoom +
          panX * cssW;
        const y =
          ((e.clientY - clientRect.top) / clientRect.height) * cssH / zoom +
          panY * cssH;
        return { x, y };
      },
      [zoom, panX, panY, getCanvasCssSize],
    );

    // Converts a pointer event to a SOURCE-normalized (0..1) stroke coord,
    // undoing zoom/pan + rotation + the image letterbox.
    const pointToNormalized = useCallback(
      (e: { clientX: number; clientY: number }) => {
        const rect = getImageRect();
        if (!rect) return { x: 0, y: 0 };
        const { x, y } = pointToCanvasPxEvent(e);
        const rotU = (x - rect.imgLeft) / rect.imgW;
        const rotV = (y - rect.imgTop) / rect.imgH;
        const [u, v] = unrotateNorm(rotU, rotV, rotation);
        return {
          x: Math.max(0, Math.min(1, u)),
          y: Math.max(0, Math.min(1, v)),
        };
      },
      [getImageRect, pointToCanvasPxEvent, rotation],
    );

    // Multi-pointer state for two-finger gestures.
    const pointersRef = useRef<Map<number, { x: number; y: number }>>(
      new Map(),
    );
    const gestureRef = useRef<{
      startDist: number;
      startZoom: number;
      // Pre-zoom canvas-px coords under the centroid at gesture start — we
      // anchor the zoom around this point so it stays put while pinching.
      anchorCanvasPxX: number;
      anchorCanvasPxY: number;
    } | null>(null);
    // Single-pointer pan drag (Pan tool).
    const panDragRef = useRef<{
      startClientX: number;
      startClientY: number;
      startPanX: number;
      startPanY: number;
    } | null>(null);

    const firstTwoPointers = (): [
      { x: number; y: number },
      { x: number; y: number },
    ] | null => {
      const iter = pointersRef.current.values();
      const p1 = iter.next();
      if (p1.done) return null;
      const p2 = iter.next();
      if (p2.done) return null;
      return [p1.value, p2.value];
    };

    const beginGesture = () => {
      // Cancel any in-progress single-pointer action without committing.
      currentStrokeRef.current = null;
      panDragRef.current = null;
      const pair = firstTwoPointers();
      if (!pair) return;
      const [p1, p2] = pair;
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;
      const anchor = pointToCanvasPxEvent({ clientX: cx, clientY: cy });
      gestureRef.current = {
        startDist: Math.hypot(p2.x - p1.x, p2.y - p1.y),
        startZoom: zoom,
        anchorCanvasPxX: anchor.x,
        anchorCanvasPxY: anchor.y,
      };
    };

    const updateGesture = () => {
      const g = gestureRef.current;
      if (!g) return;
      const pair = firstTwoPointers();
      if (!pair) return;
      const [p1, p2] = pair;
      const canvas = canvasRef.current!;
      const clientRect = canvas.getBoundingClientRect();
      const { cssW, cssH } = getCanvasCssSize();
      if (cssW < 1 || cssH < 1) return;
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;
      const currDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const scale = g.startDist > 0 ? currDist / g.startDist : 1;
      const newZoom = clampZoom(g.startZoom * scale);
      // Pan so the anchor (a fixed pre-zoom canvas-px point) stays under the
      // current centroid at the new zoom. Solving for pan (fraction of
      // cssW/cssH) from:
      //   anchor = (cx - clientRect.left) / clientRect.width * cssW / newZoom
      //            + pan * cssDim
      let newPanX =
        g.anchorCanvasPxX / cssW -
        ((cx - clientRect.left) / clientRect.width) / newZoom;
      let newPanY =
        g.anchorCanvasPxY / cssH -
        ((cy - clientRect.top) / clientRect.height) / newZoom;
      newPanX = clampPan(newPanX, newZoom);
      newPanY = clampPan(newPanY, newZoom);
      onZoomChange?.(newZoom, newPanX, newPanY);
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      // Second pointer down → enter gesture mode (overrides any tool).
      if (pointersRef.current.size >= 2) {
        e.preventDefault();
        beginGesture();
        return;
      }

      if (readOnly) return;
      if (playbackRef.current) return;

      if (tool === "pan") {
        e.preventDefault();
        canvasRef.current?.setPointerCapture(e.pointerId);
        panDragRef.current = {
          startClientX: e.clientX,
          startClientY: e.clientY,
          startPanX: panX,
          startPanY: panY,
        };
        return;
      }

      if (tool === "erase") {
        e.preventDefault();
        const { x, y } = pointToCanvasPxEvent(e);
        const hit = hitTestStrokes(x, y);
        if (hit != null) {
          onEraseStroke?.(hit);
          setEraseHoverIndex(null);
        }
        return;
      }

      // tool === "draw"
      e.preventDefault();
      canvasRef.current?.setPointerCapture(e.pointerId);
      strokeStartMsRef.current = performance.now();
      const { x, y } = pointToNormalized(e);
      currentStrokeRef.current = {
        robotSlot: selectedSlot,
        colorIndex: colorIndexForSlot(selectedSlot),
        points: [{ x, y, t: 0 }],
        arrow: selectedArrow,
      };
      redraw();
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (pointersRef.current.has(e.pointerId)) {
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      if (gestureRef.current && pointersRef.current.size >= 2) {
        e.preventDefault();
        updateGesture();
        return;
      }

      if (panDragRef.current) {
        e.preventDefault();
        const rect = canvasRef.current!.getBoundingClientRect();
        const dx = e.clientX - panDragRef.current.startClientX;
        const dy = e.clientY - panDragRef.current.startClientY;
        const dxN = dx / (rect.width * zoom);
        const dyN = dy / (rect.height * zoom);
        const newPanX = clampPan(
          panDragRef.current.startPanX - dxN,
          zoom,
        );
        const newPanY = clampPan(
          panDragRef.current.startPanY - dyN,
          zoom,
        );
        onPanChange?.(newPanX, newPanY);
        return;
      }

      if (tool === "erase" && !readOnly && !currentStrokeRef.current) {
        const { x, y } = pointToCanvasPxEvent(e);
        const hit = hitTestStrokes(x, y);
        setEraseHoverIndex((prev) => (prev === hit ? prev : hit));
        return;
      }
      if (!currentStrokeRef.current) return;
      e.preventDefault();
      const { x, y } = pointToNormalized(e);
      const t = performance.now() - strokeStartMsRef.current;
      currentStrokeRef.current.points.push({ x, y, t });
      redraw();
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
      pointersRef.current.delete(e.pointerId);

      // Exit gesture mode when we drop below 2 pointers. Don't resume any
      // single-pointer action mid-gesture — user needs a fresh pointerdown.
      if (gestureRef.current && pointersRef.current.size < 2) {
        gestureRef.current = null;
        return;
      }

      if (panDragRef.current) {
        canvasRef.current?.releasePointerCapture(e.pointerId);
        panDragRef.current = null;
        return;
      }

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

    const handlePointerLeave = (e: React.PointerEvent<HTMLCanvasElement>) => {
      pointersRef.current.delete(e.pointerId);
      if (tool === "erase") setEraseHoverIndex(null);
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
            for (let v = 0; v < visibleIndices.length; v++) {
              if (token.cancelled) break;
              const origIdx = visibleIndices[v]!;
              const stroke = strokes[origIdx]!;
              const start = performance.now();
              for (let p = 1; p <= stroke.points.length; p++) {
                if (token.cancelled) break;
                const slice = stroke.points.slice(0, p);
                setPlaybackSlice({
                  doneStrokes: v,
                  currentStrokePoints: slice,
                  currentStrokeIndex: v,
                });
                const nextT =
                  p < stroke.points.length ? stroke.points[p]!.t : slice[slice.length - 1]!.t;
                const elapsedAnimation = (performance.now() - start) * speed;
                // Convert the remaining animation-time gap back to real-time
                // by dividing by speed, so setTimeout waits the correct
                // wall-clock interval.
                const wait = (nextT - elapsedAnimation) / speed;
                if (wait > 0) {
                  await new Promise((r) => setTimeout(r, wait));
                }
              }
              setPlaybackSlice({
                doneStrokes: v + 1,
                currentStrokePoints: null,
                currentStrokeIndex: v + 1,
              });
              // brief pause between strokes
              await new Promise((r) => setTimeout(r, 150 / speed));
            }
            if (!token.cancelled) {
              setPlaybackSlice(null);
              playbackRef.current = null;
              onPlaybackEnd?.();
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
        computeDefaultFit() {
          const rect = getImageRect();
          if (!rect) return null;
          const { cssW, cssH, imgLeft, imgTop, imgW, imgH } = rect;
          if (imgW < 1 || imgH < 1) return null;
          // Target zoom: make image width == canvas width.
          const targetZoom = cssW / imgW;
          const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, targetZoom));
          // Pan so the bottom edge of the (zoomed) image sits at the bottom
          // of the canvas, and the image is horizontally centered.
          const panYRaw = (imgTop + imgH) / cssH - 1 / z;
          const panY = Math.min(1 - 1 / z, Math.max(0, panYRaw));
          const panX = Math.min(1 - 1 / z, Math.max(0, (1 - 1 / z) / 2));
          return { zoom: z, panX, panY };
        },
      }),
      [strokes, visibleIndices, onPlaybackEnd, getImageRect],
    );

    // Stop playback if strokes change mid-play.
    useEffect(() => {
      return () => {
        if (playbackRef.current) playbackRef.current.cancelled = true;
      };
    }, []);

    const cursorStyle = useMemo(() => {
      if (readOnly) return "default";
      if (tool === "erase") return "cell";
      if (tool === "pan") return "grab";
      return "crosshair";
    }, [readOnly, tool]);

    // Clamp the hover index if strokes shrink (e.g. after an erase).
    useEffect(() => {
      if (eraseHoverIndex != null && eraseHoverIndex >= strokes.length) {
        setEraseHoverIndex(null);
      }
    }, [strokes.length, eraseHoverIndex]);

    // The wrapper gives the canvas its bounding box. In windowed mode, its
    // height is derived from width via aspect-ratio matching the (rotated)
    // image — so the canvas = image with no letterbox. In fullscreen
    // (fillHeight), the wrapper takes all remaining vertical space via
    // flex:1 and the canvas fills it — the image is letterboxed *inside*
    // the canvas.
    const rawImageAspect =
      bgImage && bgImage.height > 0 ? bgImage.width / bgImage.height : 2;
    const imageAspect = rotation === 0 ? rawImageAspect : 1 / rawImageAspect;

    return (
      <div
        ref={wrapperRef}
        style={{
          position: "relative",
          width: "100%",
          ...(fillHeight
            ? { flex: "1 1 0", minHeight: 0 }
            : { aspectRatio: String(imageAspect) }),
          background: "var(--color-bg-tertiary)",
          touchAction: "none",
          userSelect: "none",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            touchAction: "none",
            cursor: cursorStyle,
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerLeave}
        />
      </div>
    );
  },
);

export default StrategyCanvas;
