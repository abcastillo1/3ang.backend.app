import { validateField } from '../../../helpers/validator.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import apiResponse from '../../../helpers/response.js';
import { throwError } from '../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../config/constants.js';
import modelsInstance from '../../../models/index.js';

export const validators = [
  validateField('data.id')
    .notEmpty()
    .withMessage('validators.id.required')
    .isInt({ min: 1 })
    .withMessage('validators.id.invalid'),
  validateRequest,
  authenticate,
  requirePermission('files.upload')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { AuditDocument } = modelsInstance.models;

  const document = await AuditDocument.findOne({
    where: { id: data.id, organizationId: user.organizationId }
  });

  if (!document) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'files.delete.notFound');
  }

  req.activityContext = {
    documentId: document.id,
    auditProjectId: document.auditProjectId || undefined,
    originalName: document.originalName
  };
  if (document.commentId) {
    const { ChecklistItemComment } = modelsInstance.models;
    const c = await ChecklistItemComment.findByPk(document.commentId, {
      attributes: ['id', 'attachmentCount']
    });
    if (c && c.attachmentCount > 0) {
      await c.update({ attachmentCount: c.attachmentCount - 1 });
    }
  }

  // Borrado lógico: solo marcamos deleted_at. Limpieza en storage puede ser job aparte.
  await document.destroy();

  return apiResponse(res, req, next)({ deleted: data.id });
}

const deleteRoute = {
  validators,
  default: handler,
  action: 'delete',
  entity: 'files',
  activityKey: 'files.delete'
};

export default deleteRoute;
