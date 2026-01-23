import { HTTP_STATUS, ERROR_CODES } from '../config/constants.js';
import { throwError } from '../helpers/errors.js';
import modelsInstance from '../models/index.js';

export function requirePermission(permissionCode) {
  return async function (req, res, next) {
    if (!req.user || !req.user.id) {
      throwError(HTTP_STATUS.UNAUTHORIZED, 'permissions.userNotAuthenticated');
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
      throwError(HTTP_STATUS.UNAUTHORIZED, 'permissions.userNotFound');
    }

    //ADMIN
    if (req.organization && req.organization.ownerUserId === user.id) {
      req.userModel = user;
      return next();
    }

    const hasPermission = await user.hasPermission(permissionCode);

    if (!hasPermission) {
      throwError(HTTP_STATUS.FORBIDDEN, 'permissions.insufficientPermissions');
    }

    req.userModel = user;
    next();
  };
}
