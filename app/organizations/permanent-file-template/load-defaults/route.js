import validateRequest from '../../../../middleware/validation.js';
import authenticate from '../../../../middleware/auth.js';
import { requirePermission } from '../../../../middleware/permissions.js';
import apiResponse from '../../../../helpers/response.js';
import { throwError } from '../../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../../config/constants.js';
import modelsInstance from '../../../../models/index.js';
import { DEFAULT_PERMANENT_FILE_TEMPLATE } from '../../../../helpers/permanent-file-template.js';

const validators = [
  validateRequest,
  authenticate,
  requirePermission('organizations.permanentFileTemplate.manage')
];

async function handler(req, res, next) {
  const { user } = req;
  const { PermanentFileTemplateSection, PermanentFileTemplateItem } = modelsInstance.models;

  const existing = await PermanentFileTemplateSection.count({
    where: { organizationId: user.organizationId }
  });
  if (existing > 0) {
    throw throwError(HTTP_STATUS.BAD_REQUEST, 'permanentFile.templateAlreadyHasSections');
  }

  for (const sec of DEFAULT_PERMANENT_FILE_TEMPLATE.sections) {
    const section = await PermanentFileTemplateSection.create({
      organizationId: user.organizationId,
      parentSectionId: null,
      code: sec.code,
      name: sec.name,
      priority: sec.priority || null,
      sortOrder: sec.sortOrder ?? 0
    });
    for (const it of sec.items || []) {
      await PermanentFileTemplateItem.create({
        templateSectionId: section.id,
        code: it.code,
        description: it.description || null,
        isRequired: !!it.isRequired,
        ref: it.ref || null,
        sortOrder: it.sortOrder ?? 0
      });
    }
  }

  const sections = await PermanentFileTemplateSection.findAll({
    where: { organizationId: user.organizationId },
    order: [['sortOrder', 'ASC'], ['id', 'ASC']]
  });

  return apiResponse(res, req, next)({ sections, message: 'permanentFile.defaultsLoaded' });
}

const loadDefaultsRoute = {
  validators,
  default: handler,
  action: 'permanent-file-template-load-defaults',
  entity: 'organizations'
};

export default loadDefaultsRoute;
