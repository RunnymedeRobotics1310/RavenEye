import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useParams } from "react-router";
import RequireRole from "~/common/auth/RequireRole.tsx";
import {
  repository,
  strategyPlanLocalKey,
  type StoredStrategyDrawing,
  type StoredStrategyPlan,
} from "~/common/storage/db.ts";
import { useMatchSchedule } from "~/common/storage/dbhooks.ts";
import { getDisplayName, getUserid } from "~/common/storage/rbauth.ts";
import {
  refreshStrategyPlanForMatch,
  syncStrategyPlans,
  useStrategyPlansSyncStatus,
} from "~/common/sync/sync.ts";
import SyncCountdown from "~/common/sync/SyncCountdown.tsx";
import Sync from "~/common/icons/Sync.tsx";
import StrategyCanvas, {
  type StrategyCanvasHandle,
} from "~/common/strategy/StrategyCanvas.tsx";
import StrategyReadOnlyCanvas from "~/common/strategy/StrategyReadOnlyCanvas.tsx";
import RobotSlotPalette from "~/common/strategy/RobotSlotPalette.tsx";
import DrawingList from "~/common/strategy/DrawingList.tsx";
import {
  ArrowIcon,
  EnterFullscreenIcon,
  EraserIcon,
  ExitFullscreenIcon,
  LabelsIcon,
  LineIcon,
  LockedIcon,
  PanIcon,
  StopIcon,
  TrashIcon,
  UndoIcon,
  UnlockedIcon,
} from "~/common/strategy/icons.tsx";
import { fieldImageForYear } from "~/common/strategy/fieldImage.ts";
import { colorIndexForSlot } from "~/common/strategy/colors.ts";
import type {
  RobotSlot,
  StrategyStroke,
} from "~/types/StrategyStroke.ts";
import type { RBTournament } from "~/types/RBTournament.ts";
import type { RBScheduleRecord } from "~/types/RBScheduleRecord.ts";
import type { SyncStatus } from "~/types/SyncStatus.ts";

const DRAW_TOOL_STORAGE_KEY = "raveneye_strategy_draw_tool";
const TOOLBAR_LABELS_STORAGE_KEY = "raveneye_strategy_toolbar_labels";
type PersistedDrawTool = "arrow" | "line" | "erase";

/**
 * True on devices where the primary input is touch AND multi-touch is
 * available — iPads, phones. False on desktops, touch laptops (primary input
 * is the trackpad/mouse even though a touchscreen exists). Used to hide the
 * zoom/pan toolbar buttons, since on touch-primary devices the user naturally
 * pinches to zoom and drags with two fingers to pan.
 */
function isTouchPrimaryDevice(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const multi = (navigator.maxTouchPoints ?? 0) > 1;
    return coarse && multi;
  } catch {
    return false;
  }
}

function loadDrawTool(): PersistedDrawTool {
  if (typeof localStorage === "undefined") return "line";
  try {
    const v = localStorage.getItem(DRAW_TOOL_STORAGE_KEY);
    if (v === "arrow" || v === "line" || v === "erase") return v;
  } catch {
    // localStorage may throw in private mode or when disabled — fall through.
  }
  return "line";
}

function saveDrawTool(tool: PersistedDrawTool): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(DRAW_TOOL_STORAGE_KEY, tool);
  } catch {
    // Ignore quota/permission failures — preference is best-effort.
  }
}

const ZOOM_STORAGE_KEY = "raveneye_strategy_zoom";
const PAN_X_STORAGE_KEY = "raveneye_strategy_pan_x";
const PAN_Y_STORAGE_KEY = "raveneye_strategy_pan_y";
const MIN_ZOOM = 1.0;
const MAX_ZOOM = 4.0;
const ZOOM_STEPS: readonly number[] = [1.0, 1.5, 2.0, 2.5, 3.0, 4.0];

function clampZoomValue(z: number): number {
  if (!Number.isFinite(z)) return MIN_ZOOM;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

function clampPanValue(p: number, z: number): number {
  if (!Number.isFinite(p)) return 0;
  const max = Math.max(0, 1 - 1 / z);
  return Math.min(max, Math.max(0, p));
}

function loadZoomPan(): { zoom: number; panX: number; panY: number } {
  if (typeof localStorage === "undefined") {
    return { zoom: 1, panX: 0, panY: 0 };
  }
  try {
    const z = clampZoomValue(
      parseFloat(localStorage.getItem(ZOOM_STORAGE_KEY) ?? "1"),
    );
    const x = clampPanValue(
      parseFloat(localStorage.getItem(PAN_X_STORAGE_KEY) ?? "0"),
      z,
    );
    const y = clampPanValue(
      parseFloat(localStorage.getItem(PAN_Y_STORAGE_KEY) ?? "0"),
      z,
    );
    return { zoom: z, panX: x, panY: y };
  } catch {
    return { zoom: 1, panX: 0, panY: 0 };
  }
}

function saveZoomPan(zoom: number, panX: number, panY: number): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(ZOOM_STORAGE_KEY, zoom.toString());
    localStorage.setItem(PAN_X_STORAGE_KEY, panX.toString());
    localStorage.setItem(PAN_Y_STORAGE_KEY, panY.toString());
  } catch {
    // best-effort
  }
}

