import { validateField } from '../../../../../helpers/validator.js';
import validateRequest from '../../../../../middleware/validation.js';
import authenticate from '../../../../../middleware/auth.js';
import { requirePermission } from '../../../../../middleware/permissions.js';
import apiResponse from '../../../../../helpers/response.js';
import { throwError } from '../../../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../../../config/constants.js';
import modelsInstance from '../../../../../models/index.js';
import { updateTreeNodeName, itemDisplayName } from '../../../../../helpers/permanent-file-tree-sync.js';
import {
  syncItemAssignees,
  validateAssigneeUserIds,
  loadAssigneesForItem
} from '../../../../../helpers/checklist-item-assignees.js';

const STATUSES = ['pending', 'in_review', 'compliant', 'not_applicable'];

const validators = [
  validateField('data.auditProjectId')
    .notEmpty()
    .withMessage('validators.auditProjectId.required')
    .isInt({ min: 1 })
    .withMessage('validators.auditProjectId.invalid'),
  validateField('data.itemId')
    .notEmpty()
    .withMessage('validators.itemId.required')
    .isInt({ min: 1 })
    .withMessage('validators.itemId.invalid'),
  validateField('data.code')
    .optional()
    .isLength({ min: 1, max: 30 })
    .withMessage('validators.code.invalid'),
  validateField('data.description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('validators.description.invalid'),
  validateField('data.isRequired')
    .optional()
    .isBoolean()
    .withMessage('validators.isRequired.invalid'),
  validateField('data.ref')
    .optional()
    .isLength({ max: 100 })
    .withMessage('validators.ref.invalid'),
  validateField('data.status')
    .optional()
    .isIn(STATUSES)
    .withMessage('validators.status.invalid'),
  validateField('data.sortOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('validators.sortOrder.invalid'),
  validateField('data.assignedUserId')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('validators.assignedUserId.invalid'),
  validateField('data.assignedUserIds')
    .optional()
    .isArray()
    .withMessage('validators.assignedUserIds.invalid'),
  validateField('data.assignedUserIds.*')
    .optional()
    .isInt({ min: 1 })
    .withMessage('validators.assignedUserIds.invalid'),
  validateRequest,
  authenticate,
  requirePermission('projects.engagementFile.manage')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { AuditProject, EngagementFileSection, ChecklistItem, User } = modelsInstance.models;
  const sequelize = modelsInstance.sequelize;

  const project = await AuditProject.findOne({
    where: { id: data.auditProjectId, organizationId: user.organizationId }
  });
  if (!project) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'projects.notFound');
  }

  const item = await ChecklistItem.findOne({
    where: { id: data.itemId },
    include: [{ model: EngagementFileSection, as: 'section' }]
  });
  if (!item || !item.section || item.section.auditProjectId !== project.id) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'permanentFile.itemNotFound');
  }

  if (data.code !== undefined && data.code !== item.code) {
    const existing = await ChecklistItem.findOne({
      where: { sectionId: item.sectionId, code: data.code }
    });
    if (existing) {
      throw throwError(HTTP_STATUS.BAD_REQUEST, 'permanentFile.itemCodeExists');
    }
  }

  const updateFields = {};
  const allowed = ['code', 'description', 'isRequired', 'ref', 'status', 'sortOrder'];
  for (const field of allowed) {
    if (data[field] !== undefined) updateFields[field] = data[field];
  }
  if (data.status) {
    updateFields.lastReviewedAt = new Date();
  }

  let assigneeIds = null;
  if (Array.isArray(data.assignedUserIds)) {
    assigneeIds = [...new Set(data.assignedUserIds.filter(Boolean))];
    await validateAssigneeUserIds(assigneeIds, user.organizationId);
  } else if (data.assignedUserId !== undefined) {
    assigneeIds = data.assignedUserId ? [data.assignedUserId] : [];
    if (assigneeIds.length) await validateAssigneeUserIds(assigneeIds, user.organizationId);
  }

  const transaction = await sequelize.transaction();
  try {
    if (assigneeIds !== null) {
      await syncItemAssignees(item, assigneeIds, user.id, transaction);
    } else if (data.assignedUserId !== undefined) {
      updateFields.assignedUserId = data.assignedUserId || null;
    }

    if (Object.keys(updateFields).length) {
      await item.update(updateFields, { transaction });
    }
    await item.reload({ transaction });

    if (item.treeNodeId && (data.code !== undefined || data.description !== undefined)) {
      await updateTreeNodeName(item.treeNodeId, itemDisplayName(item), transaction);
    }

    await transaction.commit();
  } catch (e) {
    await transaction.rollback();
    throw e;
  }

  req.activityContext = {
    itemId: item.id,
    auditProjectId: project.id,
    itemCode: item.code,
    projectName: project.name,
    status: data.status
  };
  await item.reload({ include: [{ model: User, as: 'createdBy', attributes: ['id', 'fullName', 'email'] }] });
  const assignees = await loadAssigneesForItem(item.id, null);
  return apiResponse(res, req, next)({ item, assignees });
}

const updateRoute = {
  validators,
  default: handler,
  action: 'permanent-file-item-update',
  entity: 'projects',
  activityKey: 'projects.permanentFile.item.update'
};

export default updateRoute;
