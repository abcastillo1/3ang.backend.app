import { validateField } from '../../../../../helpers/validator.js';
import validateRequest from '../../../../../middleware/validation.js';
import authenticate from '../../../../../middleware/auth.js';
import { requirePermission } from '../../../../../middleware/permissions.js';
import apiResponse from '../../../../../helpers/response.js';
import { throwError } from '../../../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../../../config/constants.js';
import modelsInstance from '../../../../../models/index.js';
import { validateProjectTreeSnapshotInput } from '../../../../../helpers/project-tree-snapshot.js';

const validators = [
  validateField('data.templateId')
    .notEmpty()
    .withMessage('validators.id.required')
    .isInt({ min: 1 })
    .withMessage('validators.id.invalid'),
  validateField('data.name')
    .optional()
    .isLength({ min: 2, max: 255 })
    .withMessage('validators.name.invalid'),
  validateField('data.setAsDefault')
    .optional()
    .isBoolean()
    .withMessage('validators.isActive.invalid'),
  validateField('data.projectTreeSnapshot')
    .optional({ values: 'null' })
    .custom(v => v === null || Array.isArray(v))
    .withMessage('permanentFile.projectTreeSnapshotInvalid'),
  validateRequest,
  authenticate,
  requirePermission('organizations.permanentFileTemplate.manage')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { EngagementFileTemplate } = modelsInstance.models;
  const organizationId = user.organizationId;

  const template = await EngagementFileTemplate.findOne({
    where: { id: data.templateId, organizationId }
  });
  if (!template) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'permanentFile.engagementTemplateNotFound');
  }

  if (
    data.name === undefined
    && data.setAsDefault === undefined
    && data.projectTreeSnapshot === undefined
  ) {
    throw throwError(HTTP_STATUS.BAD_REQUEST, 'permanentFile.templateUpdateNothingToChange');
  }

  const sequelize = modelsInstance.sequelize;
  const transaction = await sequelize.transaction();

  try {
    if (data.setAsDefault === true) {
      await EngagementFileTemplate.update(
        { isDefault: false },
        { where: { organizationId }, transaction }
      );
    }

    const updates = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.setAsDefault === true) updates.isDefault = true;
    if (data.projectTreeSnapshot !== undefined) {
      updates.projectTreeSnapshot = validateProjectTreeSnapshotInput(data.projectTreeSnapshot);
    }

    await template.update(updates, { transaction });
    await transaction.commit();

    const fresh = await EngagementFileTemplate.findByPk(template.id);
    return apiResponse(res, req, next)({ template: fresh });
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
}

const updateRoute = {
  validators,
  default: handler,
  action: 'engagement-file-template-templates-update',
  entity: 'organizations'
};

export default updateRoute;
