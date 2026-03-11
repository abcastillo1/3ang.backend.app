import { validateField } from '../../../helpers/validator.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import apiResponse from '../../../helpers/response.js';
import { throwError } from '../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../config/constants.js';
import modelsInstance from '../../../models/index.js';

export const validators = [
  validateField('data.documentIds')
    .isArray({ min: 1 })
    .withMessage('validators.documentIds.required'),
  validateField('data.documentIds.*')
    .isInt({ min: 1 })
    .withMessage('validators.documentIds.invalid'),
  validateField('data.auditProjectId')
    .notEmpty()
    .withMessage('validators.auditProjectId.required')
    .isInt({ min: 1 })
    .withMessage('validators.auditProjectId.invalid'),
  validateField('data.nodeId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('validators.nodeId.invalid'),
  validateRequest,
  authenticate,
  requirePermission('files.upload')
];

/**
 * Links one or more existing audit_documents (uploaded without project)
 * to an audit project (and optionally a tree node).
 * Only documents belonging to the same organization and currently unlinked
 * (auditProjectId IS NULL) can be linked.
 */
async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;

  const { AuditDocument, AuditProject } = modelsInstance.models;

  const project = await AuditProject.findOne({
    where: { id: data.auditProjectId, organizationId: user.organizationId }
  });
  if (!project) {
    throw throwError(HTTP_STATUS.BAD_REQUEST, 'files.link.projectNotFound');
  }

  const documents = await AuditDocument.findAll({
    where: {
      id: data.documentIds,
      organizationId: user.organizationId,
      auditProjectId: null
    }
  });

  if (documents.length === 0) {
    throw throwError(HTTP_STATUS.BAD_REQUEST, 'files.link.noDocumentsFound');
  }

  const updatePayload = { auditProjectId: data.auditProjectId };
  if (data.nodeId) {
    updatePayload.nodeId = data.nodeId;
  }

  const linkedIds = documents.map(d => d.id);

  await AuditDocument.update(updatePayload, {
    where: { id: linkedIds }
  });

  req.activityContext = {
    auditProjectId: data.auditProjectId,
    projectName: project.name,
    documentIds: linkedIds,
    count: linkedIds.length,
    nodeId: data.nodeId
  };
  return apiResponse(res, req, next)({
    linked: linkedIds,
    auditProjectId: data.auditProjectId,
    count: linkedIds.length
  });
}

const linkRoute = {
  validators,
  default: handler,
  action: 'link',
  entity: 'files',
  activityKey: 'files.link'
};

export default linkRoute;
