import { validateField } from '../../../../../helpers/validator.js';
import validateRequest from '../../../../../middleware/validation.js';
import authenticate from '../../../../../middleware/auth.js';
import { requirePermission } from '../../../../../middleware/permissions.js';
import apiResponse from '../../../../../helpers/response.js';
import { throwError } from '../../../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../../../config/constants.js';
import modelsInstance from '../../../../../models/index.js';
import { destroyTreeSubtree } from '../../../../../helpers/permanent-file-tree-sync.js';

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
  validateRequest,
  authenticate,
  requirePermission('projects.engagementFile.manage')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { AuditProject, EngagementFileSection, ChecklistItem } = modelsInstance.models;
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

  const itemCode = item.code;
  const transaction = await sequelize.transaction();
  try {
    // No desvincular documentos: conservan node_id (nodo soft-borrado) para trazabilidad.
    // Si se nullara node_id, la evidencia quedaría solo a nivel proyecto sin contexto de ítem.
    if (item.treeNodeId) {
      await destroyTreeSubtree(item.treeNodeId, transaction);
    }
    await item.destroy({ transaction });
    await transaction.commit();
  } catch (e) {
    await transaction.rollback();
    throw e;
  }

  req.activityContext = {
    itemId: data.itemId,
    auditProjectId: project.id,
    itemCode,
    projectName: project.name
  };
  return apiResponse(res, req, next)();
}

const deleteRoute = {
  validators,
  default: handler,
  action: 'permanent-file-item-delete',
  entity: 'projects',
  activityKey: 'projects.permanentFile.item.delete'
};

export default deleteRoute;
