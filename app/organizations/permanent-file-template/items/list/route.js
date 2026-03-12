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

  const items = await EngagementFileTemplateItem.findAll({
    where: { templateSectionId: section.id },
    order: [['sortOrder', 'ASC'], ['id', 'ASC']]
  });

  return apiResponse(res, req, next)({ items });
}

const listRoute = {
  validators,
  default: handler,
  action: 'permanent-file-template-items-list',
  entity: 'organizations'
};

export default listRoute;
