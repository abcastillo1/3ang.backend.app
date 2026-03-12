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
  validateField('data.sectionId')
    .notEmpty()
    .withMessage('validators.sectionId.required')
    .isInt({ min: 1 })
    .withMessage('validators.sectionId.invalid'),
  validateRequest,
  authenticate,
  requirePermission('projects.view')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { AuditProject, EngagementFileSection, ChecklistItem } = modelsInstance.models;

  const project = await AuditProject.findOne({
    where: { id: data.auditProjectId, organizationId: user.organizationId }
  });
  if (!project) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'projects.notFound');
  }

  const section = await EngagementFileSection.findOne({
    where: { id: data.sectionId, auditProjectId: project.id },
    include: [{ model: ChecklistItem, as: 'items', required: false }]
  });
  if (!section) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'permanentFile.sectionNotFound');
  }
  if (section.items && section.items.length) {
    section.items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  return apiResponse(res, req, next)({ section });
}

const viewRoute = {
  validators,
  default: handler,
  action: 'permanent-file-section-view',
  entity: 'projects'
};

export default viewRoute;
