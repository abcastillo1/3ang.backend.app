import { validateField } from '../../../helpers/validator.js';
import apiResponse from '../../../helpers/response.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import modelsInstance from '../../../models/index.js';
import { HTTP_STATUS } from '../../../config/constants.js';

const validators = [
  validateField('data.fullName')
    .notEmpty()
    .withMessage('validators.fullName.required')
    .isLength({ min: 2, max: 255 })
    .withMessage('validators.fullName.invalid'),
  validateField('data.email')
    .isEmail()
    .withMessage('validators.email.invalid')
    .notEmpty()
    .withMessage('validators.email.required'),
  validateField('data.password')
    .notEmpty()
    .withMessage('validators.password.required')
    .isLength({ min: 6 })
    .withMessage('validators.password.minLength'),
  validateField('data.roleId')
    .notEmpty()
    .withMessage('validators.roleId.required')
    .isInt({ min: 1 })
    .withMessage('validators.roleId.invalid'),
  validateField('data.documentType')
    .notEmpty()
    .withMessage('validators.documentType.required')
    .isIn(['cedula', 'ruc', 'pasaporte'])
    .withMessage('validators.documentType.invalid'),
  validateField('data.documentNumber')
    .notEmpty()
    .withMessage('validators.documentNumber.required')
    .isString()
    .withMessage('validators.documentNumber.invalid'),
  validateField('data.phone')
    .optional()
    .isString()
    .withMessage('validators.phone.invalid'),
  validateField('data.username')
    .optional()
    .isString()
    .withMessage('validators.username.invalid'),
  validateRequest,
  authenticate,
  requirePermission('users.create')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { User, Role } = modelsInstance.models;

  const existingUser = await User.findByEmail(data.email);
  
  if (existingUser) {
    const error = new Error('User already exists');
    error.status = HTTP_STATUS.CONFLICT;
    error.code = 'users.emailExists';
    throw error;
  }

  const role = await Role.findByPk(data.roleId);
  
  if (!role || role.organizationId !== req.user.organizationId) {
    const error = new Error('Invalid role');
    error.status = HTTP_STATUS.BAD_REQUEST;
    error.code = 'users.invalidRole';
    throw error;
  }

  const existingDocument = await User.findOne({
    where: {
      organizationId: req.user.organizationId,
      documentType: data.documentType,
      documentNumber: data.documentNumber
    }
  });

  if (existingDocument) {
    const error = new Error('Document already exists');
    error.status = HTTP_STATUS.CONFLICT;
    error.code = 'users.documentExists';
    throw error;
  }

  if (data.username) {
    const existingUsername = await User.findOne({
      where: {
        organizationId: req.user.organizationId,
        username: data.username
      }
    });

    if (existingUsername) {
      const error = new Error('Username already exists');
      error.status = HTTP_STATUS.CONFLICT;
      error.code = 'users.usernameExists';
      throw error;
    }
  }

  const userData = {
    organizationId: req.user.organizationId,
    roleId: data.roleId,
    fullName: data.fullName,
    email: data.email,
    passwordHash: data.password,
    documentType: data.documentType,
    documentNumber: data.documentNumber,
    phone: data.phone || null,
    username: data.username || null,
    isActive: true
  };

  const newUser = await User.create(userData);

  const response = {
    user: newUser.toPublicJSON()
  };

  return apiResponse(res, req, next)(response);
}

const createRoute = {
  validators,
  default: handler,
  action: 'create',
  entity: 'users'
};

export default createRoute;
export { validators };