function loadShowLabels(): boolean {
  if (typeof localStorage === "undefined") return true;
  try {
    const v = localStorage.getItem(TOOLBAR_LABELS_STORAGE_KEY);
    if (v === "hide") return false;
  } catch {
    // Fall through.
  }
  return true;
}

function saveShowLabels(show: boolean): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(TOOLBAR_LABELS_STORAGE_KEY, show ? "show" : "hide");
  } catch {
    // Best-effort.
  }
}

function generateLocalId(): string {
  const anyCrypto = (globalThis as { crypto?: Crypto }).crypto;
  if (anyCrypto && typeof anyCrypto.randomUUID === "function") {
    return "new-" + anyCrypto.randomUUID();
  }
  return "new-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function useTournament(tournamentId: string): RBTournament | null {
  const [t, setT] = useState<RBTournament | null>(null);
  useEffect(() => {
    let mounted = true;
    repository.getTournamentList().then((list) => {
      if (!mounted) return;
      setT(list.find((x) => x.id === tournamentId) ?? null);
    });
    return () => {
      mounted = false;
    };
  }, [tournamentId]);
  return t;
}

function teamNumbersForMatch(
  schedule: RBScheduleRecord[],
  tournamentId: string,
  level: string,
  matchNumber: number,
): Record<RobotSlot, number | null> {
  const m = schedule.find(
    (r) =>
      r.tournamentId === tournamentId &&
      r.level === level &&
      r.match === matchNumber,
  );
  return {
    R1: m?.red1 ?? null,
    R2: m?.red2 ?? null,
    R3: m?.red3 ?? null,
    B1: m?.blue1 ?? null,
    B2: m?.blue2 ?? null,
    B3: m?.blue3 ?? null,
  };
}

