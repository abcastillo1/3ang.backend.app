import { validateField } from '../../../helpers/validator.js';
import apiResponse from '../../../helpers/response.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import { throwError } from '../../../helpers/errors.js';
import modelsInstance from '../../../models/index.js';
import { HTTP_STATUS } from '../../../config/constants.js';

const validators = [
  validateField('data.id')
    .notEmpty()
    .withMessage('validators.id.required')
    .isInt({ min: 1 })
    .withMessage('validators.id.invalid'),
  validateField('data.name')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('validators.name.invalid'),
  validateField('data.description')
    .optional()
    .isString()
    .withMessage('validators.description.invalid'),
  validateRequest,
  authenticate,
  requirePermission('roles.update')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { Role } = modelsInstance.models;

  const role = await Role.findOne({
    where: {
      id: data.id,
      organizationId: req.user.organizationId
    }
  });

  if (!role) {
    throwError(HTTP_STATUS.NOT_FOUND, 'roles.notFound');
  }

  if (role.isSystem) {
    throwError(HTTP_STATUS.FORBIDDEN, 'roles.cannotModifySystem');
  }

  if (data.name && data.name !== role.name) {
    const existingRole = await Role.findOne({
      where: {
        organizationId: req.user.organizationId,
        name: data.name
      }
    });

    if (existingRole) {
      throwError(HTTP_STATUS.CONFLICT, 'roles.nameExists');
    }
  }

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;

  await role.update(updateData);

  req.activityContext = { roleId: role.id, roleName: role.name };
  const roleWithPermissions = await Role.findByPk(role.id, {
    include: [{
      model: modelsInstance.models.Permission,
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
      updatedAt: roleWithPermissions.updatedAt
    }
  };

  return apiResponse(res, req, next)(response);
}

const updateRoute = {
  validators,
  default: handler,
  action: 'update',
  entity: 'roles',
  activityKey: 'roles.update'
};

export default updateRoute;
export { validators };
