import { validateField } from '../../../../../helpers/validator.js';
import validateRequest from '../../../../../middleware/validation.js';
import authenticate from '../../../../../middleware/auth.js';
import { requirePermission } from '../../../../../middleware/permissions.js';
import apiResponse from '../../../../../helpers/response.js';
import { throwError } from '../../../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../../../config/constants.js';
import modelsInstance from '../../../../../models/index.js';

/**
 * Lista todos los documentos anclados al nodo del ítem (mismo node_id).
 * Un checklist puede tener N documentos: cada confirm con nodeId = item.treeNodeId suma uno.
 * Todos los documentos del ítem comparten node_id = item.treeNodeId (N archivos por ítem).
 */
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
  requirePermission('projects.view')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { AuditProject, EngagementFileSection, ChecklistItem, AuditDocument } = modelsInstance.models;

  const project = await AuditProject.findOne({
    where: { id: data.auditProjectId, organizationId: user.organizationId }
  });
  if (!project) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'projects.notFound');
  }

  const item = await ChecklistItem.findOne({
    where: { id: data.itemId },
    include: [{ model: EngagementFileSection, as: 'section', required: true }]
  });
  if (!item || !item.section || item.section.auditProjectId !== project.id) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'permanentFile.itemNotFound');
  }

  if (!item.treeNodeId) {
    return apiResponse(res, req, next)({ documents: [] });
  }

  const documents = await AuditDocument.findAll({
    where: { auditProjectId: project.id, nodeId: item.treeNodeId },
    attributes: ['id', 'originalName', 'mimeType', 'size', 'nodeId', 'createdAt', 'uploaderId'],
    order: [['createdAt', 'DESC']]
  });

  return apiResponse(res, req, next)({ documents });
}

const documentsListRoute = {
  validators,
  default: handler,
  action: 'permanent-file-item-documents-list',
  entity: 'projects'
};

export default documentsListRoute;
