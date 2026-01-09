import type { RBQuickComment } from "~/types/RBQuickComment.ts";

export interface RBQuickCommentPostResult {
  comment: RBQuickComment;
  success: boolean;
  reason: string;
}
