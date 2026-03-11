import { validateField } from '../../../../../helpers/validator.js';
import validateRequest from '../../../../../middleware/validation.js';
import authenticate from '../../../../../middleware/auth.js';
import { requirePermission } from '../../../../../middleware/permissions.js';
import apiResponse from '../../../../../helpers/response.js';
import { throwError } from '../../../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../../../config/constants.js';
import modelsInstance from '../../../../../models/index.js';

const validators = [
  validateField('data.code')
    .notEmpty()
    .withMessage('validators.code.required')
    .isLength({ min: 1, max: 20 })
    .withMessage('validators.code.invalid'),
  validateField('data.name')
    .notEmpty()
    .withMessage('validators.name.required')
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
  const { PermanentFileTemplateSection } = modelsInstance.models;

  const orgId = user.organizationId;
  const existing = await PermanentFileTemplateSection.findOne({
    where: { organizationId: orgId, code: data.code }
  });
  if (existing) {
    throw throwError(HTTP_STATUS.BAD_REQUEST, 'permanentFile.sectionCodeExists');
  }

  let parentSectionId = data.parentSectionId || null;
  if (parentSectionId) {
    const parent = await PermanentFileTemplateSection.findOne({
      where: { id: parentSectionId, organizationId: orgId }
    });
    if (!parent) {
      throw throwError(HTTP_STATUS.BAD_REQUEST, 'permanentFile.parentSectionNotFound');
    }
  }

  const maxOrder = await PermanentFileTemplateSection.max('sortOrder', {
    where: { organizationId: orgId, parentSectionId }
  });

  const section = await PermanentFileTemplateSection.create({
    organizationId: orgId,
    parentSectionId,
    code: data.code,
    name: data.name,
    priority: data.priority || null,
    sortOrder: data.sortOrder !== undefined ? data.sortOrder : (maxOrder ?? 0) + 1
  });

  return apiResponse(res, req, next)({ section });
}

const createRoute = {
  validators,
  default: handler,
  action: 'permanent-file-template-section-create',
  entity: 'organizations'
};

export default createRoute;
