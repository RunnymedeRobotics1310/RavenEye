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
}
