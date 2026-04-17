import { useEffect, useMemo, useState } from "react";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import Spinner from "~/common/Spinner.tsx";
import {
  getFieldCalibration,
  saveFieldCalibration,
} from "~/common/storage/rb.ts";
import { fieldImageForYear } from "~/common/strategy/fieldImage.ts";
import {
  DEFAULT_ROBOT_DIMENSIONS_M,
  FIELD_DIMENSIONS_BY_YEAR,
} from "~/common/field/fieldConstants.ts";
import {
  type Point,
  fieldToImageNormalized,
  imageNormalizedToField,
  isCalibrationWellFormed,
} from "~/common/field/homography.ts";
import type { FieldCalibration } from "~/types/FieldCalibration.ts";
import FieldCalibrationOverlay, {
  type OverlayPhase,
} from "./FieldCalibrationOverlay.tsx";

const DEFAULT_YEAR = 2026;

// Stage 1 renders a single fixed pose as a visual confirmation that the
// homography is sane. Stage 2 replaces this with real telemetry playback.
const STAGE_1_FIXED_POSE = { xm: 2.0, ym: 2.0, headingDeg: 0 };

const PHASES_FOR_CLICK_COUNT: OverlayPhase[] = [
  "picking-corner-0",
  "picking-corner-1",
  "picking-corner-2",
  "picking-corner-3",
  "ready",
];

function defaultDimensions(year: number) {
  const dims = FIELD_DIMENSIONS_BY_YEAR[year];
  return {
    fieldLengthM: dims?.lengthM ?? 16.54,
    fieldWidthM: dims?.widthM ?? 8.07,
    robotLengthM: DEFAULT_ROBOT_DIMENSIONS_M.lengthM,
    robotWidthM: DEFAULT_ROBOT_DIMENSIONS_M.widthM,
  };
}

