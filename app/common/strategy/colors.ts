import type { RobotSlot } from "~/types/StrategyStroke.ts";

/**
 * Per-robot palette keyed to FRC alliance conventions: R1/R2/R3 are three
 * shades of **red** and B1/B2/B3 are three shades of **blue**, so at a glance
 * any stroke belongs obviously to its alliance. Within each alliance the
 * three shades vary in luminance (light / medium / dark), which keeps them
 * distinguishable for viewers with red-green colour vision deficiency since
 * brightness is perceived independently of hue.
 */
export const ROBOT_COLORS: readonly string[] = [
  "#FF5252", // R1 — bright red
  "#F06292", // R2 — bright pink
  "#7F0000", // R3 — dark red / maroon
  "#80DEEA", // B1 — bright cyan
  "#1976D2", // B2 — standard blue
  "#0D47A1", // B3 — dark navy
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
