import { validateField } from '../../../../helpers/validator.js';
import validateRequest from '../../../../middleware/validation.js';
import authenticate from '../../../../middleware/auth.js';
import { requirePermission } from '../../../../middleware/permissions.js';
import apiResponse from '../../../../helpers/response.js';
import { throwError } from '../../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../../config/constants.js';
import { DEFAULT_PERMANENT_FILE_TEMPLATE } from '../../../../helpers/permanent-file-template.js';

const validators = [
  validateField('data.engagementFileTemplateId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('validators.id.invalid'),
  validateRequest,
  authenticate,
  requirePermission('organizations.permanentFileTemplate.manage')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { EngagementFileTemplate, EngagementFileTemplateSection, EngagementFileTemplateItem } = req.models;
  const organizationId = user.organizationId;

  const sequelize = req.db;
  const transaction = await sequelize.transaction();

  try {
    const totalSections = await EngagementFileTemplateSection.count({
      where: { organizationId },
      transaction
    });
    const templates = await EngagementFileTemplate.findAll({
      where: { organizationId },
      transaction
    });

    let template;
    if (data?.engagementFileTemplateId != null) {
      template = await EngagementFileTemplate.findOne({
        where: { id: data.engagementFileTemplateId, organizationId },
        transaction
      });
      if (!template) {
        throw throwError(HTTP_STATUS.BAD_REQUEST, 'permanentFile.engagementTemplateNotFound');
      }
      const secCount = await EngagementFileTemplateSection.count({
        where: { templateId: template.id },
        transaction
      });
      if (secCount > 0) {
        throw throwError(HTTP_STATUS.BAD_REQUEST, 'permanentFile.templateAlreadyHasSections');
      }
    } else {
      if (totalSections > 0) {
        throw throwError(HTTP_STATUS.BAD_REQUEST, 'permanentFile.specifyEngagementTemplateForDefaults');
      }
      if (templates.length === 0) {
        template = await EngagementFileTemplate.create({
          organizationId,
          name: 'Plantilla principal',
          isDefault: true
        }, { transaction });
      } else if (templates.length === 1) {
        template = templates[0];
      } else {
        throw throwError(HTTP_STATUS.BAD_REQUEST, 'permanentFile.specifyEngagementTemplateForDefaults');
      }
    }

    for (const sec of DEFAULT_PERMANENT_FILE_TEMPLATE.sections) {
      const section = await EngagementFileTemplateSection.create({
        organizationId,
        templateId: template.id,
        parentSectionId: null,
        code: sec.code,
        name: sec.name,
        priority: sec.priority || null,
        retentionScope: sec.retentionScope === 'per_period' ? 'per_period' : 'structural',
        sortOrder: sec.sortOrder ?? 0
      }, { transaction });
      for (const it of sec.items || []) {
        await EngagementFileTemplateItem.create({
          templateSectionId: section.id,
          code: it.code,
          description: it.description || null,
          isRequired: !!it.isRequired,
          ref: it.ref || null,
          retentionScope: it.retentionScope === 'per_period' ? 'per_period' : 'structural',
          sortOrder: it.sortOrder ?? 0
        }, { transaction });
      }
    }

    const sections = await EngagementFileTemplateSection.findAll({
      where: { organizationId, templateId: template.id },
      order: [['sortOrder', 'ASC'], ['id', 'ASC']],
      transaction
    });

    await transaction.commit();
    return apiResponse(res, req, next)({ template, sections, message: 'permanentFile.defaultsLoaded' });
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
}

const loadDefaultsRoute = {
  validators,
  default: handler,
  action: 'permanent-file-template-load-defaults',
  entity: 'organizations'
};

export default loadDefaultsRoute;
