import validateRequest from '../../../../middleware/validation.js';
import authenticate from '../../../../middleware/auth.js';
import apiResponse from '../../../../helpers/response.js';
import modelsInstance from '../../../../models/index.js';
import { SETTING_KEY, DEFAULT_TREE_TEMPLATE } from '../../../../helpers/tree-seed.js';

const validators = [
  validateRequest,
  authenticate
];

async function handler(req, res, next) {
  const { user } = req;
  const { OrganizationSetting } = modelsInstance.models;

  const setting = await OrganizationSetting.findOne({
    where: { organizationId: user.organizationId, settingKey: SETTING_KEY }
  });

  let template = DEFAULT_TREE_TEMPLATE;
  let isCustom = false;

  if (setting) {
    try {
      const parsed = JSON.parse(setting.settingValue);
      if (Array.isArray(parsed) && parsed.length > 0) {
        template = parsed;
        isCustom = true;
      }
    } catch { /* use default */ }
  }

  return apiResponse(res, req, next)({
    template,
    isCustom,
    defaultTemplate: DEFAULT_TREE_TEMPLATE
  });
}

const viewRoute = {
  validators,
  default: handler,
  action: 'tree-template-view',
  entity: 'organizations'
};

export default viewRoute;
