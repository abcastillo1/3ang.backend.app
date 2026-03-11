import { validateField } from '../../../../../helpers/validator.js';
import validateRequest from '../../../../../middleware/validation.js';
import authenticate from '../../../../../middleware/auth.js';
import { requirePermission } from '../../../../../middleware/permissions.js';
import apiResponse from '../../../../../helpers/response.js';
import { throwError } from '../../../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../../../config/constants.js';
import modelsInstance from '../../../../../models/index.js';
import {
  findPermanentFileRoot,
  updateTreeNodeName,
  moveTreeNode,
  sectionDisplayName
} from '../../../../../helpers/permanent-file-tree-sync.js';

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
    .optional()
    .isLength({ min: 1, max: 20 })
    .withMessage('validators.code.invalid'),
  validateField('data.name')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('validators.name.invalid'),
  validateField('data.parentSectionId')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('validators.parentSectionId.invalid'),
  validateField('data.priority')
    .optional()
    .isLength({ max: 10 })
    .withMessage('validators.priority.invalid'),
  validateField('data.sortOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('validators.sortOrder.invalid'),
  validateField('data.description')
    .optional()
    .isString()
    .withMessage('validators.description.invalid'),
  validateRequest,
  authenticate,
  requirePermission('projects.permanentFile.manage')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { AuditProject, PermanentFileSection } = modelsInstance.models;
  const sequelize = modelsInstance.sequelize;

  const project = await AuditProject.findOne({
    where: { id: data.auditProjectId, organizationId: user.organizationId }
  });
  if (!project) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'projects.notFound');
  }

  const section = await PermanentFileSection.findOne({
    where: { id: data.sectionId, auditProjectId: project.id }
  });
  if (!section) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'permanentFile.sectionNotFound');
  }

  if (data.code !== undefined && data.code !== section.code) {
    const existing = await PermanentFileSection.findOne({
      where: { auditProjectId: project.id, code: data.code }
    });
    if (existing) {
      throw throwError(HTTP_STATUS.BAD_REQUEST, 'permanentFile.sectionCodeExists');
    }
  }

  if (data.parentSectionId !== undefined) {
    const newParentId = data.parentSectionId || null;
    if (newParentId === section.id) {
      throw throwError(HTTP_STATUS.BAD_REQUEST, 'permanentFile.sectionCannotBeParentOfItself');
    }
    if (newParentId) {
      const parent = await PermanentFileSection.findOne({
        where: { id: newParentId, auditProjectId: project.id }
      });
      if (!parent) {
        throw throwError(HTTP_STATUS.BAD_REQUEST, 'permanentFile.parentSectionNotFound');
      }
    }
  }

  const updateFields = {};
  const allowed = ['code', 'name', 'description', 'parentSectionId', 'priority', 'sortOrder'];
  for (const field of allowed) {
    if (data[field] !== undefined) updateFields[field] = data[field];
  }

  const transaction = await sequelize.transaction();
  try {
    await section.update(updateFields, { transaction });
    await section.reload({ transaction });

    if (section.treeNodeId) {
      if (data.name !== undefined || data.code !== undefined) {
        await updateTreeNodeName(section.treeNodeId, sectionDisplayName(section), transaction);
      }
      if (data.parentSectionId !== undefined) {
        const newParentSectionId = section.parentSectionId;
        let newParentTreeId = null;
        if (newParentSectionId) {
          const parentSec = await PermanentFileSection.findByPk(newParentSectionId, { transaction });
          if (parentSec && parentSec.treeNodeId) newParentTreeId = parentSec.treeNodeId;
        } else {
          const root = await findPermanentFileRoot(project.id, transaction);
          if (root) newParentTreeId = root.id;
        }
        if (newParentTreeId) {
          await moveTreeNode(section.treeNodeId, newParentTreeId, transaction);
        }
      }
    }

    await transaction.commit();
  } catch (e) {
    await transaction.rollback();
    throw e;
  }

  req.activityContext = {
    sectionId: section.id,
    auditProjectId: project.id,
    sectionName: section.name,
    projectName: project.name
  };
  await section.reload();
  return apiResponse(res, req, next)({ section });
}

const updateRoute = {
  validators,
  default: handler,
  action: 'permanent-file-section-update',
  entity: 'projects',
  activityKey: 'projects.permanentFile.section.update'
};

export default updateRoute;
