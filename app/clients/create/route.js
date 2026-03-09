import { validateField } from '../../../helpers/validator.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import apiResponse from '../../../helpers/response.js';
import { throwError } from '../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../config/constants.js';
import modelsInstance from '../../../models/index.js';

export const validators = [
  validateField('data.name')
    .notEmpty()
    .withMessage('validators.name.required')
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
  validateRequest,
  authenticate,
  requirePermission('clients.create')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { Client } = modelsInstance.models;

  if (data.ruc) {
    const existing = await Client.findOne({
      where: { ruc: data.ruc, organizationId: user.organizationId }
    });
    if (existing) {
      throw throwError(HTTP_STATUS.CONFLICT, 'clients.rucExists');
    }
  }

  const client = await Client.create({
    organizationId: user.organizationId,
    name: data.name,
    legalName: data.legalName || null,
    ruc: data.ruc || null,
    email: data.email || null,
    phone: data.phone || null,
    address: data.address || null
  });

  return apiResponse(res, req, next)({ client });
}

const createRoute = {
  validators,
  default: handler,
  action: 'create',
  entity: 'clients'
};

export default createRoute;
