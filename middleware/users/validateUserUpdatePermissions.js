import { HTTP_STATUS } from '../../config/constants.js';
import { throwError } from '../../helpers/errors.js';
import modelsInstance from '../../models/index.js';

export default async function validateUserUpdatePermissions(req, res, next) {
  const { data } = req.body;
  const { User } = modelsInstance.models;
  
  const userToUpdate = req.userToUpdate;
  
  if (!userToUpdate) {
    throwError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'server.internalError');
  }
  
  let authenticatedUser = req.userModel;
  
  if (!authenticatedUser || !authenticatedUser.role || !authenticatedUser.role.permissions) {
    authenticatedUser = await User.findByPk(req.user.id, {
      include: [{
        model: modelsInstance.models.Role,
        as: 'role',
        include: [{
          model: modelsInstance.models.Permission,
          as: 'permissions'
        }]
      }]
    });

    if (!authenticatedUser) {
      throwError(HTTP_STATUS.UNAUTHORIZED, 'permissions.userNotFound');
    }
    
    req.userModel = authenticatedUser;
  }

  if (req.organization && req.organization.ownerUserId === authenticatedUser.id) {
    return next();
  }

  const requiredPermissions = [];

  if (data.password !== undefined && data.password !== null && data.password !== '') {
    requiredPermissions.push('users.editPassword');
  }

  if (data.roleId !== undefined && data.roleId !== userToUpdate.roleId) {
    requiredPermissions.push('users.editRole');
  }

  if (data.isActive !== undefined && data.isActive !== userToUpdate.isActive) {
    requiredPermissions.push('users.editStatus');
  }

  const infoFields = ['fullName', 'email', 'phone', 'documentType', 'documentNumber', 'username'];
  const isUpdatingInfo = infoFields.some(field => {
    if (data[field] === undefined) return false;
    const currentValue = userToUpdate[field] || null;
    const newValue = data[field] || null;
    return currentValue !== newValue;
  });
  
  if (isUpdatingInfo) {
    requiredPermissions.push('users.editInfo');
  }

  for (const permissionCode of requiredPermissions) {
    const hasPermission = await user.hasPermission(permissionCode);
    
    if (!hasPermission) {
      throwError(HTTP_STATUS.FORBIDDEN, 'permissions.insufficientPermissions');
    }
  }

  next();
}
