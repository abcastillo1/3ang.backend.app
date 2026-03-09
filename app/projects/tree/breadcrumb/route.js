import { validateField } from '../../../../helpers/validator.js';
import validateRequest from '../../../../middleware/validation.js';
import authenticate from '../../../../middleware/auth.js';
import { requirePermission } from '../../../../middleware/permissions.js';
import apiResponse from '../../../../helpers/response.js';
import { throwError } from '../../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../../config/constants.js';
import modelsInstance from '../../../../models/index.js';

const validators = [
  validateField('data.nodeId')
    .notEmpty()
    .withMessage('validators.nodeId.required')
    .isInt({ min: 1 })
    .withMessage('validators.nodeId.invalid'),
  validateRequest,
  authenticate,
  requirePermission('projects.view')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { AuditProject, AuditTreeNode } = modelsInstance.models;

  const node = await AuditTreeNode.findByPk(data.nodeId);
  if (!node) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'projects.tree.nodeNotFound');
  }

  const project = await AuditProject.findOne({
    where: { id: node.auditProjectId, organizationId: user.organizationId }
  });
  if (!project) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'projects.notFound');
  }

  const ancestorIds = node.path
    .split('/')
    .filter(Boolean)
    .map(Number);

  let breadcrumb = [];
  if (ancestorIds.length > 0) {
    const ancestors = await AuditTreeNode.findAll({
      where: { id: ancestorIds, auditProjectId: project.id },
      attributes: ['id', 'name', 'type', 'depth', 'parentId'],
      order: [['depth', 'ASC']]
    });
    breadcrumb = ancestors;
  }

  return apiResponse(res, req, next)({ breadcrumb });
}

const breadcrumbRoute = {
  validators,
  default: handler,
  action: 'tree-breadcrumb',
  entity: 'projects'
};

export default breadcrumbRoute;
