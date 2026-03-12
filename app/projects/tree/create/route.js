import { validateField } from '../../../../helpers/validator.js';
import validateRequest from '../../../../middleware/validation.js';
import authenticate from '../../../../middleware/auth.js';
import { requirePermission } from '../../../../middleware/permissions.js';
import apiResponse from '../../../../helpers/response.js';
import { throwError } from '../../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../../config/constants.js';
import modelsInstance from '../../../../models/index.js';
import { TYPE_CHECKLIST_ITEM_NODE } from '../../../../helpers/engagement-file-tree-sync.js';

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
  validateField('data.type')
    .notEmpty()
    .withMessage('validators.type.required')
    .isString()
    .withMessage('validators.type.invalid'),
  validateField('data.name')
    .notEmpty()
    .withMessage('validators.name.required')
    .isLength({ min: 1, max: 255 })
    .withMessage('validators.name.invalid'),
  validateRequest,
  authenticate,
  requirePermission('projects.tree.manage')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { AuditProject, AuditTreeNode } = modelsInstance.models;

  const project = await AuditProject.findOne({
    where: { id: data.auditProjectId, organizationId: user.organizationId }
  });
  if (!project) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'projects.notFound');
  }

  let parentPath = '';
  let parentDepth = -1;

  if (data.parentId) {
    const parent = await AuditTreeNode.findOne({
      where: { id: data.parentId, auditProjectId: project.id }
    });
    if (!parent) {
      throw throwError(HTTP_STATUS.BAD_REQUEST, 'projects.tree.parentNotFound');
    }
    if (parent.type === TYPE_CHECKLIST_ITEM_NODE) {
      throw throwError(HTTP_STATUS.BAD_REQUEST, 'projects.tree.cannotCreateUnderChecklistItem');
    }
    parentPath = parent.path;
    parentDepth = parent.depth;
  }

  const newDepth = parentDepth + 1;

  const maxOrder = await AuditTreeNode.max('order', {
    where: { auditProjectId: project.id, parentId: data.parentId || null }
  });

  const node = await AuditTreeNode.create({
    auditProjectId: project.id,
    parentId: data.parentId || null,
    path: '/',
    depth: newDepth,
    type: data.type,
    name: data.name,
    order: (maxOrder || 0) + 1
  });

  const materializedPath = data.parentId
    ? `${parentPath}${node.id}/`
    : `/${node.id}/`;

  await node.update({ path: materializedPath });

  req.activityContext = {
    auditProjectId: project.id,
    nodeId: node.id,
    projectName: project.name,
    nodeName: data.name,
    nodeType: data.type,
    parentId: data.parentId
  };
  return apiResponse(res, req, next)({ node });
}

const createRoute = {
  validators,
  default: handler,
  action: 'tree-create',
  entity: 'projects',
  activityKey: 'projects.tree.create'
};

export default createRoute;
