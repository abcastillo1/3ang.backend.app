import { validateField } from '../../../../../helpers/validator.js';
import validateRequest from '../../../../../middleware/validation.js';
import authenticate from '../../../../../middleware/auth.js';
import { requirePermission } from '../../../../../middleware/permissions.js';
import apiResponse from '../../../../../helpers/response.js';
import { throwError } from '../../../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../../../config/constants.js';
import modelsInstance from '../../../../../models/index.js';

const validators = [
  validateField('data.itemId')
    .notEmpty()
    .withMessage('validators.itemId.required')
    .isInt({ min: 1 })
    .withMessage('validators.itemId.invalid'),
  validateField('data.code')
    .optional()
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

  const item = await EngagementFileTemplateItem.findOne({
    where: { id: data.itemId },
    include: [{ model: EngagementFileTemplateSection, as: 'templateSection' }]
  });
  if (!item || !item.templateSection || item.templateSection.organizationId !== user.organizationId) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'permanentFile.itemNotFound');
  }

  if (data.code !== undefined && data.code !== item.code) {
    const existing = await EngagementFileTemplateItem.findOne({
      where: { templateSectionId: item.templateSectionId, code: data.code }
    });
    if (existing) {
      throw throwError(HTTP_STATUS.BAD_REQUEST, 'permanentFile.itemCodeExists');
    }
  }

  const updateFields = {};
  ['code', 'description', 'isRequired', 'ref', 'sortOrder'].forEach(field => {
    if (data[field] !== undefined) updateFields[field] = data[field];
  });
  await item.update(updateFields);

  return apiResponse(res, req, next)({ item });
}

const updateRoute = {
  validators,
  default: handler,
  action: 'permanent-file-template-item-update',
  entity: 'organizations'
};

export default updateRoute;
