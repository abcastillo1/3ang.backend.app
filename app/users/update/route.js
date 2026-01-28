import { validateField } from '../../../helpers/validator.js';
import apiResponse from '../../../helpers/response.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import validateUserUpdate from '../../../middleware/users/validateUserUpdate.js';

const validators = [
  validateField('data.id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('validators.id.invalid'),
  validateField('data.fullName')
    .optional()
    .isLength({ min: 2, max: 255 })
    .withMessage('validators.fullName.invalid'),
  validateField('data.username')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('validators.username.invalid'),
  validateField('data.email')
    .optional()
    .isEmail()
    .withMessage('validators.email.invalid'),
  validateField('data.phone')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage('validators.phone.invalid'),
  validateField('data.documentType')
    .optional()
    .isIn(['cedula', 'ruc', 'pasaporte'])
    .withMessage('validators.documentType.invalid'),
  validateField('data.documentNumber')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage('validators.documentNumber.invalid'),
  validateField('data.password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('validators.password.minLength'),
  validateField('data.isActive')
    .optional()
    .isBoolean()
    .withMessage('validators.isActive.invalid'),
  validateField('data.roleId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('validators.roleId.invalid'),
  validateRequest,
  authenticate,
  requirePermission('users.update'),
  validateUserUpdate
];

async function handler(req, res, next) {
  const user = req.userToUpdate;
  
  await user.update(req.updateData);
  await user.reload();
  
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
