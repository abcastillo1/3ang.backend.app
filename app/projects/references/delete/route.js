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
  validateField('data.id')
    .notEmpty()
    .withMessage('validators.id.required')
    .isInt({ min: 1 })
    .withMessage('validators.id.invalid'),
  validateRequest,
  authenticate,
  requirePermission('projects.references.manage')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { AuditProject, AuditCrossReference } = modelsInstance.models;

  const project = await AuditProject.findOne({
    where: { id: data.auditProjectId, organizationId: user.organizationId }
  });
  if (!project) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'projects.notFound');
  }

  const ref = await AuditCrossReference.findOne({
    where: {
      id: data.id,
      auditProjectId: project.id,
      organizationId: user.organizationId
    }
  });
  if (!ref) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'references.notFound');
  }

  const referenceId = ref.id;
  await ref.destroy();

  req.activityContext = {
    auditProjectId: project.id,
    projectName: project.name,
    referenceId
  };

  return apiResponse(res, req, next)({ deleted: referenceId });
}

const deleteRoute = {
  validators,
  default: handler,
  action: 'references.delete',
  entity: 'projects',
  activityKey: 'projects.references.delete'
};

export default deleteRoute;
