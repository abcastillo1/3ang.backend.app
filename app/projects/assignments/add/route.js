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
  validateField('data.userId')
    .notEmpty()
    .withMessage('validators.userId.required')
    .isInt({ min: 1 })
    .withMessage('validators.userId.invalid'),
  validateField('data.role')
    .optional()
    .isIn(['partner', 'manager', 'member'])
    .withMessage('validators.role.invalid'),
  validateRequest,
  authenticate,
  requirePermission('projects.assignments.manage')
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

  const targetUser = await User.findOne({
    where: { id: data.userId, organizationId: user.organizationId, isActive: true }
  });
  if (!targetUser) {
    throw throwError(HTTP_STATUS.BAD_REQUEST, 'projects.assignments.userNotFound');
  }

  const existing = await ProjectAssignment.findOne({
    where: { auditProjectId: data.auditProjectId, userId: data.userId }
  });
  if (existing) {
    throw throwError(HTTP_STATUS.CONFLICT, 'projects.assignments.alreadyAssigned');
  }

  const assignment = await ProjectAssignment.create({
    auditProjectId: data.auditProjectId,
    userId: data.userId,
    role: data.role || 'member'
  });

  const result = await ProjectAssignment.findByPk(assignment.id, {
    include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'email'] }]
  });

  return apiResponse(res, req, next)({ assignment: result });
}

const addRoute = {
  validators,
  default: handler,
  action: 'assignments.add',
  entity: 'projects'
};

export default addRoute;
export { validators };
