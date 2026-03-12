import { validateField } from '../../../../../helpers/validator.js';
import validateRequest from '../../../../../middleware/validation.js';
import authenticate from '../../../../../middleware/auth.js';
import { requirePermission } from '../../../../../middleware/permissions.js';
import apiResponse from '../../../../../helpers/response.js';
import { throwError } from '../../../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../../../config/constants.js';
import modelsInstance from '../../../../../models/index.js';

const validators = [
  validateField('data.sectionId')
    .notEmpty()
    .withMessage('validators.sectionId.required')
    .isInt({ min: 1 })
    .withMessage('validators.sectionId.invalid'),
  validateField('data.code')
    .optional()
    .isLength({ min: 1, max: 20 })
    .withMessage('validators.code.invalid'),
  validateField('data.name')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('validators.name.invalid'),
  validateField('data.parentSectionId')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('validators.parentSectionId.invalid'),
  validateField('data.priority')
    .optional()
    .isLength({ max: 10 })
    .withMessage('validators.priority.invalid'),
  validateField('data.sortOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('validators.sortOrder.invalid'),
  validateRequest,
  authenticate,
  requirePermission('organizations.permanentFileTemplate.manage')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { EngagementFileTemplateSection } = modelsInstance.models;

  const section = await EngagementFileTemplateSection.findOne({
    where: { id: data.sectionId, organizationId: user.organizationId }
  });
  if (!section) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'permanentFile.sectionNotFound');
  }

  if (data.code !== undefined && data.code !== section.code) {
    const existing = await EngagementFileTemplateSection.findOne({
      where: { organizationId: user.organizationId, code: data.code }
    });
    if (existing) {
      throw throwError(HTTP_STATUS.BAD_REQUEST, 'permanentFile.sectionCodeExists');
    }
  }

  if (data.parentSectionId !== undefined) {
    const newParentId = data.parentSectionId || null;
    if (newParentId === section.id) {
      throw throwError(HTTP_STATUS.BAD_REQUEST, 'permanentFile.sectionCannotBeParentOfItself');
    }
    if (newParentId) {
      const parent = await EngagementFileTemplateSection.findOne({
        where: { id: newParentId, organizationId: user.organizationId }
      });
      if (!parent) {
        throw throwError(HTTP_STATUS.BAD_REQUEST, 'permanentFile.parentSectionNotFound');
      }
    }
  }

  const updateFields = {};
  ['code', 'name', 'parentSectionId', 'priority', 'sortOrder'].forEach(field => {
    if (data[field] !== undefined) updateFields[field] = data[field];
  });
  await section.update(updateFields);

  return apiResponse(res, req, next)({ section });
}

const updateRoute = {
  validators,
  default: handler,
  action: 'permanent-file-template-section-update',
  entity: 'organizations'
};

export default updateRoute;
