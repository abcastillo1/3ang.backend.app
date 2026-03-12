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
    .notEmpty()
    .withMessage('validators.code.required')
    .isLength({ min: 1, max: 30 })
    .withMessage('validators.code.invalid'),
  validateField('data.description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('validators.description.invalid'),
  validateField('data.isRequired')
    .optional()
    .isBoolean()
    .withMessage('validators.isRequired.invalid'),
  validateField('data.ref')
    .optional()
    .isLength({ max: 100 })
    .withMessage('validators.ref.invalid'),
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
  const { EngagementFileTemplateSection, EngagementFileTemplateItem } = modelsInstance.models;

  const section = await EngagementFileTemplateSection.findOne({
    where: { id: data.sectionId, organizationId: user.organizationId }
  });
  if (!section) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'permanentFile.sectionNotFound');
  }

  const existing = await EngagementFileTemplateItem.findOne({
    where: { templateSectionId: section.id, code: data.code }
  });
  if (existing) {
    throw throwError(HTTP_STATUS.BAD_REQUEST, 'permanentFile.itemCodeExists');
  }

  const maxOrder = await EngagementFileTemplateItem.max('sortOrder', {
    where: { templateSectionId: section.id }
  });

  const item = await EngagementFileTemplateItem.create({
    templateSectionId: section.id,
    code: data.code,
    description: data.description || null,
    isRequired: !!data.isRequired,
    ref: data.ref || null,
    sortOrder: data.sortOrder !== undefined ? data.sortOrder : (maxOrder ?? 0) + 1
  });

  return apiResponse(res, req, next)({ item });
}

const createRoute = {
  validators,
  default: handler,
  action: 'permanent-file-template-item-create',
  entity: 'organizations'
};

export default createRoute;
