/**
 * One calibration record per FRC season year, mapping the bundled field image
 * to WPILib blue-origin field metres via a 4-corner homography.
 *
 * The `corners` tuple is indexed by click order, which fixes the field-corner
 * correspondence:
 *
 *   corners[0] ↔ field (0,   0)    "Blue origin"
 *   corners[1] ↔ field (L,   0)    "Red origin"
 *   corners[2] ↔ field (L,   W)    "Red far"
 *   corners[3] ↔ field (0,   W)    "Blue far"
 *
 * Each `{x, y}` is a normalized image coord in the range [0, 1], with `x=0`
 * at the left edge of the rendered image and `y=0` at the top.
 *
 * `updatedAt` / `updatedByUserId` are server-stamped; clients may send them
 * but the server ignores whatever the body supplies.
 */
export interface FieldCalibration {
  id?: number | null;
  year: number;
  fieldLengthM: number;
  fieldWidthM: number;
  robotLengthM: number;
  robotWidthM: number;
  corners: [
    { x: number; y: number },
    { x: number; y: number },
    { x: number; y: number },
    { x: number; y: number },
  ];
  updatedAt?: string | null;
  updatedByUserId?: number | null;
}
