import validateRequest from '../../../../middleware/validation.js';
import authenticate from '../../../../middleware/auth.js';
import apiResponse from '../../../../helpers/response.js';
import { throwError } from '../../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../../config/constants.js';
import modelsInstance from '../../../../models/index.js';
import { SETTING_KEY, DEFAULT_TREE_TEMPLATE } from '../../../../helpers/tree-seed.js';

const validators = [
  validateRequest,
  authenticate
];

async function handler(req, res, next) {
  const { user } = req;
  const { OrganizationSetting, Organization } = modelsInstance.models;

  const org = await Organization.findByPk(user.organizationId);
  if (!org || org.ownerUserId !== user.id) {
    throw throwError(HTTP_STATUS.FORBIDDEN, 'organizations.onlyOwnerCanUpdateTemplate');
  }

  await OrganizationSetting.destroy({
    where: { organizationId: user.organizationId, settingKey: SETTING_KEY }
  });

  return apiResponse(res, req, next)({
    template: DEFAULT_TREE_TEMPLATE,
    isCustom: false
  });
}

const resetRoute = {
  validators,
  default: handler,
  action: 'tree-template-reset',
  entity: 'organizations'
};

export default resetRoute;
