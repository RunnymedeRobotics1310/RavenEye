import type { RBRobotAlert } from "~/types/RBRobotAlert.ts";

export interface RBRobotAlertPostResult {
  alert: RBRobotAlert;
  success: boolean;
  reason: string;
}
