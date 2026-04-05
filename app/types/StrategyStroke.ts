export type RobotSlot = "R1" | "R2" | "R3" | "B1" | "B2" | "B3";

export interface StrategyPoint {
  x: number; // normalized 0..1 against canvas bounds
  y: number; // normalized 0..1 against canvas bounds
  t: number; // ms since pointerdown of this stroke
}

export interface StrategyStroke {
  robotSlot: RobotSlot;
  colorIndex: number;
  points: StrategyPoint[];
  /**
   * When true, the stroke renders with an arrowhead at its tip (direction of
   * travel). When false, it renders as a plain line. Absent on strokes stored
   * before this field existed — treat missing as `true` for backward
   * compatibility.
   */
  arrow?: boolean;
}
