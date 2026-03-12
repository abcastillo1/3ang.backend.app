import { validateField } from '../../../../../helpers/validator.js';
import validateRequest from '../../../../../middleware/validation.js';
import authenticate from '../../../../../middleware/auth.js';
import { requirePermission } from '../../../../../middleware/permissions.js';
import apiResponse from '../../../../../helpers/response.js';
import { throwError } from '../../../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../../../config/constants.js';
import modelsInstance from '../../../../../models/index.js';

const validators = [
  validateField('data.parentSectionId')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('validators.parentSectionId.invalid'),
  validateRequest,
  authenticate,
  requirePermission('organizations.permanentFileTemplate.manage')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { EngagementFileTemplateSection } = modelsInstance.models;

  const where = { organizationId: user.organizationId };
  if (data?.parentSectionId != null) {
    where.parentSectionId = data.parentSectionId;
  } else {
    where.parentSectionId = null;
  }

  const sections = await EngagementFileTemplateSection.findAll({
    where,
    order: [['sortOrder', 'ASC'], ['id', 'ASC']]
  });

  return apiResponse(res, req, next)({ sections });
}

const listRoute = {
  validators,
  default: handler,
  action: 'permanent-file-template-sections-list',
  entity: 'organizations'
};

export default listRoute;
