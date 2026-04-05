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
  /** View transform. zoom ≥ 1, pan in 0..1 field coords. */
  zoom?: number;
  panX?: number;
  panY?: number;
  /**
   * When true, the canvas wrapper stretches to fill its parent's height
   * (via `flex: 1`) instead of using a 16:9 aspect-ratio. Use this inside a
   * flex-column container — e.g. the fullscreen overlay — to give the
   * canvas all remaining vertical space without needing scroll.
   */
  fillHeight?: boolean;
  /** Called when the user pans via the Pan tool or two-finger drag. */
  onPanChange?: (panX: number, panY: number) => void;
  /** Called when the user pinches to zoom (also receives centroid for pan). */
  onZoomChange?: (zoom: number, panX: number, panY: number) => void;
  onStrokeComplete?: (stroke: StrategyStroke) => void;
  onEraseStroke?: (strokeIndex: number) => void;
};

export const MAX_ZOOM = 4.0;
export const MIN_ZOOM = 1.0;

const ERASE_HIT_RADIUS_CSS_PX = 14;

export type StrategyCanvasHandle = {
  play: (speed: number) => void;
  stop: () => void;
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
      zoom = 1,
      panX = 0,
      panY = 0,
      fillHeight = false,
      onPanChange,
      onZoomChange,
      onStrokeComplete,
      onEraseStroke,
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

    // Ensure canvas backing store matches its display size (HiDPI-aware).
    // Returns true if the backing store was actually reallocated (avoids the
    // expensive `canvas.width = w` clear+realloc when dimensions didn't
    // change, which would otherwise happen every time the parent re-renders).
    // Fit the canvas inside its wrapper at the image's aspect ratio, centered.
    // This replaces relying on CSS aspect-ratio + max-height, which behaves
    // inconsistently inside flex-1 parents. JS has precise control.
    const resizeCanvas = useCallback((): boolean => {
      const canvas = canvasRef.current;
      const wrapper = wrapperRef.current;
      if (!canvas || !wrapper) return false;
      const dpr = window.devicePixelRatio || 1;
      const wrapperRect = wrapper.getBoundingClientRect();
      const wrapperW = wrapperRect.width;
      const wrapperH = wrapperRect.height;
      if (wrapperW < 1 || wrapperH < 1) return false;

      // Use the loaded image's aspect (falling back to 2.0 pre-load).
      const imgAspect =
        bgImage && bgImage.height > 0 ? bgImage.width / bgImage.height : 2;
      const wrapperAspect = wrapperW / wrapperH;
      let canvasCssW: number;
      let canvasCssH: number;
      if (wrapperAspect > imgAspect) {
        // Wrapper is wider than the image — fit by height.
        canvasCssH = wrapperH;
        canvasCssW = wrapperH * imgAspect;
      } else {
        // Fit by width.
        canvasCssW = wrapperW;
        canvasCssH = wrapperW / imgAspect;
      }
      canvasCssW = Math.max(1, Math.floor(canvasCssW));
      canvasCssH = Math.max(1, Math.floor(canvasCssH));
      const left = Math.floor((wrapperW - canvasCssW) / 2);
      const top = Math.floor((wrapperH - canvasCssH) / 2);
      const targetW = Math.floor(canvasCssW * dpr);
      const targetH = Math.floor(canvasCssH * dpr);

      // Position + CSS size are applied every call (cheap string writes).
      canvas.style.left = left + "px";
      canvas.style.top = top + "px";
      canvas.style.width = canvasCssW + "px";
      canvas.style.height = canvasCssH + "px";

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
    }, [bgImage]);

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

        const strokeWantsArrow = stroke.arrow !== false;
        if (drawArrow && strokeWantsArrow && points.length >= 2) {
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

    const getCanvasCssSize = useCallback((): { cssW: number; cssH: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { cssW: 0, cssH: 0 };
      const dpr = window.devicePixelRatio || 1;
      return { cssW: canvas.width / dpr, cssH: canvas.height / dpr };
    }, []);

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
     * is within ERASE_HIT_RADIUS_CSS_PX. Returns its index, or null.
     */
    const hitTestStrokes = useCallback(
      (normX: number, normY: number): number | null => {
        const { cssW, cssH } = getCanvasCssSize();
        if (cssW === 0 || cssH === 0) return null;
        const px = normX * cssW;
        const py = normY * cssH;
        // The pointer's ~14-px reach on screen is `14 / zoom` in the
        // untransformed coord space we're testing in.
        const hitRadius = ERASE_HIT_RADIUS_CSS_PX / zoom;
        for (let i = strokes.length - 1; i >= 0; i--) {
          const s = strokes[i]!;
          if (soloedSlot && s.robotSlot !== soloedSlot) continue;
          const pts = s.points;
          if (pts.length === 0) continue;
          if (pts.length === 1) {
            const d = Math.hypot(pts[0]!.x * cssW - px, pts[0]!.y * cssH - py);
            if (d <= hitRadius) return i;
            continue;
          }
          for (let j = 0; j < pts.length - 1; j++) {
            const d = distPointToSegment(
              px,
              py,
              pts[j]!.x * cssW,
              pts[j]!.y * cssH,
              pts[j + 1]!.x * cssW,
              pts[j + 1]!.y * cssH,
            );
            if (d <= hitRadius) return i;
          }
        }
        return null;
      },
      [strokes, getCanvasCssSize, distPointToSegment, soloedSlot, zoom],
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

      // Zoom + pan transform on top of the existing dpr transform. Everything
      // below this save/restore renders in the normalised field-coordinate
      // space scaled by cssW/cssH. Background image + strokes + in-progress
      // stroke + hover highlight all share the same transform.
      ctx.save();
      if (zoom !== 1 || panX !== 0 || panY !== 0) {
        ctx.scale(zoom, zoom);
        ctx.translate(-panX * cssW, -panY * cssH);
      }

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

      const indicesToDraw = playbackSlice
        ? visibleIndices.slice(0, playbackSlice.doneStrokes)
        : visibleIndices;
      for (const origIdx of indicesToDraw) {
        const s = strokes[origIdx]!;
        drawStroke(ctx, s, s.points, cssW, cssH, true);
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
              cssW,
              cssH,
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
          cssW,
          cssH,
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
          ctx.moveTo(target.points[0]!.x * cssW, target.points[0]!.y * cssH);
          for (let i = 1; i < target.points.length; i++) {
            ctx.lineTo(target.points[i]!.x * cssW, target.points[i]!.y * cssH);
          }
          ctx.stroke();
          ctx.restore();
        }
      }
      ctx.restore();
    }, [
      bgImage,
      strokes,
      drawStroke,
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
    // Converts a pointer event to a normalised (0..1) field coordinate,
    // undoing the active zoom+pan transform. When zoom=1 and pan=0 this
    // simplifies to the old behaviour.
    const pointToNormalized = useCallback(
      (e: { clientX: number; clientY: number }) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / rect.width / zoom + panX;
        const ny = (e.clientY - rect.top) / rect.height / zoom + panY;
        return {
          x: Math.max(0, Math.min(1, nx)),
          y: Math.max(0, Math.min(1, ny)),
        };
      },
      [zoom, panX, panY],
    );

    // Multi-pointer state for two-finger gestures.
    const pointersRef = useRef<Map<number, { x: number; y: number }>>(
      new Map(),
    );
    const gestureRef = useRef<{
      startDist: number;
      startCentroidX: number;
      startCentroidY: number;
      startZoom: number;
      startPanX: number;
      startPanY: number;
      // Normalised field coords under the centroid at gesture start — we
      // anchor the zoom around this point so it stays put while pinching.
      anchorNormX: number;
      anchorNormY: number;
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
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;
      const anchorNormX =
        (cx - rect.left) / rect.width / zoom + panX;
      const anchorNormY =
        (cy - rect.top) / rect.height / zoom + panY;
      gestureRef.current = {
        startDist: Math.hypot(p2.x - p1.x, p2.y - p1.y),
        startCentroidX: cx,
        startCentroidY: cy,
        startZoom: zoom,
        startPanX: panX,
        startPanY: panY,
        anchorNormX,
        anchorNormY,
      };
    };

    const updateGesture = () => {
      const g = gestureRef.current;
      if (!g) return;
      const pair = firstTwoPointers();
      if (!pair) return;
      const [p1, p2] = pair;
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;
      const currDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const scale = g.startDist > 0 ? currDist / g.startDist : 1;
      const newZoom = clampZoom(g.startZoom * scale);
      // Anchor the zoom at the gesture-start centroid: keep that field
      // coordinate under the current centroid. That's the natural
      // pinch-zoom feel.
      const currCentroidCanvasX = cx - rect.left;
      const currCentroidCanvasY = cy - rect.top;
      let newPanX =
        g.anchorNormX - currCentroidCanvasX / rect.width / newZoom;
      let newPanY =
        g.anchorNormY - currCentroidCanvasY / rect.height / newZoom;
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
        const { x, y } = pointToNormalized(e);
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
        const { x, y } = pointToNormalized(e);
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
                const elapsed = (performance.now() - start) * speed;
                const wait = nextT - elapsed;
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
      [strokes, visibleIndices],
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
    // height is derived from width via aspect-ratio matching the image — so
    // the canvas fills the wrapper exactly with no letterbox. In fullscreen
    // (fillHeight), the wrapper takes all remaining vertical space via
    // flex:1, and `resizeCanvas()` fits the canvas inside with the image's
    // aspect ratio, centered.
    const imageAspect =
      bgImage && bgImage.height > 0 ? bgImage.width / bgImage.height : 2;

    return (
      <div
        ref={wrapperRef}
        style={{
          position: "relative",
          width: "100%",
          ...(fillHeight
            ? { flex: "1 1 0", minHeight: 0 }
            : { aspectRatio: String(imageAspect) }),
          background: "var(--color-surface, #222)",
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
