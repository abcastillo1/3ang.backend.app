import { validateField } from '../../../helpers/validator.js';
import apiResponse from '../../../helpers/response.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import { throwError } from '../../../helpers/errors.js';
import modelsInstance from '../../../models/index.js';
import { HTTP_STATUS } from '../../../config/constants.js';

const validators = [
  validateField('data.roleId')
    .notEmpty()
    .withMessage('validators.roleId.required')
    .isInt({ min: 1 })
    .withMessage('validators.roleId.invalid'),
  validateField('data.permissionIds')
    .notEmpty()
    .withMessage('validators.permissionIds.required')
    .isArray()
    .withMessage('validators.permissionIds.invalid'),
  validateField('data.permissionIds.*')
    .isInt({ min: 1 })
    .withMessage('validators.permissionId.invalid'),
  validateRequest,
  authenticate,
  requirePermission('roles.update')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { Role, Permission } = modelsInstance.models;

  const role = await Role.findOne({
    where: {
      id: data.roleId,
      organizationId: req.user.organizationId
    }
  });

  if (!role) {
    throwError(HTTP_STATUS.NOT_FOUND, 'roles.notFound');
  }

  if (role.isSystem) {
    throwError(HTTP_STATUS.FORBIDDEN, 'roles.cannotModifySystem');
  }

  const permissions = await Permission.findAll({
    where: {
      id: data.permissionIds
    }
  });

  if (permissions.length !== data.permissionIds.length) {
    throwError(HTTP_STATUS.BAD_REQUEST, 'roles.invalidPermissions');
  }

  await role.setPermissions(permissions);

  const roleWithPermissions = await Role.findByPk(role.id, {
    include: [{
      model: Permission,
      as: 'permissions',
      attributes: ['id', 'code', 'description', 'module'],
      through: { attributes: [] }
    }]
  });

  const response = {
    role: {
      id: roleWithPermissions.id,
      name: roleWithPermissions.name,
      description: roleWithPermissions.description,
      isSystem: roleWithPermissions.isSystem,
      permissions: roleWithPermissions.permissions.map(p => ({
        id: p.id,
        code: p.code,
        description: p.description,
        module: p.module
      }))
    }
  };

  return apiResponse(res, req, next)(response);
}

const assignPermissionsRoute = {
  validators,
  default: handler,
  action: 'update',
  entity: 'roles'
};

export default assignPermissionsRoute;
export { validators };
