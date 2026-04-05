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
import { fieldImageForYear } from "~/common/strategy/fieldImage.ts";
import { colorIndexForSlot } from "~/common/strategy/colors.ts";
import type {
  RobotSlot,
  StrategyStroke,
} from "~/types/StrategyStroke.ts";
import type { RBTournament } from "~/types/RBTournament.ts";
import type { RBScheduleRecord } from "~/types/RBScheduleRecord.ts";

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
  const [selectedArrow, setSelectedArrow] = useState<boolean>(true);
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

  const handleStrokeComplete = useCallback(
    async (stroke: StrategyStroke) => {
      if (!activeDrawing) return;
      const now = new Date().toISOString();
      const updated: StoredStrategyDrawing = {
        ...activeDrawing,
        strokes: [...activeDrawing.strokes, stroke],
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

  const handleUndo = async () => {
    if (!activeDrawing || activeDrawing.strokes.length === 0) return;
    const now = new Date().toISOString();
    const updated: StoredStrategyDrawing = {
      ...activeDrawing,
      strokes: activeDrawing.strokes.slice(0, -1),
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

  const handleClear = async () => {
    if (!activeDrawing || activeDrawing.strokes.length === 0) return;
    if (!confirm("Clear all strokes from this drawing?")) return;
    const now = new Date().toISOString();
    const updated: StoredStrategyDrawing = {
      ...activeDrawing,
      strokes: [],
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
              style={{ marginLeft: "0.6rem" }}
            >
              Unlock to Edit
            </button>
          )}
          {isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              style={{ marginLeft: "0.6rem" }}
              className="btn-secondary"
            >
              Lock
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
                  style={{ flex: "1 1 12rem", minWidth: 0 }}
                />
                <button
                  type="button"
                  onClick={() => canvasRef.current?.play(1)}
                  className="btn-secondary"
                >
                  ▶ Play
                </button>
                <button
                  type="button"
                  onClick={() => canvasRef.current?.play(2)}
                  className="btn-secondary"
                >
                  ▶▶ Play 2×
                </button>
                <button
                  type="button"
                  onClick={() => canvasRef.current?.stop()}
                  className="btn-secondary"
                >
                  Stop
                </button>
                <button
                  type="button"
                  onClick={() => setIsCanvasFullscreen((v) => !v)}
                  className="btn-secondary"
                  title={
                    isCanvasFullscreen
                      ? "Exit fullscreen (Esc)"
                      : "Fullscreen"
                  }
                >
                  {isCanvasFullscreen ? "⤦ Exit Fullscreen" : "⤢ Fullscreen"}
                </button>
                {isEditing && (
                  <>
                    <button
                      type="button"
                      onClick={handleUndo}
                      className="btn-secondary"
                      disabled={activeDrawing.strokes.length === 0}
                    >
                      Undo
                    </button>
                    <button
                      type="button"
                      onClick={handleClear}
                      className="btn-secondary"
                      disabled={activeDrawing.strokes.length === 0}
                    >
                      Clear
                    </button>
                  </>
                )}
                <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>
                  {strokeCountText}
                </span>
              </div>
              {isEditing && (
                <>
                  <div
                    style={{
                      display: "flex",
                      gap: "0.4rem",
                      margin: "0.5rem 0 0",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedArrow(true)}
                      aria-pressed={selectedArrow}
                      style={{
                        background: selectedArrow
                          ? "var(--color-btn-primary-bg, #38f)"
                          : "transparent",
                        color: selectedArrow
                          ? "var(--color-btn-primary-text, #fff)"
                          : "var(--color-text-primary)",
                        border: "2px solid var(--color-btn-primary-bg, #38f)",
                      }}
                    >
                      → Arrow
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedArrow(false)}
                      aria-pressed={!selectedArrow}
                      style={{
                        background: !selectedArrow
                          ? "var(--color-btn-primary-bg, #38f)"
                          : "transparent",
                        color: !selectedArrow
                          ? "var(--color-btn-primary-text, #fff)"
                          : "var(--color-text-primary)",
                        border: "2px solid var(--color-btn-primary-bg, #38f)",
                      }}
                    >
                      — Line
                    </button>
                  </div>
                  <RobotSlotPalette
                    selected={selectedSlot}
                    onSelect={setSelectedSlot}
                    teamNumbers={teamNumbers}
                  />
                </>
              )}
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
                  selectedArrow={selectedArrow}
                  onStrokeComplete={handleStrokeComplete}
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
