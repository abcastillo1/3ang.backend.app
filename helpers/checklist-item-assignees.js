/**
 * Sincroniza asignados N:N de un checklist item (solo borrado lógico).
 */
export async function syncItemAssignees(item, userIds, assignedByUserId, transaction) {
  const models = (await import('../models/index.js')).default.models;
  const { ChecklistItemAssignee } = models;
  const uniqueIds = [...new Set((userIds || []).filter(Boolean))];
  const wantSet = new Set(uniqueIds);

  const existingRows = await ChecklistItemAssignee.findAll({
    where: { checklistItemId: item.id },
    paranoid: false,
    transaction
  });

  for (const row of existingRows) {
    if (!wantSet.has(row.userId) && !row.deletedAt) {
      await row.destroy({ transaction });
    }
  }

  for (const uid of uniqueIds) {
    const row = existingRows.find(r => r.userId === uid);
    if (row) {
      if (row.deletedAt) {
        await row.restore({ transaction });
      }
      await row.update({ assignedByUserId: assignedByUserId || null }, { transaction });
    } else {
      await ChecklistItemAssignee.create(
        {
          checklistItemId: item.id,
          userId: uid,
          assignedByUserId: assignedByUserId || null
        },
        { transaction }
      );
    }
  }

  await item.update(
    { assignedUserId: uniqueIds.length ? uniqueIds[0] : null },
    { transaction }
  );
}

export async function validateAssigneeUserIds(userIds, organizationId) {
  const models = (await import('../models/index.js')).default.models;
  const { User } = models;
  const uniqueIds = [...new Set((userIds || []).filter(Boolean))];
  if (uniqueIds.length === 0) return;
  const count = await User.count({
    where: { id: uniqueIds, organizationId }
  });
  if (count !== uniqueIds.length) {
    const { throwError } = await import('./errors.js');
    const { HTTP_STATUS } = await import('../config/constants.js');
    throw throwError(HTTP_STATUS.BAD_REQUEST, 'permanentFile.assigneeNotFound');
  }
}

export async function loadAssigneesForItems(itemIds, transaction) {
  if (!itemIds || !itemIds.length) return new Map();
  const models = (await import('../models/index.js')).default.models;
  const { ChecklistItemAssignee, User } = models;
  const rows = await ChecklistItemAssignee.findAll({
    where: { checklistItemId: itemIds },
    include: [
      { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] },
      { model: User, as: 'assignedBy', attributes: ['id', 'fullName', 'email'], required: false }
    ],
    order: [['checklistItemId', 'ASC'], ['id', 'ASC']],
    transaction
  });
  const map = new Map();
  for (const id of itemIds) map.set(id, []);
  for (const r of rows) {
    const list = map.get(r.checklistItemId) || [];
    list.push({
      userId: r.userId,
      user: r.user ? { id: r.user.id, name: r.user.fullName, email: r.user.email } : null,
      assignedByUserId: r.assignedByUserId,
      assignedBy: r.assignedBy
        ? { id: r.assignedBy.id, name: r.assignedBy.fullName, email: r.assignedBy.email }
        : null,
      assignedAt: r.createdAt
    });
    map.set(r.checklistItemId, list);
  }
  return map;
}

export async function loadAssigneesForItem(itemId, transaction) {
  const models = (await import('../models/index.js')).default.models;
  const { ChecklistItemAssignee, User } = models;
  const rows = await ChecklistItemAssignee.findAll({
    where: { checklistItemId: itemId },
    include: [
      { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] },
      { model: User, as: 'assignedBy', attributes: ['id', 'fullName', 'email'], required: false }
    ],
    order: [['id', 'ASC']],
    transaction
  });
  return rows.map(r => ({
    userId: r.userId,
    user: r.user ? { id: r.user.id, name: r.user.fullName, email: r.user.email } : null,
    assignedByUserId: r.assignedByUserId,
    assignedBy: r.assignedBy
      ? { id: r.assignedBy.id, name: r.assignedBy.fullName, email: r.assignedBy.email }
      : null,
    assignedAt: r.createdAt
  }));
}