const StrategyPlanPageInner = (props: {
  tournamentId: string;
  matchLevel: string;
  matchNumber: number;
}) => {
  const { tournamentId, matchLevel, matchNumber } = props;
  const localKey = strategyPlanLocalKey({
    tournamentId,
    matchLevel,
    matchNumber,
  });
  const tournament = useTournament(tournamentId);
  const { list: schedule } = useMatchSchedule();
  const teamNumbers = useMemo(
    () => teamNumbersForMatch(schedule, tournamentId, matchLevel, matchNumber),
    [schedule, tournamentId, matchLevel, matchNumber],
  );

  const [plan, setPlan] = useState<StoredStrategyPlan | null>(null);
  const [drawings, setDrawings] = useState<StoredStrategyDrawing[]>([]);
  const [activeLocalId, setActiveLocalId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<RobotSlot>("R1");
  const [soloedSlot, setSoloedSlot] = useState<RobotSlot | null>(null);
  const handleSlotClick = (slot: RobotSlot) => {
    if (slot === selectedSlot) {
      // Double-tap on the selected slot toggles solo mode.
      setSoloedSlot((prev) => (prev === slot ? null : slot));
    } else {
      // Switching teams clears any solo and selects the new one.
      setSelectedSlot(slot);
      setSoloedSlot(null);
    }
  };
  // Clear solo state whenever edit mode turns off or the active drawing
  // changes, so the user can't get "stuck" viewing a filtered canvas with
  // no visible palette.
  useEffect(() => {
    if (!isEditing) setSoloedSlot(null);
  }, [isEditing]);
  useEffect(() => {
    setSoloedSlot(null);
  }, [activeLocalId]);
  type DrawTool = "arrow" | "line" | "erase" | "pan";
  const [drawTool, setDrawTool] = useState<DrawTool>(() => {
    const persisted = loadDrawTool();
    // "pan" is allowed in-memory but never persisted (it's transient).
    return persisted as DrawTool;
  });
  useEffect(() => {
    // Don't persist "pan" — fall back to arrow/line/erase on reload.
    if (drawTool !== "pan") saveDrawTool(drawTool);
  }, [drawTool]);
  const [showLabels, setShowLabels] = useState<boolean>(() => loadShowLabels());
  useEffect(() => {
    saveShowLabels(showLabels);
  }, [showLabels]);

  // Zoom + pan state, persisted to localStorage (one global value across
  // matches). Max zoom is 4×; min is 1× (can't shrink past full size).
  const [{ zoom, panX, panY }, setZoomPan] = useState(() => loadZoomPan());
  useEffect(() => {
    saveZoomPan(zoom, panX, panY);
  }, [zoom, panX, panY]);
  const touchPrimary = useMemo(() => isTouchPrimaryDevice(), []);

  // Stack the two cards vertically on narrow viewports (below iPad mini
  // portrait width). Keeps the sidebar + canvas side-by-side on anything
  // tablet-sized and up.
  const [isNarrow, setIsNarrow] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 767px)").matches;
  });
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const onChange = (e: MediaQueryListEvent) => setIsNarrow(e.matches);
    // addEventListener isn't on the oldest MediaQueryList shape; fall back
    // if missing.
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  }, []);

  const handleZoomChange = useCallback(
    (next: number, pX: number, pY: number) => {
      setZoomPan({
        zoom: clampZoomValue(next),
        panX: clampPanValue(pX, next),
        panY: clampPanValue(pY, next),
      });
    },
    [],
  );
  const handlePanChange = useCallback((pX: number, pY: number) => {
    setZoomPan((prev) => ({
      ...prev,
      panX: clampPanValue(pX, prev.zoom),
      panY: clampPanValue(pY, prev.zoom),
    }));
  }, []);

  /**
   * Step zoom up/down by snapping to the next/prev value in ZOOM_STEPS.
   * When zoom changes, keep the currently-visible centre of the field
   * centred under the new zoom so the content doesn't jump.
   */
  const stepZoom = useCallback((direction: 1 | -1) => {
    setZoomPan((prev) => {
      const idx = ZOOM_STEPS.findIndex((z) => z >= prev.zoom - 1e-6);
      const targetIdx = Math.max(
        0,
        Math.min(
          ZOOM_STEPS.length - 1,
          (idx === -1 ? 0 : idx) + direction,
        ),
      );
      const nextZoom = ZOOM_STEPS[targetIdx]!;
      if (nextZoom === prev.zoom) return prev;
      // Current visible centre, in field coords:
      const centerX = prev.panX + 0.5 / prev.zoom;
      const centerY = prev.panY + 0.5 / prev.zoom;
      const newPanX = clampPanValue(centerX - 0.5 / nextZoom, nextZoom);
      const newPanY = clampPanValue(centerY - 0.5 / nextZoom, nextZoom);
      return { zoom: nextZoom, panX: newPanX, panY: newPanY };
    });
  }, []);

  const resetZoom = useCallback(() => {
    setZoomPan({ zoom: 1, panX: 0, panY: 0 });
  }, []);

  // Spacebar-hold temporarily activates the Pan tool (Photoshop convention).
  // Ignored when the user is typing in an input/textarea or when zoom = 1.
  const [spaceHeld, setSpaceHeld] = useState(false);
  useEffect(() => {
    const isTypingTarget = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable
      );
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (isTypingTarget(document.activeElement)) return;
      if (e.repeat) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      setSpaceHeld(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      setSpaceHeld(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    const onBlur = () => setSpaceHeld(false);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);
  // Only pan-while-zoomed matters; don't flip the tool if nothing to pan.
  const spacePanActive = spaceHeld && zoom > 1;

  // If the user was in Pan mode and zoomed back out to 1.0, switch back to
  // their previously-persisted draw tool — pan has nothing to do at 1×.
  useEffect(() => {
    if (drawTool === "pan" && zoom <= 1) {
      setDrawTool(loadDrawTool() as DrawTool);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);
  // Cycling play/stop button. One button with three states:
  //   stopped        → label "▶ 1×",   click → play at 1×, move to playing-1x
  //   playing at 1×  → label "▶ 3×",   click → play at 3× (change speed)
  //   playing at 3×  → label "■ Stop", click → stop playback
  // Playback ending naturally also returns the state to "stopped".
  type PlayState = "stopped" | "playing-1x" | "playing-3x";
  const [playState, setPlayState] = useState<PlayState>("stopped");
  const handlePlayStopClick = () => {
    if (playState === "stopped") {
      canvasRef.current?.play(1);
      setPlayState("playing-1x");
    } else if (playState === "playing-1x") {
      canvasRef.current?.play(3);
      setPlayState("playing-3x");
    } else {
      canvasRef.current?.stop();
      setPlayState("stopped");
    }
  };
  const handlePlaybackEnd = useCallback(() => setPlayState("stopped"), []);
  type UndoEntry =
    | { kind: "add"; at: number; stroke: StrategyStroke }
    | { kind: "erase"; at: number; stroke: StrategyStroke }
    | { kind: "clear"; strokes: StrategyStroke[] };
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const canvasRef = useRef<StrategyCanvasHandle>(null);
  const strategySyncStatus = useStrategyPlansSyncStatus();
  const [isCanvasFullscreen, setIsCanvasFullscreen] = useState(false);

  // Exit fullscreen on Escape for quick keyboard dismiss.
  useEffect(() => {
    if (!isCanvasFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsCanvasFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isCanvasFullscreen]);

  // Initial load + poll for external updates (e.g. after sync).
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const p = await repository.getStrategyPlan(localKey);
      const ds = await repository.getStrategyDrawingsForPlan(localKey);
      if (!mounted) return;
      setPlan(p);
      setDrawings(ds);
      setActiveLocalId((prev) => {
        if (prev && ds.some((d) => d.localId === prev)) return prev;
        return ds[0]?.localId ?? null;
      });
    };
    load();
    const interval = setInterval(load, 2000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [localKey]);

  // Reset the undo stack whenever the active drawing changes.
  // The stack is in-memory only and scoped to one drawing.
  useEffect(() => {
    setUndoStack([]);
  }, [activeLocalId]);

  // A stable callback for the <SyncCountdown> below to drive. Refreshing
  // this specific plan every 30 s while the page is open bypasses the
  // active-tournament filter (so past tournaments work) and covers the
  // multi-device case — device B sees device A's edits without a manual
  // Sync Now. The IDB merge respects locally-dirty records.
  const refreshThisPlan = useCallback(() => {
    return refreshStrategyPlanForMatch(tournamentId, matchLevel, matchNumber);
  }, [tournamentId, matchLevel, matchNumber]);

  // Strategy plans are synced on a background interval (every 3 min) and
  // on manual "Sync Now", matching the app's pattern for other user-generated
  // data (events, comments, alerts). Local edits are persisted to IndexedDB
  // immediately below; the server push happens on those existing triggers.
  const hasUnsyncedChanges = useMemo(() => {
    if (plan?.dirty) return true;
    return drawings.some((d) => d.dirty || d.pendingDelete);
  }, [plan, drawings]);

  const year = tournament?.startTime
    ? new Date(tournament.startTime).getUTCFullYear()
    : new Date().getUTCFullYear();
  const backgroundSrc = fieldImageForYear(year);

  // Create the plan lazily on first edit.
  const ensurePlan = useCallback(async (): Promise<StoredStrategyPlan> => {
    const existing = await repository.getStrategyPlan(localKey);
    if (existing) return existing;
    const stub: StoredStrategyPlan = {
      localKey,
      id: null,
      tournamentId,
      matchLevel,
      matchNumber,
      shortSummary: "",
      strategyText: "",
      updatedByUserId: getUserid(),
      updatedByDisplayName: getDisplayName(),
      updatedAt: new Date().toISOString(),
      dirty: true,
    };
    await repository.putStrategyPlan(stub);
    setPlan(stub);
    return stub;
  }, [localKey, tournamentId, matchLevel, matchNumber]);

  const handleSummaryChange = async (value: string) => {
    const capped = value.slice(0, 32);
    const p = await ensurePlan();
    const updated: StoredStrategyPlan = {
      ...p,
      shortSummary: capped,
      updatedByUserId: getUserid(),
      updatedByDisplayName: getDisplayName(),
      updatedAt: new Date().toISOString(),
      dirty: true,
    };
    await repository.putStrategyPlan(updated);
    setPlan(updated);

  };

  const handleStrategyTextChange = async (value: string) => {
    const p = await ensurePlan();
    const updated: StoredStrategyPlan = {
      ...p,
      strategyText: value,
      updatedByUserId: getUserid(),
      updatedByDisplayName: getDisplayName(),
      updatedAt: new Date().toISOString(),
      dirty: true,
    };
    await repository.putStrategyPlan(updated);
    setPlan(updated);

  };

  const handleAddDrawing = async () => {
    await ensurePlan();
    const label = `Drawing ${drawings.length + 1}`;
    const now = new Date().toISOString();
    const stored: StoredStrategyDrawing = {
      localId: generateLocalId(),
      planLocalKey: localKey,
      id: null,
      planId: null,
      label,
      strokes: [],
      createdByUserId: getUserid(),
      createdByDisplayName: getDisplayName(),
      updatedByUserId: getUserid(),
      updatedByDisplayName: getDisplayName(),
      createdAt: now,
      updatedAt: now,
      dirty: true,
      pendingDelete: false,
    };
    await repository.putStrategyDrawing(stored);
    setDrawings((prev) => [...prev, stored]);
    setActiveLocalId(stored.localId);

  };

  const handleDeleteDrawing = async (localId: string) => {
    const d = drawings.find((x) => x.localId === localId);
    if (!d) return;
    if (d.id == null) {
      // Never synced — delete locally.
      await repository.deleteStrategyDrawingLocal(localId);
    } else {
      await repository.putStrategyDrawing({ ...d, pendingDelete: true });
    }
    const remaining = drawings.filter(
      (x) => x.localId !== localId && !x.pendingDelete,
    );
    setDrawings(remaining);
    if (activeLocalId === localId) {
      setActiveLocalId(remaining[0]?.localId ?? null);
    }

  };

  const activeDrawing = useMemo(
    () => drawings.find((d) => d.localId === activeLocalId) ?? null,
    [drawings, activeLocalId],
  );

  const persistStrokes = useCallback(
    async (nextStrokes: StrategyStroke[]) => {
      if (!activeDrawing) return;
      const now = new Date().toISOString();
      const updated: StoredStrategyDrawing = {
        ...activeDrawing,
        strokes: nextStrokes,
        updatedByUserId: getUserid(),
        updatedByDisplayName: getDisplayName(),
        updatedAt: now,
        dirty: true,
      };
      await repository.putStrategyDrawing(updated);
      setDrawings((prev) =>
        prev.map((d) => (d.localId === updated.localId ? updated : d)),
      );
  
    },
    [activeDrawing],
  );

  const handleStrokeComplete = useCallback(
    async (stroke: StrategyStroke) => {
      if (!activeDrawing) return;
      const at = activeDrawing.strokes.length;
      await persistStrokes([...activeDrawing.strokes, stroke]);
      setUndoStack((prev) => [...prev, { kind: "add", at, stroke }]);
    },
    [activeDrawing, persistStrokes],
  );

  const handleEraseStroke = useCallback(
    async (index: number) => {
      if (!activeDrawing) return;
      const erased = activeDrawing.strokes[index];
      if (!erased) return;
      const next = activeDrawing.strokes.filter((_, i) => i !== index);
      await persistStrokes(next);
      setUndoStack((prev) => [...prev, { kind: "erase", at: index, stroke: erased }]);
    },
    [activeDrawing, persistStrokes],
  );

  const undoLabel = useMemo(() => {
    const top = undoStack[undoStack.length - 1];
    if (!top) return "Undo";
    if (top.kind === "add")
      return top.stroke.arrow === false ? "Undo Line" : "Undo Arrow";
    if (top.kind === "erase") return "Undo Erase";
    return "Undo Clear";
  }, [undoStack]);

  const handleUndo = async () => {
    if (!activeDrawing) return;
    const top = undoStack[undoStack.length - 1];
    if (!top) return;
    let next: StrategyStroke[] = activeDrawing.strokes;
    if (top.kind === "add") {
      // Reverse of add: remove the stroke at its insertion index.
      next = activeDrawing.strokes.filter((_, i) => i !== top.at);
    } else if (top.kind === "erase") {
      // Reverse of erase: splice the stroke back in at its original index.
      next = [
        ...activeDrawing.strokes.slice(0, top.at),
        top.stroke,
        ...activeDrawing.strokes.slice(top.at),
      ];
    } else {
      // Reverse of clear: restore the whole snapshot.
      next = top.strokes;
    }
    await persistStrokes(next);
    setUndoStack((prev) => prev.slice(0, -1));
  };

  const handleClear = async () => {
    if (!activeDrawing || activeDrawing.strokes.length === 0) return;
    if (!confirm("Clear all strokes from this drawing?")) return;
    const snapshot = activeDrawing.strokes;
    await persistStrokes([]);
    setUndoStack((prev) => [...prev, { kind: "clear", strokes: snapshot }]);
  };

  const handleLabelChange = async (value: string) => {
    if (!activeDrawing) return;
    const now = new Date().toISOString();
    const updated: StoredStrategyDrawing = {
      ...activeDrawing,
      label: value,
      updatedByUserId: getUserid(),
      updatedByDisplayName: getDisplayName(),
      updatedAt: now,
      dirty: true,
    };
    await repository.putStrategyDrawing(updated);
    setDrawings((prev) =>
      prev.map((d) => (d.localId === updated.localId ? updated : d)),
    );

  };

  const strokeCountText = activeDrawing
    ? `${activeDrawing.strokes.length} stroke${activeDrawing.strokes.length === 1 ? "" : "s"}`
    : "";

  // Derive a SyncStatus for the Sync icon. The global sync-status row's
  // `remaining` count only updates after sync cycles fire, but locally we
  // know in real time whether this plan has unsynced edits — override
  // `remaining`/`isComplete` so the icon colour reflects the authoritative
  // local dirty state immediately.
  const syncIconStatus: SyncStatus = {
    ...strategySyncStatus,
    remaining: hasUnsyncedChanges ? 1 : 0,
    isComplete: !hasUnsyncedChanges && !strategySyncStatus.error,
  };
  const [manualSyncing, setManualSyncing] = useState(false);
  const handleManualSync = async () => {
    if (manualSyncing || strategySyncStatus.inProgress) return;
    setManualSyncing(true);
    try {
      await syncStrategyPlans();
      // Also pull this specific match's server state — handles the case
      // where the tournament is past and wouldn't be covered by the
      // active-tournament filter inside syncStrategyPlans().
      await refreshStrategyPlanForMatch(
        tournamentId,
        matchLevel,
        matchNumber,
      );
    } finally {
      setManualSyncing(false);
    }
  };
  const syncTitle = strategySyncStatus.error
    ? "Sync failed — tap to retry"
    : strategySyncStatus.inProgress || manualSyncing
      ? "Syncing…"
      : hasUnsyncedChanges
        ? "Local changes pending — tap to sync now"
        : "Synced — tap to sync again";

  return (
    <main>
      <div className="page-header">
        <h1>
          Match Strategy — {matchLevel} {matchNumber}
        </h1>
        <p>
          <NavLink
            to={`/strategy/${encodeURIComponent(tournamentId)}`}
            className="btn-secondary"
          >
            ← Back to matches
          </NavLink>
          {" "}
          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="strategy-header-lock-btn"
            >
              <UnlockedIcon /> Unlock to Edit
            </button>
          )}
          {isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="btn-secondary strategy-header-lock-btn"
            >
              <LockedIcon /> Lock
            </button>
          )}
          <button
            type="button"
            onClick={handleManualSync}
            disabled={strategySyncStatus.inProgress || manualSyncing}
            title={syncTitle}
            aria-label={syncTitle}
            className="strategy-sync-btn"
          >
            <Sync status={syncIconStatus} />
          </button>
          <span className="strategy-sync-countdown-wrap">
            <SyncCountdown
              intervalMs={30_000}
              onSync={refreshThisPlan}
              label=""
            />
          </span>
        </p>
      </div>

      <div
        className={
          isNarrow
            ? "strategy-plan-grid is-stacked"
            : "strategy-plan-grid"
        }
      >
        <section className="card">
          <label className="strategy-sidebar-field">
            <strong>Short Summary</strong>{" "}
            <span className="strategy-char-count">
              ({(plan?.shortSummary ?? "").length}/32)
            </span>
            <input
              type="text"
              maxLength={32}
              disabled={!isEditing}
              value={plan?.shortSummary ?? ""}
              onChange={(e) => handleSummaryChange(e.target.value)}
              className="strategy-sidebar-input-control"
            />
          </label>
          <label className="strategy-sidebar-field">
            <strong>Strategy</strong>
            <textarea
              rows={6}
              disabled={!isEditing}
              value={plan?.strategyText ?? ""}
              onChange={(e) => handleStrategyTextChange(e.target.value)}
              className="strategy-sidebar-input-control"
            />
          </label>
          <div
            className={isNarrow ? "strategy-drawing-list-scroll" : undefined}
          >
            <DrawingList
              drawings={drawings}
              activeLocalId={activeLocalId}
              onSelect={setActiveLocalId}
              onAdd={handleAddDrawing}
              onDelete={handleDeleteDrawing}
              canEdit={isEditing}
            />
          </div>
        </section>

        <section
          className={
            isCanvasFullscreen
              ? "card strategy-canvas-section is-fullscreen"
              : "card strategy-canvas-section"
          }
        >
          {activeDrawing ? (
            isCanvasFullscreen ? (
            <>
              {/*
                Fullscreen view: full editor with metadata row (label input +
                stroke count + palette), toolbar, and interactive canvas.
              */}
              <div className="strategy-metadata-row">
                {isEditing ? (
                  <input
                    type="text"
                    maxLength={64}
                    value={activeDrawing.label}
                    onChange={(e) => handleLabelChange(e.target.value)}
                    style={{ flex: "0 1 14rem", minWidth: 0 }}
                  />
                ) : (
                  <h2 className="strategy-drawing-title-heading">
                    {activeDrawing.label || "(untitled)"}
                  </h2>
                )}
                <span className="strategy-char-count">{strokeCountText}</span>
                {isEditing && (
                  <RobotSlotPalette
                    selected={selectedSlot}
                    onSelect={handleSlotClick}
                    teamNumbers={teamNumbers}
                    soloedSlot={soloedSlot}
                  />
                )}
              </div>

              {/* Row 3: the toolbar — tools | navigate | history | playback | view */}
              <div className="strategy-canvas-toolbar">
                {isEditing && (
                  <>
                    <ToolButton
                      active={drawTool === "arrow"}
                      onClick={() => setDrawTool("arrow")}
                      title="Arrow — draw with arrowhead"
                    >
                      <ArrowIcon /> {showLabels && "Arrow"}
                    </ToolButton>
                    <ToolButton
                      active={drawTool === "line"}
                      onClick={() => setDrawTool("line")}
                      title="Line — draw a plain line"
                    >
                      <LineIcon /> {showLabels && "Line"}
                    </ToolButton>
                    <ToolButton
                      active={drawTool === "erase"}
                      onClick={() => setDrawTool("erase")}
                      title="Eraser — tap a stroke to delete it"
                    >
                      <EraserIcon /> {showLabels && "Erase"}
                    </ToolButton>
                    <ToolbarDivider />
                    {/* Navigate group: Pan + zoom controls */}
                    <ToolButton
                      active={drawTool === "pan"}
                      onClick={() => setDrawTool("pan")}
                      title={
                        zoom > 1
                          ? "Pan — drag to move the view (or hold Space)"
                          : "Pan (zoom in first)"
                      }
                      disabled={zoom <= 1}
                    >
                      <PanIcon /> {showLabels && "Pan"}
                    </ToolButton>
                    {!touchPrimary && (
                      <>
                        <button
                          type="button"
                          onClick={() => stepZoom(-1)}
                          className="btn-secondary strategy-toolbar-btn strategy-zoom-btn"
                          disabled={zoom <= MIN_ZOOM + 1e-6}
                          title="Zoom out"
                        >
                          −
                        </button>
                        <button
                          type="button"
                          onClick={resetZoom}
                          className="btn-secondary strategy-toolbar-btn strategy-zoom-pct-btn"
                          disabled={zoom <= MIN_ZOOM + 1e-6}
                          title="Reset to 100%"
                        >
                          {Math.round(zoom * 100)}%
                        </button>
                        <button
                          type="button"
                          onClick={() => stepZoom(1)}
                          className="btn-secondary strategy-toolbar-btn strategy-zoom-btn"
                          disabled={zoom >= MAX_ZOOM - 1e-6}
                          title="Zoom in"
                        >
                          +
                        </button>
                      </>
                    )}
                    <ToolbarDivider />
                    <button
                      type="button"
                      onClick={handleUndo}
                      className="btn-secondary strategy-toolbar-btn strategy-icon-text-btn"
                      disabled={undoStack.length === 0}
                      title={undoLabel}
                    >
                      <UndoIcon /> {showLabels && undoLabel}
                    </button>
                    <button
                      type="button"
                      onClick={handleClear}
                      className="btn-secondary strategy-toolbar-btn strategy-icon-text-btn"
                      disabled={activeDrawing.strokes.length === 0}
                      title="Clear all strokes"
                    >
                      <TrashIcon /> {showLabels && "Clear"}
                    </button>
                    <ToolbarDivider />
                  </>
                )}
                <button
                  type="button"
                  onClick={handlePlayStopClick}
                  className={
                    playState === "playing-3x"
                      ? "btn-secondary strategy-toolbar-btn strategy-icon-text-btn"
                      : "btn-secondary strategy-toolbar-btn"
                  }
                  title={
                    playState === "stopped"
                      ? "Play at 1× — tap again to speed up"
                      : playState === "playing-1x"
                        ? "Speed up to 3×"
                        : "Stop playback"
                  }
                >
                  {playState === "stopped" &&
                    `▶${showLabels ? " Play 1×" : " 1×"}`}
                  {playState === "playing-1x" &&
                    `▶${showLabels ? " Play 3×" : " 3×"}`}
                  {playState === "playing-3x" && (
                    <>
                      <StopIcon /> {showLabels && "Stop"}
                    </>
                  )}
                </button>
                <ToolbarDivider />
                <button
                  type="button"
                  onClick={() => setIsCanvasFullscreen((v) => !v)}
                  className="btn-secondary strategy-toolbar-btn strategy-icon-text-btn"
                  title={
                    isCanvasFullscreen
                      ? "Exit fullscreen (Esc)"
                      : "Fullscreen"
                  }
                >
                  {isCanvasFullscreen ? (
                    <ExitFullscreenIcon />
                  ) : (
                    <EnterFullscreenIcon />
                  )}
                  {showLabels &&
                    (isCanvasFullscreen ? "Exit Fullscreen" : "Fullscreen")}
                </button>
                {isCanvasFullscreen && (
                  <button
                    type="button"
                    onClick={() => setIsEditing((v) => !v)}
                    className={
                      isEditing
                        ? "btn-secondary strategy-toolbar-btn strategy-icon-text-btn"
                        : "strategy-toolbar-btn strategy-icon-text-btn"
                    }
                    title={isEditing ? "Lock (read-only)" : "Unlock to edit"}
                  >
                    {isEditing ? <LockedIcon /> : <UnlockedIcon />}
                    {showLabels && (isEditing ? "Lock" : "Unlock to Edit")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowLabels((v) => !v)}
                  className="btn-secondary strategy-toolbar-btn strategy-icon-text-btn"
                  aria-pressed={!showLabels}
                  title={
                    showLabels ? "Show icons only" : "Show labels"
                  }
                >
                  <LabelsIcon /> {showLabels && "Show Icons Only"}
                </button>
              </div>

              {isEditing ? (
                <StrategyCanvas
                  ref={canvasRef}
                  backgroundSrc={backgroundSrc}
                  strokes={activeDrawing.strokes.map((s) => ({
                    ...s,
                    colorIndex:
                      s.colorIndex ?? colorIndexForSlot(s.robotSlot),
                  }))}
                  readOnly={false}
                  selectedSlot={selectedSlot}
                  selectedArrow={drawTool === "arrow"}
                  tool={
                    spacePanActive
                      ? "pan"
                      : drawTool === "erase"
                        ? "erase"
                        : drawTool === "pan"
                          ? "pan"
                          : "draw"
                  }
                  soloedSlot={soloedSlot}
                  zoom={zoom}
                  panX={panX}
                  panY={panY}
                  fillHeight={isCanvasFullscreen}
                  onStrokeComplete={handleStrokeComplete}
                  onEraseStroke={handleEraseStroke}
                  onPanChange={handlePanChange}
                  onZoomChange={handleZoomChange}
                  onPlaybackEnd={handlePlaybackEnd}
                />
              ) : (
                <StrategyReadOnlyCanvas
                  ref={canvasRef}
                  backgroundSrc={backgroundSrc}
                  strokes={activeDrawing.strokes}
                  zoom={zoom}
                  panX={panX}
                  panY={panY}
                  fillHeight={isCanvasFullscreen}
                  onPanChange={handlePanChange}
                  onZoomChange={handleZoomChange}
                  onPlaybackEnd={handlePlaybackEnd}
                />
              )}
            </>
            ) : (
              // Windowed view: read-only canvas at 1×, click to enter fullscreen.
              <>
                <div className="strategy-metadata-row">
                  <span className="strategy-drawing-title-static">
                    {activeDrawing.label}
                  </span>
                  <span className="strategy-char-count">
                    {strokeCountText}
                  </span>
                </div>
                <div
                  className="strategy-canvas-click-to-fullscreen"
                  onClick={() => setIsCanvasFullscreen(true)}
                  title="Tap to edit in fullscreen"
                >
                  <StrategyReadOnlyCanvas
                    ref={canvasRef}
                    backgroundSrc={backgroundSrc}
                    strokes={activeDrawing.strokes}
                    onPlaybackEnd={handlePlaybackEnd}
                  />
                </div>
              </>
            )
          ) : (
            <p>
              No drawings yet.{" "}
              {isEditing
                ? 'Click "+ New Drawing" to start.'
                : "Unlock to add one."}
            </p>
          )}
        </section>
      </div>
    </main>
  );
};


const ToolbarDivider = () => (
  <div aria-hidden="true" className="strategy-toolbar-divider" />
);

const ToolButton = (props: {
  active: boolean;
  onClick: () => void;
  title?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={props.onClick}
    aria-pressed={props.active}
    title={props.title}
    disabled={props.disabled}
    className="strategy-toolbar-btn strategy-icon-text-btn"
    style={{
      background: props.active
        ? "var(--color-btn-primary-bg)"
        : "var(--color-btn-secondary-bg)",
      color: props.active
        ? "var(--color-btn-primary-text)"
        : "var(--color-btn-secondary-text)",
      border: `2px solid ${
        props.active
          ? "var(--color-btn-primary-bg)"
          : "var(--color-btn-secondary-border)"
      }`,
    }}
  >
    {props.children}
  </button>
);

const StrategyPlanPage = () => {
  const params = useParams();
  const tournamentId = decodeURIComponent(params.tournamentId ?? "");
  const matchLevel = decodeURIComponent(params.level ?? "");
  const matchNumber = parseInt(params.matchNumber ?? "0", 10);
  return (
    <RequireRole roles={["EXPERTSCOUT", "ADMIN", "SUPERUSER"]}>
      <StrategyPlanPageInner
        tournamentId={tournamentId}
        matchLevel={matchLevel}
        matchNumber={matchNumber}
      />
    </RequireRole>
  );
};

export default StrategyPlanPage;
