/**
 * 2D perspective-transform math for field-map calibration.
 *
 * A homography is a 3×3 matrix that maps 2D points from one plane to another
 * under perspective. We store it row-major as a 9-element array:
 *
 *     [ h0 h1 h2 ]
 *     [ h3 h4 h5 ]
 *     [ h6 h7 h8 ]
 *
 * `h8` is normalized to 1, leaving 8 degrees of freedom — exactly what four
 * point correspondences can constrain.
 *
 * Everything in this module is pure: no React, no DOM, no external deps.
 *
 * ---------- Hand-traced sanity checks ----------
 *
 * Identity square → identity square:
 *   src = [(0,0),(1,0),(1,1),(0,1)]
 *   dst = [(0,0),(1,0),(1,1),(0,1)]
 *   → H ≈ [1,0,0, 0,1,0, 0,0,1], applyHomography(H, (0.5, 0.5)) = (0.5, 0.5)
 *
 * Unit-square field to normalized image:
 *   src = [(0,0),(1,0),(1,1),(0,1)] (field metres, 1×1)
 *   dst = [(0.1,0.1),(0.9,0.1),(0.9,0.9),(0.1,0.9)] (inset 10% on each side)
 *   → (0.5, 0.5) field maps to (0.5, 0.5) image by symmetry.
 *
 * Round-trip property:
 *   For a well-formed calibration, imageNormalizedToField ∘ fieldToImageNormalized
 *   is the identity to within ~1e-9.
 */

export type Point = { x: number; y: number };

/** Row-major 3×3 matrix. Length is always 9. h[8] is normalized to 1. */
export type Homography = number[];

/**
 * Compute the homography mapping each `src[i]` to the corresponding `dst[i]`.
 * Both arrays must have exactly 4 points.
 *
 * Throws `Error` if the linear system is singular (degenerate input). Callers
 * should gate on `isCalibrationWellFormed` first.
 */
export function computeHomography(src: Point[], dst: Point[]): Homography {
  if (src.length !== 4 || dst.length !== 4) {
    throw new Error("computeHomography requires exactly 4 source and 4 destination points");
  }

  // Build the 8×9 system. For each correspondence (x, y) → (u, v) we write two
  // rows of the linear system A * h = 0 (direct linear transform, DLT):
  //
  //   [ x  y  1  0  0  0  -u*x  -u*y  -u ] * h = 0
  //   [ 0  0  0  x  y  1  -v*x  -v*y  -v ] * h = 0
  //
  // We pin h8 = 1, so we move the last column to the RHS and solve an 8×8
  // linear system for h0..h7.
  const a: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i]!;
    const { x: u, y: v } = dst[i]!;
    a.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    a.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }

  const h = solveLinearSystem(a, b);
  return [h[0]!, h[1]!, h[2]!, h[3]!, h[4]!, h[5]!, h[6]!, h[7]!, 1];
}

/** Apply a homography to a point. */
export function applyHomography(h: Homography, p: Point): Point {
  const x = p.x;
  const y = p.y;
  const w = h[6]! * x + h[7]! * y + h[8]!;
  return {
    x: (h[0]! * x + h[1]! * y + h[2]!) / w,
    y: (h[3]! * x + h[4]! * y + h[5]!) / w,
  };
}

/**
 * Return a function mapping field metres → normalized image coords (0..1 each)
 * for the given calibration. The field-corner mapping is fixed by the click
 * order documented in the plan:
 *
 *   click 0 = (0,   0)    "Blue origin"
 *   click 1 = (L,   0)    "Red origin"
 *   click 2 = (L,   W)    "Red far"
 *   click 3 = (0,   W)    "Blue far"
 */
export function fieldToImageNormalized(cal: CalibrationLike): (p: Point) => Point {
  const src = fieldCorners(cal);
  const dst = imageCorners(cal);
  const h = computeHomography(src, dst);
  return (p) => applyHomography(h, p);
}

/** Inverse of {@link fieldToImageNormalized}. */
export function imageNormalizedToField(cal: CalibrationLike): (p: Point) => Point {
  const src = imageCorners(cal);
  const dst = fieldCorners(cal);
  const h = computeHomography(src, dst);
  return (p) => applyHomography(h, p);
}

