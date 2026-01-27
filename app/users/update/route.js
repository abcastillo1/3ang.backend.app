import { validateField } from '../../../helpers/validator.js';
import apiResponse from '../../../helpers/response.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import { HTTP_STATUS } from '../../../config/constants.js';
import { throwError } from '../../../helpers/errors.js';
import modelsInstance from '../../../models/index.js';
import { Op } from 'sequelize';

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
  validateRequest,
  authenticate,
  requirePermission('users.update')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { User } = modelsInstance.models;
  const authenticatedUser = req.userModel;
  
  // Determine which user to update
  let userToUpdate = authenticatedUser;
  
  if (data.id !== undefined) {
    // If id is provided, find that user
    const targetUser = await User.findByPk(data.id);
    
    if (!targetUser) {
      throwError(HTTP_STATUS.NOT_FOUND, 'users.userNotFound');
    }
    
    // Verify that target user belongs to the same organization
    if (targetUser.organizationId !== authenticatedUser.organizationId) {
      throwError(HTTP_STATUS.FORBIDDEN, 'users.cannotUpdateOtherOrganization');
    }
    
    userToUpdate = targetUser;
  }
  
  const user = userToUpdate;
  
  // Validate uniqueness of email (global unique)
  if (data.email !== undefined && data.email !== user.email) {
    const existingUser = await User.findByEmail(data.email);
    if (existingUser && existingUser.id !== user.id) {
      throwError(HTTP_STATUS.BAD_REQUEST, 'users.emailExists');
    }
  }
  
  // Validate uniqueness of username (unique per organization)
  if (data.username !== undefined && data.username !== user.username) {
    const where = {
      organizationId: user.organizationId,
      username: data.username
    };
    
    if (data.username === null || data.username === '') {
      where.username = null;
    }
    
    const existingUser = await User.findOne({
      where: {
        ...where,
        id: { [Op.ne]: user.id }
      }
    });
    
    if (existingUser) {
      throwError(HTTP_STATUS.BAD_REQUEST, 'users.usernameExists');
    }
  }
  
  // Validate uniqueness of documentNumber (unique per organization and documentType)
  if (data.documentNumber !== undefined || data.documentType !== undefined) {
    const documentType = data.documentType !== undefined ? data.documentType : user.documentType;
    const documentNumber = data.documentNumber !== undefined ? data.documentNumber : user.documentNumber;
    
    if (documentNumber !== user.documentNumber || documentType !== user.documentType) {
      const existingUser = await User.findOne({
        where: {
          organizationId: user.organizationId,
          documentType: documentType,
          documentNumber: documentNumber,
          id: { [Op.ne]: user.id }
        }
      });
      
      if (existingUser) {
        throwError(HTTP_STATUS.BAD_REQUEST, 'users.documentExists');
      }
    }
  }
  
  const updateData = {};
  
  if (data.fullName !== undefined) {
    updateData.fullName = data.fullName;
  }
  
  if (data.username !== undefined) {
    updateData.username = data.username || null;
  }
  
  if (data.email !== undefined) {
    updateData.email = data.email;
  }
  
  if (data.phone !== undefined) {
    updateData.phone = data.phone || null;
  }
  
  if (data.documentType !== undefined) {
    updateData.documentType = data.documentType;
  }
  
  if (data.documentNumber !== undefined) {
    updateData.documentNumber = data.documentNumber;
  }
  
  if (data.password !== undefined) {
    updateData.passwordHash = data.password;
  }
  
  if (data.isActive !== undefined) {
    updateData.isActive = data.isActive;
  }
  
  await user.update(updateData);
  
  // Reload user to get updated data
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
