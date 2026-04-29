import { validateField } from '../../../../../helpers/validator.js';
import validateRequest from '../../../../../middleware/validation.js';
import authenticate from '../../../../../middleware/auth.js';
import { requirePermission } from '../../../../../middleware/permissions.js';
import apiResponse from '../../../../../helpers/response.js';
import { validateProjectTreeSnapshotInput } from '../../../../../helpers/project-tree-snapshot.js';

const validators = [
  validateField('data.name')
    .notEmpty()
    .withMessage('validators.name.required')
    .isLength({ min: 2, max: 255 })
    .withMessage('validators.name.invalid'),
  validateField('data.setAsDefault')
    .optional()
    .isBoolean()
    .withMessage('validators.isActive.invalid'),
  validateField('data.projectTreeSnapshot')
    .optional()
    .isArray()
    .withMessage('permanentFile.projectTreeSnapshotInvalid'),
  validateRequest,
  authenticate,
  requirePermission('organizations.permanentFileTemplate.manage')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { EngagementFileTemplate } = req.models;
  const organizationId = user.organizationId;

  const count = await EngagementFileTemplate.count({ where: { organizationId } });
  const makeDefault = data.setAsDefault === true || count === 0;

  let projectTreeSnapshot = null;
  if (data.projectTreeSnapshot !== undefined) {
    projectTreeSnapshot = validateProjectTreeSnapshotInput(data.projectTreeSnapshot);
  }

  const sequelize = req.db;
  const transaction = await sequelize.transaction();
  try {
    if (makeDefault) {
      await EngagementFileTemplate.update(
        { isDefault: false },
        { where: { organizationId }, transaction }
      );
    }

    const template = await EngagementFileTemplate.create({
      organizationId,
      name: data.name,
      isDefault: makeDefault,
      projectTreeSnapshot
    }, { transaction });

    await transaction.commit();
    return apiResponse(res, req, next)({ template });
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
}

const createRoute = {
  validators,
  default: handler,
  action: 'engagement-file-template-templates-create',
  entity: 'organizations'
};

export default createRoute;
