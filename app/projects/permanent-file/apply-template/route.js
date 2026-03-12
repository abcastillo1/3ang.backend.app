import { validateField } from '../../../../helpers/validator.js';
import validateRequest from '../../../../middleware/validation.js';
import authenticate from '../../../../middleware/auth.js';
import { requirePermission } from '../../../../middleware/permissions.js';
import apiResponse from '../../../../helpers/response.js';
import { throwError } from '../../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../../config/constants.js';
import modelsInstance from '../../../../models/index.js';
import { applyTemplateToProject } from '../../../../helpers/permanent-file-template.js';

const validators = [
  validateField('data.auditProjectId')
    .notEmpty()
    .withMessage('validators.auditProjectId.required')
    .isInt({ min: 1 })
    .withMessage('validators.auditProjectId.invalid'),
  validateRequest,
  authenticate,
  requirePermission('projects.engagementFile.manage')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { AuditProject, EngagementFileTemplateSection } = modelsInstance.models;

  const project = await AuditProject.findOne({
    where: { id: data.auditProjectId, organizationId: user.organizationId }
  });
  if (!project) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'projects.notFound');
  }

  const templateCount = await EngagementFileTemplateSection.count({
    where: { organizationId: user.organizationId }
  });
  if (templateCount === 0) {
    throw throwError(HTTP_STATUS.BAD_REQUEST, 'permanentFile.templateEmpty');
  }

  const result = await applyTemplateToProject(project.id, user.organizationId);
  return apiResponse(res, req, next)({ ...result, message: 'permanentFile.templateApplied' });
}

const applyTemplateRoute = {
  validators,
  default: handler,
  action: 'permanent-file-apply-template',
  entity: 'projects'
};

export default applyTemplateRoute;
