import { validateField } from '../../../../../helpers/validator.js';
import validateRequest from '../../../../../middleware/validation.js';
import authenticate from '../../../../../middleware/auth.js';
import { requirePermission } from '../../../../../middleware/permissions.js';
import apiResponse from '../../../../../helpers/response.js';
import { throwError } from '../../../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../../../config/constants.js';
import modelsInstance from '../../../../../models/index.js';

const validators = [
  validateField('data.auditProjectId')
    .notEmpty()
    .withMessage('validators.auditProjectId.required')
    .isInt({ min: 1 })
    .withMessage('validators.auditProjectId.invalid'),
  validateField('data.parentSectionId')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('validators.parentSectionId.invalid'),
  validateRequest,
  authenticate,
  requirePermission('projects.view')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { AuditProject, PermanentFileSection } = modelsInstance.models;

  const project = await AuditProject.findOne({
    where: { id: data.auditProjectId, organizationId: user.organizationId }
  });
  if (!project) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'projects.notFound');
  }

  const where = { auditProjectId: project.id };
  if (data.parentSectionId != null) {
    where.parentSectionId = data.parentSectionId;
  } else {
    where.parentSectionId = null;
  }

  const sections = await PermanentFileSection.findAll({
    where,
    order: [['sortOrder', 'ASC'], ['id', 'ASC']]
  });

  return apiResponse(res, req, next)({ sections });
}

const listRoute = {
  validators,
  default: handler,
  action: 'permanent-file-sections-list',
  entity: 'projects'
};

export default listRoute;