export type CalibrationLike = {
  fieldLengthM: number;
  fieldWidthM: number;
  corners: [Point, Point, Point, Point];
};

export type WellFormedResult =
  | { ok: true }
  | { ok: false; reason: "colinear" | "too-close" | "self-intersecting" };

/**
 * Returns `{ ok: true }` if the four normalized image corners describe a
 * well-formed, non-degenerate, convex quadrilateral in click order.
 *
 * Rejection reasons:
 *   - `too-close`: two points are within `minEdgeNormalized` of each other.
 *   - `colinear`:  the points have no turn (cross products are zero).
 *   - `self-intersecting`: the click order traces a bowtie (edge sign flips).
 */
export function isCalibrationWellFormed(
  corners: Point[],
  minEdgeNormalized = 0.01,
): WellFormedResult {
  if (corners.length !== 4) return { ok: false, reason: "too-close" };

  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const dx = corners[j]!.x - corners[i]!.x;
      const dy = corners[j]!.y - corners[i]!.y;
      if (Math.hypot(dx, dy) < minEdgeNormalized) {
        return { ok: false, reason: "too-close" };
      }
    }
  }

  // Convexity: the cross product of each pair of consecutive edges must be
  // non-zero and all share the same sign. Zero → colinear; mixed signs → the
  // quad self-intersects (bowtie).
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = corners[i]!;
    const b = corners[(i + 1) % 4]!;
    const c = corners[(i + 2) % 4]!;
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) < 1e-9) return { ok: false, reason: "colinear" };
    const s = cross > 0 ? 1 : -1;
    if (sign === 0) sign = s;
    else if (s !== sign) return { ok: false, reason: "self-intersecting" };
  }
  return { ok: true };
}

// ---------- internals ----------

function fieldCorners(cal: CalibrationLike): Point[] {
  const L = cal.fieldLengthM;
  const W = cal.fieldWidthM;
  return [
    { x: 0, y: 0 },
    { x: L, y: 0 },
    { x: L, y: W },
    { x: 0, y: W },
  ];
}

function imageCorners(cal: CalibrationLike): Point[] {
  return cal.corners.map((c) => ({ x: c.x, y: c.y }));
}

/**
 * Solve `A * x = b` for a square `A` via Gaussian elimination with partial
 * pivoting. `A` is n×n and `b` is length n. Returns the length-n solution.
 * Throws if the system is singular (pivot magnitude below 1e-12).
 */
function solveLinearSystem(aIn: number[][], bIn: number[]): number[] {
  const n = aIn.length;
  // Copy to avoid mutating caller arrays.
  const a: number[][] = aIn.map((row) => row.slice());
  const b: number[] = bIn.slice();

  for (let k = 0; k < n; k++) {
    // Partial pivoting: find the row with the largest |a[i][k]| for i >= k.
    let maxRow = k;
    let maxVal = Math.abs(a[k]![k]!);
    for (let i = k + 1; i < n; i++) {
      const v = Math.abs(a[i]![k]!);
      if (v > maxVal) {
        maxVal = v;
        maxRow = i;
      }
    }
    if (maxVal < 1e-12) {
      throw new Error("solveLinearSystem: singular matrix");
    }
    if (maxRow !== k) {
      const tmp = a[k]!;
      a[k] = a[maxRow]!;
      a[maxRow] = tmp;
      const tb = b[k]!;
      b[k] = b[maxRow]!;
      b[maxRow] = tb;
    }

    // Eliminate below the pivot.
    for (let i = k + 1; i < n; i++) {
      const factor = a[i]![k]! / a[k]![k]!;
      for (let j = k; j < n; j++) {
        a[i]![j] = a[i]![j]! - factor * a[k]![j]!;
      }
      b[i] = b[i]! - factor * b[k]!;
    }
  }

  // Back-substitution.
  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = b[i]!;
    for (let j = i + 1; j < n; j++) {
      sum -= a[i]![j]! * x[j]!;
    }
    x[i] = sum / a[i]![i]!;
  }
  return x;
}
