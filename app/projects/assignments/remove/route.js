import { validateField } from '../../../../helpers/validator.js';
import validateRequest from '../../../../middleware/validation.js';
import authenticate from '../../../../middleware/auth.js';
import { requirePermission } from '../../../../middleware/permissions.js';
import apiResponse from '../../../../helpers/response.js';
import { throwError } from '../../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../../config/constants.js';
import modelsInstance from '../../../../models/index.js';

export const validators = [
  validateField('data.auditProjectId')
    .notEmpty()
    .withMessage('validators.auditProjectId.required')
    .isInt({ min: 1 })
    .withMessage('validators.auditProjectId.invalid'),
  validateField('data.userId')
    .notEmpty()
    .withMessage('validators.userId.required')
    .isInt({ min: 1 })
    .withMessage('validators.userId.invalid'),
  validateRequest,
  authenticate,
  requirePermission('projects.assignments.manage')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { AuditProject, ProjectAssignment } = modelsInstance.models;

  const project = await AuditProject.findOne({
    where: { id: data.auditProjectId, organizationId: user.organizationId }
  });
  if (!project) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'projects.notFound');
  }

  const assignment = await ProjectAssignment.findOne({
    where: { auditProjectId: data.auditProjectId, userId: data.userId }
  });
  if (!assignment) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'projects.assignments.notFound');
  }

  await assignment.destroy();

  return apiResponse(res, req, next)();
}

const removeRoute = {
  validators,
  default: handler,
  action: 'assignments.remove',
  entity: 'projects'
};

export default removeRoute;
export { validators };
