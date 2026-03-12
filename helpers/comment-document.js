/**
 * Validates that a comment belongs to the same project and (when nodeId is set)
 * to the checklist item whose tree_node_id matches nodeId — so confirm/link
 * cannot attach a file to a comment of another node.
 */
import { throwError } from './errors.js';
import { HTTP_STATUS } from '../config/constants.js';

export async function assertCommentAttachable({ commentId, nodeId, auditProjectId, models }) {
  if (!commentId) return null;
  const { ChecklistItemComment, ChecklistItem } = models;
  const comment = await ChecklistItemComment.findByPk(commentId, {
    include: [{ model: ChecklistItem, as: 'checklistItem', required: true }]
  });
  if (!comment || !comment.checklistItem) {
    throw throwError(HTTP_STATUS.BAD_REQUEST, 'files.commentNotFound');
  }
  if (comment.auditProjectId !== auditProjectId) {
    throw throwError(HTTP_STATUS.BAD_REQUEST, 'files.commentProjectMismatch');
  }
  if (nodeId != null && comment.checklistItem.treeNodeId !== nodeId) {
    throw throwError(HTTP_STATUS.BAD_REQUEST, 'files.commentNodeMismatch');
  }
  return comment;
}
