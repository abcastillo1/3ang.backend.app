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
  validateRequest,
  authenticate,
  requirePermission('roles.delete')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { Role, User } = modelsInstance.models;

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
    throwError(HTTP_STATUS.FORBIDDEN, 'roles.cannotDeleteSystem');
  }

  const usersWithRole = await User.count({
    where: {
      roleId: role.id,
      organizationId: req.user.organizationId
    }
  });

  if (usersWithRole > 0) {
    throwError(HTTP_STATUS.CONFLICT, 'roles.hasUsers');
  }

  await role.softDelete();

  return apiResponse(res, req, next)();
}

const deleteRoute = {
  validators,
  default: handler,
  action: 'delete',
  entity: 'roles'
};

export default deleteRoute;
export { validators };
