import apiResponse from '../../../helpers/response.js';
import authenticate from '../../../middleware/auth.js';
import modelsInstance from '../../../models/index.js';

const validators = [
  authenticate
];

async function handler(req, res, next) {
  const { OrganizationSetting } = modelsInstance.models;

  const settings = await OrganizationSetting.findAll({
    where: { organizationId: req.organization.id }
  });

  const settingsObject = {};
  settings.forEach(setting => {
    settingsObject[setting.settingKey] = setting.settingValue;
  });
  const response = {
    organization: {
      id: req.organization.id,
      name: req.organization.name,
      legalName: req.organization.legalName,
      taxId: req.organization.taxId,
      email: req.organization.email,
      phone: req.organization.phone,
      address: req.organization.address,
      country: req.organization.country,
      city: req.organization.city,
      image: req.organization.image ?? null,
      isActive: req.organization.isActive,
      createdAt: req.organization.createdAt,
      updatedAt: req.organization.updatedAt
    },
    settings: settingsObject
  };

  return apiResponse(res, req, next)(response);
}

const organizationRoute = {
  validators,
  default: handler
};

export default organizationRoute;
export { validators };
