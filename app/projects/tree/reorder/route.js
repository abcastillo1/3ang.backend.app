import { validateField } from '../../../../helpers/validator.js';
import validateRequest from '../../../../middleware/validation.js';
import authenticate from '../../../../middleware/auth.js';
import { requirePermission } from '../../../../middleware/permissions.js';
import apiResponse from '../../../../helpers/response.js';
import { throwError } from '../../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../../config/constants.js';
import modelsInstance from '../../../../models/index.js';

const validators = [
  validateField('data.auditProjectId')
    .notEmpty()
    .withMessage('validators.auditProjectId.required')
    .isInt({ min: 1 })
    .withMessage('validators.auditProjectId.invalid'),
  validateField('data.parentId')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('validators.parentId.invalid'),
  validateField('data.orderedIds')
    .notEmpty()
    .withMessage('validators.orderedIds.required')
    .isArray({ min: 1 })
    .withMessage('validators.orderedIds.invalid'),
  validateField('data.orderedIds.*')
    .isInt({ min: 1 })
    .withMessage('validators.orderedIds.invalid'),
  validateRequest,
  authenticate,
  requirePermission('projects.tree.manage')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { AuditProject, AuditTreeNode } = modelsInstance.models;
  const sequelize = modelsInstance.sequelize;

  const project = await AuditProject.findOne({
    where: { id: data.auditProjectId, organizationId: user.organizationId }
  });
  if (!project) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'projects.notFound');
  }

  const parentId = data.parentId || null;

  const siblings = await AuditTreeNode.findAll({
    where: { auditProjectId: project.id, parentId },
    attributes: ['id']
  });
  const siblingIds = siblings.map(s => s.id);

  const allMatch = data.orderedIds.every(id => siblingIds.includes(id))
    && data.orderedIds.length === siblingIds.length;

  if (!allMatch) {
    throw throwError(HTTP_STATUS.BAD_REQUEST, 'projects.tree.reorderIdsMismatch');
  }

  const transaction = await sequelize.transaction();
  try {
    for (let i = 0; i < data.orderedIds.length; i++) {
      await AuditTreeNode.update(
        { order: i + 1 },
        { where: { id: data.orderedIds[i] }, transaction }
      );
    }
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }

  const updated = await AuditTreeNode.findAll({
    where: { auditProjectId: project.id, parentId },
    order: [['sort_order', 'ASC']]
  });

  return apiResponse(res, req, next)({ nodes: updated });
}

const reorderRoute = {
  validators,
  default: handler,
  action: 'tree-reorder',
  entity: 'projects'
};

export default reorderRoute;
