import { validateField } from '../../../helpers/validator.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import apiResponse from '../../../helpers/response.js';
import { throwError } from '../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../config/constants.js';
import modelsInstance from '../../../models/index.js';

const validators = [
  validateField('data.id')
    .notEmpty()
    .withMessage('validators.id.required')
    .isInt({ min: 1 })
    .withMessage('validators.id.invalid'),
  validateRequest,
  authenticate,
  requirePermission('projects.delete')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { AuditProject } = modelsInstance.models;

  const project = await AuditProject.findOne({
    where: { id: data.id, organizationId: user.organizationId }
  });

  if (!project) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'projects.notFound');
  }

  if (project.status !== 'draft') {
    throw throwError(HTTP_STATUS.BAD_REQUEST, 'projects.canOnlyDeleteDraft');
  }

  req.activityContext = { projectId: project.id, projectName: project.name };
  await project.softDelete();

  return apiResponse(res, req, next)();
}

const deleteRoute = {
  validators,
  default: handler,
  action: 'delete',
  entity: 'projects',
  activityKey: 'projects.delete'
};

export default deleteRoute;
export { validators };
