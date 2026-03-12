import { validateField } from '../../../../../helpers/validator.js';
import validateRequest from '../../../../../middleware/validation.js';
import authenticate from '../../../../../middleware/auth.js';
import { requirePermission } from '../../../../../middleware/permissions.js';
import apiResponse from '../../../../../helpers/response.js';
import { throwError } from '../../../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../../../config/constants.js';
import modelsInstance from '../../../../../models/index.js';
import {
  createTreeChild,
  itemDisplayName,
  TYPE_CHECKLIST_ITEM_NODE
} from '../../../../../helpers/permanent-file-tree-sync.js';
import {
  syncItemAssignees,
  validateAssigneeUserIds
} from '../../../../../helpers/checklist-item-assignees.js';

const validators = [
  validateField('data.auditProjectId')
    .notEmpty()
    .withMessage('validators.auditProjectId.required')
    .isInt({ min: 1 })
    .withMessage('validators.auditProjectId.invalid'),
  validateField('data.sectionId')
    .notEmpty()
    .withMessage('validators.sectionId.required')
    .isInt({ min: 1 })
    .withMessage('validators.sectionId.invalid'),
  validateField('data.code')
    .notEmpty()
    .withMessage('validators.code.required')
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
    .isIn(['pending', 'in_review', 'compliant', 'not_applicable'])
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
  const { AuditProject, EngagementFileSection, ChecklistItem: ChecklistItemModel, User } = modelsInstance.models;
  const sequelize = modelsInstance.sequelize;

  const project = await AuditProject.findOne({
    where: { id: data.auditProjectId, organizationId: user.organizationId }
  });
  if (!project) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'projects.notFound');
  }

  const section = await EngagementFileSection.findOne({
    where: { id: data.sectionId, auditProjectId: project.id }
  });
  if (!section) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'permanentFile.sectionNotFound');
  }

  const existing = await ChecklistItemModel.findOne({
    where: { sectionId: section.id, code: data.code }
  });
  if (existing) {
    throw throwError(HTTP_STATUS.BAD_REQUEST, 'permanentFile.itemCodeExists');
  }

  let assigneeIds = Array.isArray(data.assignedUserIds) ? data.assignedUserIds : [];
  if (data.assignedUserId && !assigneeIds.includes(data.assignedUserId)) {
    assigneeIds = [data.assignedUserId, ...assigneeIds];
  }
  await validateAssigneeUserIds(assigneeIds, user.organizationId);

  const maxOrder = await ChecklistItemModel.max('sortOrder', {
    where: { sectionId: section.id }
  });

  const transaction = await sequelize.transaction();
  try {
    const item = await ChecklistItemModel.create({
      sectionId: section.id,
      createdByUserId: user.id,
      code: data.code,
      description: data.description || null,
      isRequired: Boolean(data.isRequired),
      ref: data.ref || null,
      status: data.status || 'pending',
      assignedUserId: assigneeIds.length ? assigneeIds[0] : null,
      sortOrder: data.sortOrder !== undefined ? data.sortOrder : (maxOrder ?? 0) + 1
    }, { transaction });

    if (assigneeIds.length) {
      await syncItemAssignees(item, assigneeIds, user.id, transaction);
    }

    if (section.treeNodeId) {
      const sectionNode = await modelsInstance.models.AuditTreeNode.findByPk(section.treeNodeId, { transaction });
      if (sectionNode) {
        const itemNode = await createTreeChild(
          project.id,
          sectionNode,
          TYPE_CHECKLIST_ITEM_NODE,
          itemDisplayName(item),
          item.id,
          item.sortOrder,
          transaction
        );
        await item.update({ treeNodeId: itemNode.id }, { transaction });
      }
    }

    await transaction.commit();

    req.activityContext = {
      itemId: item.id,
      auditProjectId: project.id,
      itemCode: item.code,
      sectionName: section.name,
      projectName: project.name
    };
    await item.reload({ include: [{ model: User, as: 'createdBy', attributes: ['id', 'fullName', 'email'] }] });
    const { loadAssigneesForItem } = await import('../../../../../helpers/checklist-item-assignees.js');
    const assignees = await loadAssigneesForItem(item.id, null);
    return apiResponse(res, req, next)({ item, assignees });
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
}

const createRoute = {
  validators,
  default: handler,
  action: 'permanent-file-item-create',
  entity: 'projects',
  activityKey: 'projects.permanentFile.item.create'
};

export default createRoute;
