/**
 * Serializa un comentario al contrato de API: author + mentionsUser, sin authorUserId/mentionUserIds.
 * @param {Object} comment - instancia o plain de ChecklistItemComment (con author incluido si aplica)
 * @param {Map<number, Object>} [mentionUsersMap] - mapa id -> { id, fullName, email }
 * @returns {Object}
 */
export function toCommentPayload(comment, mentionUsersMap = new Map()) {
  const json = comment.toJSON ? comment.toJSON() : comment;
  const raw = json.mentionUserIds || [];
  const mentionsUser = Array.isArray(raw) && raw[0] && typeof raw[0] === 'object'
    ? raw
    : raw.map(id => mentionUsersMap.get(id)).filter(Boolean);
  return {
    id: json.id,
    checklistItemId: json.checklistItemId,
    auditProjectId: json.auditProjectId,
    parentId: json.parentId,
    body: json.body,
    attachmentCount: json.attachmentCount ?? 0,
    createdAt: json.createdAt,
    updatedAt: json.updatedAt,
    author: json.author
      ? { id: json.author.id, fullName: json.author.fullName, email: json.author.email }
      : null,
    mentionsUser
  };
}
