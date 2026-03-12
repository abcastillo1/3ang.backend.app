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

  await item.destroy();
  return apiResponse(res, req, next)();
}

const deleteRoute = {
  validators,
  default: handler,
  action: 'permanent-file-template-item-delete',
  entity: 'organizations'
};

export default deleteRoute;
