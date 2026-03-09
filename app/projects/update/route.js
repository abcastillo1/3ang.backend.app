import { validateField } from '../../../helpers/validator.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import apiResponse from '../../../helpers/response.js';
import { throwError } from '../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../config/constants.js';
import modelsInstance from '../../../models/index.js';

const VALID_TRANSITIONS = {
  draft: ['planning'],
  planning: ['in_progress'],
  in_progress: ['review'],
  review: ['closed'],
  closed: []
};

export const validators = [
  validateField('data.id')
    .notEmpty()
    .withMessage('validators.id.required')
    .isInt({ min: 1 })
    .withMessage('validators.id.invalid'),
  validateField('data.name')
    .optional()
    .isLength({ min: 2, max: 255 })
    .withMessage('validators.name.invalid'),
  validateField('data.auditType')
    .optional()
    .isString()
    .withMessage('validators.auditType.invalid'),
  validateField('data.periodStart')
    .optional()
    .isDate()
    .withMessage('validators.periodStart.invalid'),
  validateField('data.periodEnd')
    .optional()
    .isDate()
    .withMessage('validators.periodEnd.invalid'),
  validateField('data.status')
    .optional()
    .isIn(['draft', 'planning', 'in_progress', 'review', 'closed'])
    .withMessage('validators.status.invalid'),
  validateRequest,
  authenticate,
  requirePermission('projects.update')
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

  if (data.status && data.status !== project.status) {
    const allowed = VALID_TRANSITIONS[project.status] || [];
    if (!allowed.includes(data.status)) {
      throw throwError(HTTP_STATUS.BAD_REQUEST, 'projects.invalidStatusTransition');
    }
  }

  const updateFields = {};
  const allowedFields = ['name', 'auditType', 'periodStart', 'periodEnd', 'status'];
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updateFields[field] = data[field];
    }
  }

  await project.update(updateFields);

  return apiResponse(res, req, next)({ project });
}

const updateRoute = {
  validators,
  default: handler,
  action: 'update',
  entity: 'projects'
};

export default updateRoute;
export { validators };
