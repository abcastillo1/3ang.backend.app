import { validateField } from '../../../../helpers/validator.js';
import validateRequest from '../../../../middleware/validation.js';
import authenticate from '../../../../middleware/auth.js';
import apiResponse from '../../../../helpers/response.js';
import { throwError } from '../../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../../config/constants.js';
import modelsInstance from '../../../../models/index.js';
import { SETTING_KEY, DEFAULT_TREE_TEMPLATE } from '../../../../helpers/tree-seed.js';

const validators = [
  validateField('data.template')
    .notEmpty()
    .withMessage('validators.template.required')
    .isArray({ min: 1 })
    .withMessage('validators.template.invalid'),
  validateField('data.template.*.name')
    .notEmpty()
    .withMessage('validators.template.name.required')
    .isLength({ min: 1, max: 255 })
    .withMessage('validators.template.name.invalid'),
  validateField('data.template.*.type')
    .notEmpty()
    .withMessage('validators.template.type.required')
    .isString()
    .withMessage('validators.template.type.invalid'),
  validateRequest,
  authenticate
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { OrganizationSetting, Organization } = modelsInstance.models;

  const org = await Organization.findByPk(user.organizationId);
  if (!org || org.ownerUserId !== user.id) {
    throw throwError(HTTP_STATUS.FORBIDDEN, 'organizations.onlyOwnerCanUpdateTemplate');
  }

  const template = data.template.map((item, index) => ({
    type: item.type.trim(),
    name: item.name.trim(),
    ...(item.children ? { children: item.children } : {})
  }));

  const [setting] = await OrganizationSetting.findOrCreate({
    where: { organizationId: user.organizationId, settingKey: SETTING_KEY },
    defaults: { settingValue: JSON.stringify(template) }
  });

  if (setting) {
    await setting.update({ settingValue: JSON.stringify(template) });
  }

  return apiResponse(res, req, next)({
    template,
    isCustom: true,
    defaultTemplate: DEFAULT_TREE_TEMPLATE
  });
}

const updateRoute = {
  validators,
  default: handler,
  action: 'tree-template-update',
  entity: 'organizations'
};

export default updateRoute;