const CalibrationWorkArea = () => {
  const [year, setYear] = useState<number>(DEFAULT_YEAR);
  const [fieldLengthM, setFieldLengthM] = useState<number>(
    defaultDimensions(DEFAULT_YEAR).fieldLengthM,
  );
  const [fieldWidthM, setFieldWidthM] = useState<number>(
    defaultDimensions(DEFAULT_YEAR).fieldWidthM,
  );
  const [robotLengthM, setRobotLengthM] = useState<number>(
    DEFAULT_ROBOT_DIMENSIONS_M.lengthM,
  );
  const [robotWidthM, setRobotWidthM] = useState<number>(
    DEFAULT_ROBOT_DIMENSIONS_M.widthM,
  );
  const [corners, setCorners] = useState<Point[]>([]);
  const [phase, setPhase] = useState<OverlayPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [verifyText, setVerifyText] = useState<string | null>(null);

  // Load existing calibration (or defaults) whenever the year changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setVerifyText(null);
    setSaveStatus(null);
    getFieldCalibration(year)
      .then((cal) => {
        if (cancelled) return;
        if (cal) {
          setFieldLengthM(cal.fieldLengthM);
          setFieldWidthM(cal.fieldWidthM);
          setRobotLengthM(cal.robotLengthM);
          setRobotWidthM(cal.robotWidthM);
          setCorners(cal.corners.map((c) => ({ x: c.x, y: c.y })));
          setPhase("ready");
        } else {
          const d = defaultDimensions(year);
          setFieldLengthM(d.fieldLengthM);
          setFieldWidthM(d.fieldWidthM);
          setRobotLengthM(d.robotLengthM);
          setRobotWidthM(d.robotWidthM);
          setCorners([]);
          setPhase("idle");
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(
          "Could not load calibration: " +
            (e instanceof Error ? e.message : String(e)),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [year]);

  const startPicking = () => {
    setCorners([]);
    setPhase("picking-corner-0");
    setError(null);
    setVerifyText(null);
  };

  const handleCornerClick = (p: Point) => {
    const next = [...corners, p];
    if (next.length < 4) {
      setCorners(next);
      setPhase(PHASES_FOR_CLICK_COUNT[next.length]!);
      return;
    }
    // Fourth click: validate the whole quad before committing.
    const check = isCalibrationWellFormed(next);
    if (!check.ok) {
      setError(errorCopyFor(check.reason));
      // Stay in picking-corner-3 with only 3 corners so the user can adjust.
      setCorners(next.slice(0, 3));
      setPhase("picking-corner-3");
      return;
    }
    setCorners(next);
    setPhase("ready");
    setError(null);
  };

  const handleReset = () => {
    setCorners([]);
    setPhase("idle");
    setError(null);
    setVerifyText(null);
    setSaveStatus(null);
  };

  const calibration: FieldCalibration | null = useMemo(() => {
    if (phase !== "ready" || corners.length !== 4) return null;
    return {
      year,
      fieldLengthM,
      fieldWidthM,
      robotLengthM,
      robotWidthM,
      corners: [corners[0]!, corners[1]!, corners[2]!, corners[3]!],
    };
  }, [
    phase,
    corners,
    year,
    fieldLengthM,
    fieldWidthM,
    robotLengthM,
    robotWidthM,
  ]);

  const handleSave = async () => {
    if (!calibration) return;
    setSaving(true);
    setError(null);
    setSaveStatus(null);
    try {
      await saveFieldCalibration(year, calibration);
      setSaveStatus("Saved.");
    } catch (e: unknown) {
      setError(
        "Could not save: " + (e instanceof Error ? e.message : String(e)),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = () => {
    if (!calibration) return;
    const toImage = fieldToImageNormalized(calibration);
    const toField = imageNormalizedToField(calibration);
    const testPoints: Point[] = [
      { x: 0, y: 0 },
      { x: fieldLengthM, y: 0 },
      { x: fieldLengthM, y: fieldWidthM },
      { x: 0, y: fieldWidthM },
      { x: fieldLengthM / 2, y: fieldWidthM / 2 },
    ];
    const rows = testPoints.map((p) => {
      const round = toField(toImage(p));
      const deltaMm = Math.hypot(p.x - round.x, p.y - round.y) * 1000;
      return `(${p.x.toFixed(2)}, ${p.y.toFixed(2)}) m → Δ ${deltaMm.toFixed(3)} mm`;
    });
    setVerifyText(rows.join("\n"));
  };

  if (loading) return <Spinner />;

  const imageUrl = fieldImageForYear(year);

  const phaseHint = (() => {
    switch (phase) {
      case "idle":
        return "Press Start to begin clicking the four field corners.";
      case "picking-corner-0":
        return "Click the BLUE origin corner (field 0, 0).";
      case "picking-corner-1":
        return "Click the RED origin corner (field L, 0).";
      case "picking-corner-2":
        return "Click the RED far corner (field L, W).";
      case "picking-corner-3":
        return "Click the BLUE far corner (field 0, W).";
      case "ready":
        return "Calibration ready. A robot at (2, 2, 0°) is drawn as a visual sanity check.";
    }
  })();

  return (
    <section className="field-calibration-page">
      <div className="form-field">
        <label htmlFor="fmc-year">FRC season</label>
        <input
          id="fmc-year"
          type="number"
          min={2000}
          max={2100}
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value, 10) || year)}
        />
      </div>

      <fieldset>
        <legend>Field dimensions (m)</legend>
        <div className="dimensions-grid">
          <div className="form-field">
            <label htmlFor="fmc-field-l">Length (L)</label>
            <input
              id="fmc-field-l"
              type="number"
              step="0.01"
              min="1"
              value={fieldLengthM}
              onChange={(e) =>
                setFieldLengthM(parseFloat(e.target.value) || fieldLengthM)
              }
            />
          </div>
          <div className="form-field">
            <label htmlFor="fmc-field-w">Width (W)</label>
            <input
              id="fmc-field-w"
              type="number"
              step="0.01"
              min="1"
              value={fieldWidthM}
              onChange={(e) =>
                setFieldWidthM(parseFloat(e.target.value) || fieldWidthM)
              }
            />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Robot dimensions (m)</legend>
        <div className="dimensions-grid">
          <div className="form-field">
            <label htmlFor="fmc-robot-l">Length</label>
            <input
              id="fmc-robot-l"
              type="number"
              step="0.01"
              min="0.1"
              value={robotLengthM}
              onChange={(e) =>
                setRobotLengthM(parseFloat(e.target.value) || robotLengthM)
              }
            />
          </div>
          <div className="form-field">
            <label htmlFor="fmc-robot-w">Width</label>
            <input
              id="fmc-robot-w"
              type="number"
              step="0.01"
              min="0.1"
              value={robotWidthM}
              onChange={(e) =>
                setRobotWidthM(parseFloat(e.target.value) || robotWidthM)
              }
            />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Calibrate corners</legend>
        <p className="field-calibration-phase">{phaseHint}</p>
        <FieldCalibrationOverlay
          imageUrl={imageUrl}
          fieldL={fieldLengthM}
          fieldW={fieldWidthM}
          robotL={robotLengthM}
          robotW={robotWidthM}
          corners={corners}
          phase={phase}
          pose={phase === "ready" ? STAGE_1_FIXED_POSE : undefined}
          onCornerClick={handleCornerClick}
        />
        {error && <p className="field-calibration-error">{error}</p>}
        <div className="form-actions" style={{ marginTop: "0.75rem" }}>
          {phase === "idle" || phase === "ready" ? (
            <button type="button" onClick={startPicking}>
              {phase === "ready" ? "Re-calibrate" : "Start"}
            </button>
          ) : (
            <button type="button" onClick={handleReset} className="secondary">
              Reset
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={phase !== "ready" || saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={handleVerify}
            disabled={phase !== "ready"}
            className="secondary"
          >
            Verify transform
          </button>
        </div>
        {saveStatus && (
          <p style={{ color: "var(--color-success)", marginTop: "0.5rem" }}>
            {saveStatus}
          </p>
        )}
        {verifyText && (
          <pre className="field-calibration-verify">{verifyText}</pre>
        )}
      </fieldset>
    </section>
  );
};

function errorCopyFor(
  reason: "colinear" | "too-close" | "self-intersecting",
): string {
  switch (reason) {
    case "too-close":
      return "Two corners are nearly the same point. Click the four distinct field corners.";
    case "colinear":
      return "The four corners fall on a line. Click corners that enclose the field.";
    case "self-intersecting":
      return "The click order crosses itself. Follow the order: blue origin → red origin → red far → blue far.";
  }
}

const FieldMapCalibrationPage = () => {
  return (
    <main>
      <div className="page-header">
        <h1>Field Map Calibration</h1>
        <p>
          Click the four field corners in the prescribed order to calibrate the
          image-to-field coordinate transform used by telemetry overlays.
        </p>
      </div>
      <RequireLogin>
        <CalibrationWorkArea />
      </RequireLogin>
    </main>
  );
};

export default FieldMapCalibrationPage;
