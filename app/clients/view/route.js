import { validateField } from '../../../helpers/validator.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import apiResponse from '../../../helpers/response.js';
import { throwError } from '../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../config/constants.js';
import modelsInstance from '../../../models/index.js';

export const validators = [
  validateField('data.id')
    .notEmpty()
    .withMessage('validators.id.required')
    .isInt({ min: 1 })
    .withMessage('validators.id.invalid'),
  validateRequest,
  authenticate,
  requirePermission('clients.view')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { Client, AuditProject } = modelsInstance.models;

  const client = await Client.findOne({
    where: { id: data.id, organizationId: user.organizationId },
    include: [
      {
        model: AuditProject,
        as: 'auditProjects',
        attributes: ['id', 'name', 'auditType', 'status', 'periodStart', 'periodEnd']
      }
    ]
  });

  if (!client) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'clients.notFound');
  }

  return apiResponse(res, req, next)({ client });
}

const viewRoute = {
  validators,
  default: handler,
  action: 'view',
  entity: 'clients'
};

export default viewRoute;
export { validators };
