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
  validateRequest,
  authenticate,
  requirePermission('projects.view')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { AuditProject, ProjectAssignment, User } = modelsInstance.models;

  const project = await AuditProject.findOne({
    where: { id: data.auditProjectId, organizationId: user.organizationId }
  });
  if (!project) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'projects.notFound');
  }

  const assignments = await ProjectAssignment.findAll({
    where: { auditProjectId: data.auditProjectId },
    include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'email'] }],
    order: [['role', 'ASC'], ['createdAt', 'ASC']]
  });

  return apiResponse(res, req, next)({ assignments });
}

const listRoute = {
  validators,
  default: handler,
  action: 'assignments.list',
  entity: 'projects'
};

export default listRoute;
export { validators };
