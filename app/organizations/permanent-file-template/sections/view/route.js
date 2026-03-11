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
  const { PermanentFileTemplateSection, PermanentFileTemplateItem } = modelsInstance.models;

  const section = await PermanentFileTemplateSection.findOne({
    where: { id: data.sectionId, organizationId: user.organizationId },
    include: [{ model: PermanentFileTemplateItem, as: 'items', required: false }]
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
  action: 'permanent-file-template-section-view',
  entity: 'organizations'
};

export default viewRoute;
