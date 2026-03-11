import { validateField } from '../../../helpers/validator.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import apiResponse from '../../../helpers/response.js';
import { throwError } from '../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../config/constants.js';
import { Op } from 'sequelize';
import modelsInstance from '../../../models/index.js';

const validators = [
  validateField('data.id')
    .notEmpty()
    .withMessage('validators.id.required')
    .isInt({ min: 1 })
    .withMessage('validators.id.invalid'),
  validateField('data.name')
    .optional()
    .isLength({ min: 2, max: 255 })
    .withMessage('validators.name.invalid'),
  validateField('data.legalName')
    .optional()
    .isLength({ max: 255 })
    .withMessage('validators.legalName.invalid'),
  validateField('data.ruc')
    .optional()
    .isLength({ max: 13 })
    .withMessage('validators.ruc.invalid'),
  validateField('data.email')
    .optional()
    .isEmail()
    .withMessage('validators.email.invalid'),
  validateField('data.phone')
    .optional()
    .isString()
    .withMessage('validators.phone.invalid'),
  validateField('data.address')
    .optional()
    .isString()
    .withMessage('validators.address.invalid'),
  validateField('data.isActive')
    .optional()
    .isBoolean()
    .withMessage('validators.isActive.invalid'),
  validateRequest,
  authenticate,
  requirePermission('clients.update')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { Client } = modelsInstance.models;

  const client = await Client.findOne({
    where: { id: data.id, organizationId: user.organizationId }
  });

  if (!client) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'clients.notFound');
  }

  if (data.ruc && data.ruc !== client.ruc) {
    const existing = await Client.findOne({
      where: { ruc: data.ruc, organizationId: user.organizationId, id: { [Op.ne]: client.id } }
    });
    if (existing) {
      throw throwError(HTTP_STATUS.CONFLICT, 'clients.rucExists');
    }
  }

  const updateFields = {};
  const allowedFields = ['name', 'legalName', 'ruc', 'email', 'phone', 'address', 'isActive'];
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updateFields[field] = data[field];
    }
  }

  await client.update(updateFields);

  req.activityContext = { clientId: client.id, clientName: client.name };
  return apiResponse(res, req, next)({ client });
}

const updateRoute = {
  validators,
  default: handler,
  action: 'update',
  entity: 'clients',
  activityKey: 'clients.update'
};

export default updateRoute;
export { validators };
