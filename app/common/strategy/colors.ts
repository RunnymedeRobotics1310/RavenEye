import type { RobotSlot } from "~/types/StrategyStroke.ts";

/**
 * Okabe-Ito-inspired colorblind-friendly palette, one color per robot slot.
 * Red-alliance slots (R1/R2/R3) use warm hues; blue-alliance slots (B1/B2/B3)
 * use cool hues. All six are distinguishable under common forms of color
 * vision deficiency.
 */
export const ROBOT_COLORS: readonly string[] = [
  "#E69F00", // R1 — orange
  "#D55E00", // R2 — vermillion
  "#CC79A7", // R3 — reddish purple
  "#0072B2", // B1 — blue
  "#56B4E9", // B2 — sky blue
  "#009E73", // B3 — bluish green
] as const;

export const ROBOT_SLOTS: readonly RobotSlot[] = [
  "R1",
  "R2",
  "R3",
  "B1",
  "B2",
  "B3",
] as const;

export function colorIndexForSlot(slot: RobotSlot): number {
  return ROBOT_SLOTS.indexOf(slot);
}

export function colorForSlot(slot: RobotSlot): string {
  return ROBOT_COLORS[colorIndexForSlot(slot)]!;
}
