import { validateField } from '../../../../../helpers/validator.js';
import validateRequest from '../../../../../middleware/validation.js';
import authenticate from '../../../../../middleware/auth.js';
import { requirePermission } from '../../../../../middleware/permissions.js';
import apiResponse from '../../../../../helpers/response.js';
import { throwError } from '../../../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../../../config/constants.js';
import modelsInstance from '../../../../../models/index.js';
import {
  findEngagementFileRoot,
  createTreeChild,
  sectionDisplayName,
  TYPE_SECTION_NODE
} from '../../../../../helpers/permanent-file-tree-sync.js';

const validators = [
  validateField('data.auditProjectId')
    .notEmpty()
    .withMessage('validators.auditProjectId.required')
    .isInt({ min: 1 })
    .withMessage('validators.auditProjectId.invalid'),
  validateField('data.code')
    .notEmpty()
    .withMessage('validators.code.required')
    .isLength({ min: 1, max: 20 })
    .withMessage('validators.code.invalid'),
  validateField('data.name')
    .notEmpty()
    .withMessage('validators.name.required')
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
  requirePermission('projects.engagementFile.manage')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { AuditProject, EngagementFileSection } = modelsInstance.models;
  const sequelize = modelsInstance.sequelize;

  const project = await AuditProject.findOne({
    where: { id: data.auditProjectId, organizationId: user.organizationId }
  });
  if (!project) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'projects.notFound');
  }

  const existing = await EngagementFileSection.findOne({
    where: { auditProjectId: project.id, code: data.code }
  });
  if (existing) {
    throw throwError(HTTP_STATUS.BAD_REQUEST, 'permanentFile.sectionCodeExists');
  }

  let parentSectionId = data.parentSectionId || null;
  let parentSection = null;
  if (parentSectionId) {
    parentSection = await EngagementFileSection.findOne({
      where: { id: parentSectionId, auditProjectId: project.id }
    });
    if (!parentSection) {
      throw throwError(HTTP_STATUS.BAD_REQUEST, 'permanentFile.parentSectionNotFound');
    }
  }

  const maxOrder = await EngagementFileSection.max('sortOrder', {
    where: { auditProjectId: project.id, parentSectionId }
  });

  const transaction = await sequelize.transaction();
  try {
    const section = await EngagementFileSection.create({
      auditProjectId: project.id,
      parentSectionId,
      code: data.code,
      name: data.name,
      description: data.description || null,
      priority: data.priority || null,
      sortOrder: data.sortOrder !== undefined ? data.sortOrder : (maxOrder ?? 0) + 1
    }, { transaction });

    let parentTreeNode = await findEngagementFileRoot(project.id, transaction);
    if (parentSection && parentSection.treeNodeId) {
      const n = await modelsInstance.models.AuditTreeNode.findByPk(parentSection.treeNodeId, { transaction });
      if (n) parentTreeNode = n;
    }

    if (parentTreeNode) {
      const sectionNode = await createTreeChild(
        project.id,
        parentTreeNode,
        TYPE_SECTION_NODE,
        sectionDisplayName(section),
        section.id,
        section.sortOrder,
        transaction
      );
      await section.update({ treeNodeId: sectionNode.id }, { transaction });
    }

    await transaction.commit();

    req.activityContext = {
      sectionId: section.id,
      auditProjectId: project.id,
      sectionName: section.name,
      projectName: project.name
    };
    await section.reload();
    return apiResponse(res, req, next)({ section });
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
}

const createRoute = {
  validators,
  default: handler,
  action: 'permanent-file-section-create',
  entity: 'projects',
  activityKey: 'projects.permanentFile.section.create'
};

export default createRoute;
