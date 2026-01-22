import apiResponse from '../../../helpers/response.js';
import authenticate from '../../../middleware/auth.js';

const validators = [
  authenticate
];

async function handler(req, res, next) {
  const user = req.userModel;
  
  const response = {
    user: user.toPublicJSON(),
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
      isActive: req.organization.isActive
    }
  };

  return apiResponse(res, req, next)(response);
}

const profileRoute = {
  validators,
  default: handler
};

export default profileRoute;
export { validators };
