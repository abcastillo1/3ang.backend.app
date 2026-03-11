import { validateField } from '../../../helpers/validator.js';
import apiResponse from '../../../helpers/response.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import { throwError } from '../../../helpers/errors.js';
import modelsInstance from '../../../models/index.js';
import { HTTP_STATUS } from '../../../config/constants.js';

const validators = [
  validateField('data.name')
    .notEmpty()
    .withMessage('validators.name.required')
    .isLength({ min: 2, max: 50 })
    .withMessage('validators.name.invalid'),
  validateField('data.description')
    .optional()
    .isString()
    .withMessage('validators.description.invalid'),
  validateField('data.permissionIds')
    .optional()
    .isArray()
    .withMessage('validators.permissionIds.invalid'),
  validateField('data.permissionIds.*')
    .optional()
    .isInt({ min: 1 })
    .withMessage('validators.permissionId.invalid'),
  validateRequest,
  authenticate,
  requirePermission('roles.create')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { Role, Permission } = modelsInstance.models;

  const existingRole = await Role.findOne({
    where: {
      organizationId: req.user.organizationId,
      name: data.name
    }
  });

  if (existingRole) {
    throwError(HTTP_STATUS.CONFLICT, 'roles.nameExists');
  }

  const roleData = {
    organizationId: req.user.organizationId,
    name: data.name,
    description: data.description || null,
    isSystem: false
  };

  const newRole = await Role.create(roleData);

  if (data.permissionIds && Array.isArray(data.permissionIds) && data.permissionIds.length > 0) {
    const permissions = await Permission.findAll({
      where: {
        id: data.permissionIds
      }
    });

    if (permissions.length !== data.permissionIds.length) {
      throwError(HTTP_STATUS.BAD_REQUEST, 'roles.invalidPermissions');
    }

    await newRole.setPermissions(permissions);
  }

  req.activityContext = { roleId: newRole.id, roleName: data.name };
  const roleWithPermissions = await Role.findByPk(newRole.id, {
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
      })),
      createdAt: roleWithPermissions.createdAt
    }
  };

  return apiResponse(res, req, next)(response);
}

const createRoute = {
  validators,
  default: handler,
  action: 'create',
  entity: 'roles',
  activityKey: 'roles.create'
};

export default createRoute;
export { validators };
