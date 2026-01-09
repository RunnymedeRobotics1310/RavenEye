import { getRoles, getUserid } from "~/common/storage/rbauth.ts";
import type { RBQuickComment } from "~/types/RBQuickComment.ts";
import { repository } from "~/common/storage/db.ts";

/**
 * Records a comment made by a user for a specific team.
 *
 * @param {number} team - The identifier of the team for which the comment is being recorded.
 * @param {string} comment - The content of the comment to be recorded.
 * @return {Promise<void>} Resolves when the comment has been successfully recorded.
 */
export async function recordComment(team: number, comment: string) {
  const userId = getUserid();
  const roles = getRoles();
  const role = roles.join(",");

  const qc: RBQuickComment = {
    id: 0,
    userId: userId,
    role: role,
    team: team,
    timestamp: new Date(),
    quickComment: comment,
  };
  await repository.putComment(qc);
}
