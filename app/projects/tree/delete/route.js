import { Op } from 'sequelize';
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
  requirePermission('projects.tree.manage')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { AuditProject, AuditTreeNode, AuditDocument } = modelsInstance.models;
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
    throw throwError(HTTP_STATUS.BAD_REQUEST, 'projects.tree.cannotDeleteSystemNode');
  }

  const subtreeIds = [node.id];
  const descendants = await AuditTreeNode.findAll({
    where: {
      auditProjectId: project.id,
      path: { [Op.like]: `${node.path}%` },
      id: { [Op.ne]: node.id }
    },
    attributes: ['id']
  });
  descendants.forEach(d => subtreeIds.push(d.id));

  req.activityContext = {
    auditProjectId: project.id,
    nodeId: node.id,
    projectName: project.name,
    nodeName: node.name,
    deletedCount: subtreeIds.length
  };
  const transaction = await sequelize.transaction();
  try {
    await AuditDocument.update(
      { nodeId: null },
      { where: { nodeId: subtreeIds }, transaction }
    );

    await AuditTreeNode.destroy({
      where: { id: subtreeIds },
      transaction
    });

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }

  return apiResponse(res, req, next)({ deleted: subtreeIds.length });
}

const deleteRoute = {
  validators,
  default: handler,
  action: 'tree-delete',
  entity: 'projects',
  activityKey: 'projects.tree.delete'
};

export default deleteRoute;
