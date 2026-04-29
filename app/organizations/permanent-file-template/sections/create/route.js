import { validateField } from '../../../../../helpers/validator.js';
import validateRequest from '../../../../../middleware/validation.js';
import authenticate from '../../../../../middleware/auth.js';
import { requirePermission } from '../../../../../middleware/permissions.js';
import apiResponse from '../../../../../helpers/response.js';
import { throwError } from '../../../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../../../config/constants.js';
import { resolveOrgTemplateId, isSystemEngagementTemplateRef } from '../../../../../helpers/engagement-file-template-org.js';
import { validateOptionalEngagementFileTemplateId } from '../../../../../helpers/engagement-file-template-request.js';

const validators = [
  validateOptionalEngagementFileTemplateId(),
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
  validateField('data.retentionScope')
    .optional()
    .isIn(['structural', 'per_period'])
    .withMessage('validators.retentionScope.invalid'),
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
  const { EngagementFileTemplateSection } = req.models;

  if (isSystemEngagementTemplateRef(data?.engagementFileTemplateId)) {
    throw throwError(HTTP_STATUS.BAD_REQUEST, 'permanentFile.cannotMutateSystemEngagementTemplate');
  }

  const orgId = user.organizationId;
  const templateId = await resolveOrgTemplateId(
    req.models,
    orgId,
    data?.engagementFileTemplateId,
    null
  );

  const existing = await EngagementFileTemplateSection.findOne({
    where: { templateId, code: data.code }
  });
  if (existing) {
    throw throwError(HTTP_STATUS.BAD_REQUEST, 'permanentFile.sectionCodeExists');
  }

  let parentSectionId = data.parentSectionId || null;
  if (parentSectionId) {
    const parent = await EngagementFileTemplateSection.findOne({
      where: { id: parentSectionId, organizationId: orgId, templateId }
    });
    if (!parent) {
      throw throwError(HTTP_STATUS.BAD_REQUEST, 'permanentFile.parentSectionNotFound');
    }
  }

  const maxOrder = await EngagementFileTemplateSection.max('sortOrder', {
    where: { templateId, parentSectionId }
  });

  const section = await EngagementFileTemplateSection.create({
    organizationId: orgId,
    templateId,
    parentSectionId,
    code: data.code,
    name: data.name,
    priority: data.priority || null,
    retentionScope: data.retentionScope || 'structural',
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
