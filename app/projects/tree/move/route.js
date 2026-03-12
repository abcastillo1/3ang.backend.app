import { Op } from 'sequelize';
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
  validateField('data.nodeId')
    .notEmpty()
    .withMessage('validators.nodeId.required')
    .isInt({ min: 1 })
    .withMessage('validators.nodeId.invalid'),
  validateField('data.newParentId')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('validators.newParentId.invalid'),
  validateRequest,
  authenticate,
  requirePermission('projects.tree.manage')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { AuditProject, AuditTreeNode } = modelsInstance.models;
  const sequelize = modelsInstance.sequelize;

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

  if (node.isSystemNode) {
    throw throwError(HTTP_STATUS.BAD_REQUEST, 'projects.tree.cannotMoveSystemNode');
  }

  const newParentId = data.newParentId || null;
  let newParentPath = '';
  let newParentDepth = -1;

  if (newParentId) {
    if (newParentId === node.id) {
      throw throwError(HTTP_STATUS.BAD_REQUEST, 'projects.tree.cannotMoveToSelf');
    }

    const newParent = await AuditTreeNode.findOne({
      where: { id: newParentId, auditProjectId: project.id }
    });
    if (!newParent) {
      throw throwError(HTTP_STATUS.BAD_REQUEST, 'projects.tree.parentNotFound');
    }
    if (newParent.type === TYPE_CHECKLIST_ITEM_NODE) {
      throw throwError(HTTP_STATUS.BAD_REQUEST, 'projects.tree.cannotMoveUnderChecklistItem');
    }

    if (newParent.path.startsWith(node.path)) {
      throw throwError(HTTP_STATUS.BAD_REQUEST, 'projects.tree.cannotMoveToDescendant');
    }

    newParentPath = newParent.path;
    newParentDepth = newParent.depth;
  }

  const newDepth = newParentDepth + 1;
  const depthDiff = newDepth - node.depth;

  const descendants = await AuditTreeNode.findAll({
    where: {
      auditProjectId: project.id,
      path: { [Op.like]: `${node.path}%` },
      id: { [Op.ne]: node.id }
    }
  });

  const maxOrder = await AuditTreeNode.max('order', {
    where: { auditProjectId: project.id, parentId: newParentId }
  });

  const oldPath = node.path;
  const newPath = newParentId ? `${newParentPath}${node.id}/` : `/${node.id}/`;

  const transaction = await sequelize.transaction();
  try {
    await node.update({
      parentId: newParentId,
      path: newPath,
      depth: newDepth,
      order: (maxOrder || 0) + 1
    }, { transaction });

    for (const desc of descendants) {
      const updatedPath = desc.path.replace(oldPath, newPath);
      await desc.update({
        path: updatedPath,
        depth: desc.depth + depthDiff
      }, { transaction });
    }

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }

  req.activityContext = {
    auditProjectId: project.id,
    nodeId: node.id,
    projectName: project.name,
    nodeName: node.name,
    newParentId
  };
  const updated = await AuditTreeNode.findByPk(node.id);
  return apiResponse(res, req, next)({ node: updated });
}

const moveRoute = {
  validators,
  default: handler,
  action: 'tree-move',
  entity: 'projects',
  activityKey: 'projects.tree.move'
};

export default moveRoute;
