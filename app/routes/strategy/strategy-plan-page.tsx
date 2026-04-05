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
import { ping } from "~/common/storage/rb.ts";
import { syncStrategyPlans } from "~/common/sync/sync.ts";
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

const DRAW_TOOL_STORAGE_KEY = "raveneye_strategy_draw_tool";
const TOOLBAR_LABELS_STORAGE_KEY = "raveneye_strategy_toolbar_labels";
type PersistedDrawTool = "arrow" | "line" | "erase";

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
  const localKey = strategyPlanLocalKey(tournamentId, matchLevel, matchNumber);
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
  type DrawTool = "arrow" | "line" | "erase";
  const [drawTool, setDrawTool] = useState<DrawTool>(() => loadDrawTool());
  useEffect(() => {
    saveDrawTool(drawTool);
  }, [drawTool]);
  const [showLabels, setShowLabels] = useState<boolean>(() => loadShowLabels());
  useEffect(() => {
    saveShowLabels(showLabels);
  }, [showLabels]);
  // Cycling playback speed: click plays at the current speed, then cycles
  // 1× → 2× → 3× → 1×.
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 3>(1);
  const handlePlayCycle = () => {
    canvasRef.current?.play(playbackSpeed);
    setPlaybackSpeed((s) => (s === 3 ? 1 : ((s + 1) as 1 | 2 | 3)));
  };
  type UndoEntry =
    | { kind: "add"; at: number; stroke: StrategyStroke }
    | { kind: "erase"; at: number; stroke: StrategyStroke }
    | { kind: "clear"; strokes: StrategyStroke[] };
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const canvasRef = useRef<StrategyCanvasHandle>(null);
  const syncDebounceRef = useRef<number | null>(null);
  const [syncState, setSyncState] = useState<
    "idle" | "saved" | "syncing" | "synced" | "error"
  >("idle");
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

  const scheduleSync = useCallback(() => {
    if (syncDebounceRef.current != null) {
      window.clearTimeout(syncDebounceRef.current);
    }
    setSyncState("saved");
    syncDebounceRef.current = window.setTimeout(async () => {
      const alive = await ping();
      if (!alive) return;
      setSyncState("syncing");
      try {
        await syncStrategyPlans();
        setSyncState("synced");
      } catch {
        setSyncState("error");
      }
    }, 1500);
  }, []);

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
    scheduleSync();
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
    scheduleSync();
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
    scheduleSync();
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
    scheduleSync();
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
      scheduleSync();
    },
    [activeDrawing, scheduleSync],
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
    scheduleSync();
  };

  const strokeCountText = activeDrawing
    ? `${activeDrawing.strokes.length} stroke${activeDrawing.strokes.length === 1 ? "" : "s"}`
    : "";

  const syncBadge = (() => {
    switch (syncState) {
      case "saved":
        return <span>Saved locally</span>;
      case "syncing":
        return <span>Syncing…</span>;
      case "synced":
        return <span>Synced to server</span>;
      case "error":
        return (
          <span className="banner banner-warning">Sync failed — will retry</span>
        );
      default:
        return null;
    }
  })();

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
              style={{
                marginLeft: "0.6rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
            >
              <UnlockedIcon /> Unlock to Edit
            </button>
          )}
          {isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              style={{
                marginLeft: "0.6rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
              className="btn-secondary"
            >
              <LockedIcon /> Lock
            </button>
          )}
          <span style={{ marginLeft: "0.8rem" }}>{syncBadge}</span>
        </p>
        {!isEditing && (
          <div className="banner banner-warning">
            This plan is LOCKED (read-only). Click Unlock to Edit to make
            changes.
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(18rem, 28%) 1fr",
          gap: "1rem",
          alignItems: "start",
        }}
      >
        <section className="card">
          <label style={{ display: "block", marginBottom: "0.6rem" }}>
            <strong>Short Summary</strong>{" "}
            <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>
              ({(plan?.shortSummary ?? "").length}/32)
            </span>
            <input
              type="text"
              maxLength={32}
              disabled={!isEditing}
              value={plan?.shortSummary ?? ""}
              onChange={(e) => handleSummaryChange(e.target.value)}
              style={{ width: "100%", marginTop: "0.2rem" }}
            />
          </label>
          <label style={{ display: "block", marginBottom: "0.6rem" }}>
            <strong>Strategy</strong>
            <textarea
              rows={6}
              disabled={!isEditing}
              value={plan?.strategyText ?? ""}
              onChange={(e) => handleStrategyTextChange(e.target.value)}
              style={{ width: "100%", marginTop: "0.2rem" }}
            />
          </label>
          <DrawingList
            drawings={drawings}
            activeLocalId={activeLocalId}
            onSelect={setActiveLocalId}
            onAdd={handleAddDrawing}
            onDelete={handleDeleteDrawing}
            canEdit={isEditing}
          />
        </section>

        <section
          className="card"
          style={
            isCanvasFullscreen
              ? {
                  position: "fixed",
                  inset: 0,
                  zIndex: 1000,
                  margin: 0,
                  borderRadius: 0,
                  overflow: "auto",
                  background: "var(--color-surface, #1a1a1a)",
                }
              : undefined
          }
        >
          {activeDrawing ? (
            <>
              {/*
                Rows 1–2: drawing metadata (label + stroke count) + robot-slot
                palette. In fullscreen mode these share a single row to
                conserve vertical space; otherwise they stack.
              */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.4rem",
                }}
              >
                <input
                  type="text"
                  maxLength={64}
                  disabled={!isEditing}
                  value={activeDrawing.label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  style={{
                    flex: isCanvasFullscreen ? "0 1 14rem" : "1 1 12rem",
                    minWidth: 0,
                  }}
                />
                <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>
                  {strokeCountText}
                </span>
                {isCanvasFullscreen && isEditing && (
                  <RobotSlotPalette
                    selected={selectedSlot}
                    onSelect={setSelectedSlot}
                    teamNumbers={teamNumbers}
                    disabled={drawTool === "erase"}
                    style={{ margin: 0 }}
                  />
                )}
              </div>
              {!isCanvasFullscreen && isEditing && (
                <RobotSlotPalette
                  selected={selectedSlot}
                  onSelect={setSelectedSlot}
                  teamNumbers={teamNumbers}
                  disabled={drawTool === "erase"}
                  style={{ marginBottom: "0.4rem" }}
                />
              )}

              {/* Row 3: the toolbar — tools | history | playback | view */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.4rem",
                  paddingBottom: "0.5rem",
                  borderBottom: "1px solid rgba(128,128,128,0.25)",
                }}
              >
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
                    <button
                      type="button"
                      onClick={handleUndo}
                      className="btn-secondary"
                      disabled={undoStack.length === 0}
                      title={undoLabel}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem",
                      }}
                    >
                      <UndoIcon /> {showLabels && undoLabel}
                    </button>
                    <button
                      type="button"
                      onClick={handleClear}
                      className="btn-secondary"
                      disabled={activeDrawing.strokes.length === 0}
                      title="Clear all strokes"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem",
                      }}
                    >
                      <TrashIcon /> {showLabels && "Clear"}
                    </button>
                    <ToolbarDivider />
                  </>
                )}
                <button
                  type="button"
                  onClick={handlePlayCycle}
                  className="btn-secondary"
                  title={`Play at ${playbackSpeed}× — click again to cycle speed`}
                >
                  ▶{showLabels ? ` Play ${playbackSpeed}×` : ` ${playbackSpeed}×`}
                </button>
                <button
                  type="button"
                  onClick={() => canvasRef.current?.stop()}
                  className="btn-secondary"
                  title="Stop playback"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                  }}
                >
                  <StopIcon /> {showLabels && "Stop"}
                </button>
                <ToolbarDivider />
                <button
                  type="button"
                  onClick={() => setIsCanvasFullscreen((v) => !v)}
                  className="btn-secondary"
                  title={
                    isCanvasFullscreen
                      ? "Exit fullscreen (Esc)"
                      : "Fullscreen"
                  }
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                  }}
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
                    className={isEditing ? "btn-secondary" : undefined}
                    title={isEditing ? "Lock (read-only)" : "Unlock to edit"}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                    }}
                  >
                    {isEditing ? <LockedIcon /> : <UnlockedIcon />}
                    {showLabels && (isEditing ? "Lock" : "Unlock to Edit")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowLabels((v) => !v)}
                  className="btn-secondary"
                  aria-pressed={!showLabels}
                  title={
                    showLabels ? "Show icons only" : "Show labels"
                  }
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                  }}
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
                  tool={drawTool === "erase" ? "erase" : "draw"}
                  onStrokeComplete={handleStrokeComplete}
                  onEraseStroke={handleEraseStroke}
                />
              ) : (
                <StrategyReadOnlyCanvas
                  ref={canvasRef}
                  backgroundSrc={backgroundSrc}
                  strokes={activeDrawing.strokes}
                />
              )}
            </>
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
  <div
    aria-hidden="true"
    style={{
      width: 1,
      height: "1.6rem",
      background: "rgba(128,128,128,0.35)",
      margin: "0 0.15rem",
    }}
  />
);

const ToolButton = (props: {
  active: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={props.onClick}
    aria-pressed={props.active}
    title={props.title}
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
      display: "inline-flex",
      alignItems: "center",
      gap: "0.3rem",
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
