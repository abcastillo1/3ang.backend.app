import { HTTP_STATUS, ERROR_CODES } from '../config/constants.js';
import modelsInstance from '../models/index.js';

export function requirePermission(permissionCode) {
  return async function (req, res, next) {
    if (!req.user || !req.user.id) {
      const error = new Error('User not authenticated');
      error.status = HTTP_STATUS.UNAUTHORIZED;
      error.code = ERROR_CODES.UNAUTHORIZED;
      throw error;
    }

    const { User } = modelsInstance.models;
    const user = await User.findByPk(req.user.id, {
      include: [{
        model: modelsInstance.models.Role,
        as: 'role',
        include: [{
          model: modelsInstance.models.Permission,
          as: 'permissions'
        }]
      }]
    });

    if (!user) {
      const error = new Error('User not found');
      error.status = HTTP_STATUS.UNAUTHORIZED;
      error.code = ERROR_CODES.UNAUTHORIZED;
      throw error;
    }

    const hasPermission = await user.hasPermission(permissionCode);

    if (!hasPermission) {
      const error = new Error('Insufficient permissions');
      error.status = HTTP_STATUS.FORBIDDEN;
      error.code = ERROR_CODES.FORBIDDEN;
      throw error;
    }

    req.userModel = user;
    next();
  };
}
