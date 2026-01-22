import { validateField } from '../../../helpers/validator.js';
import apiResponse from '../../../helpers/response.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { HTTP_STATUS } from '../../../config/constants.js';

const validators = [
  validateField('data.fullName')
    .optional()
    .isLength({ min: 2, max: 255 })
    .withMessage('validators.fullName.invalid'),
  validateField('data.phone')
    .optional()
    .isString()
    .withMessage('validators.phone.invalid'),
  validateRequest,
  authenticate
];

async function handler(req, res, next) {
  const { data } = req.body;
  const user = req.userModel;
  
  const updateData = {};
  
  if (data.fullName !== undefined) {
    updateData.fullName = data.fullName;
  }
  
  if (data.phone !== undefined) {
    updateData.phone = data.phone;
  }
  
  await user.update(updateData);
  
  const response = {
    user: user.toPublicJSON()
  };

  return apiResponse(res, req, next)(response);
}

const updateRoute = {
  validators,
  default: handler
};

export default updateRoute;
export { validators };
