import { validateField } from '../../../helpers/validator.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import apiResponse from '../../../helpers/response.js';
import { throwError } from '../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../config/constants.js';
import { Op } from 'sequelize';
import modelsInstance from '../../../models/index.js';

export const validators = [
  validateField('data.id')
    .notEmpty()
    .withMessage('validators.id.required')
    .isInt({ min: 1 })
    .withMessage('validators.id.invalid'),
  validateRequest,
  authenticate,
  requirePermission('clients.delete')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { Client, AuditProject } = modelsInstance.models;

  const client = await Client.findOne({
    where: { id: data.id, organizationId: user.organizationId }
  });

  if (!client) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'clients.notFound');
  }

  const activeProjects = await AuditProject.count({
    where: { clientId: client.id, status: { [Op.ne]: 'closed' } }
  });

  if (activeProjects > 0) {
    throw throwError(HTTP_STATUS.CONFLICT, 'clients.hasActiveProjects');
  }

  await client.softDelete();

  return apiResponse(res, req, next)();
}

const deleteRoute = {
  validators,
  default: handler,
  action: 'delete',
  entity: 'clients'
};

export default deleteRoute;
export { validators };
