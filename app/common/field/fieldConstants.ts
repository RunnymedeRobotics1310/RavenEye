/**
 * Per-year FRC field playing-surface dimensions in metres.
 *
 * These are user-overridable defaults: the calibration page pre-fills the
 * form from this table but accepts any value the user types. Add a new year
 * by dropping an entry in here — no other code changes required.
 *
 * Source: 2026 REBUILT Game Manual §5.2 — 651.2 in × 317.7 in ≈ 16.54 × 8.07 m.
 */
export const FIELD_DIMENSIONS_BY_YEAR: Record<
  number,
  { lengthM: number; widthM: number }
> = {
  2026: { lengthM: 16.54, widthM: 8.07 },
};

/**
 * Default robot footprint in metres. Most FRC robots fit inside the 30" × 30"
 * frame-perimeter limit; 0.84 m ≈ 33" accounts for bumpers. The calibration
 * page pre-fills these but the user can override per-season.
 */
export const DEFAULT_ROBOT_DIMENSIONS_M = {
  lengthM: 0.84,
  widthM: 0.84,
};
