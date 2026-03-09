import { validateField } from '../../../helpers/validator.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import apiResponse from '../../../helpers/response.js';
import { Op } from 'sequelize';
import modelsInstance from '../../../models/index.js';

const validators = [
  validateField('data.page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('validators.page.invalid'),
  validateField('data.limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('validators.limit.invalid'),
  validateField('data.search')
    .optional()
    .isString()
    .withMessage('validators.search.invalid'),
  validateField('data.isActive')
    .optional()
    .isBoolean()
    .withMessage('validators.isActive.invalid'),
  validateRequest,
  authenticate,
  requirePermission('clients.view')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { Client } = modelsInstance.models;

  const page = parseInt(data.page) || 1;
  const limit = parseInt(data.limit) || 20;
  const offset = (page - 1) * limit;

  const where = { organizationId: user.organizationId };

  if (typeof data.isActive === 'boolean') {
    where.isActive = data.isActive;
  }

  if (data.search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${data.search}%` } },
      { legalName: { [Op.like]: `%${data.search}%` } },
      { ruc: { [Op.like]: `%${data.search}%` } }
    ];
  }

  const total = await Client.count({ where });

  const clients = await Client.findAll({
    where,
    limit,
    offset,
    order: [['name', 'ASC']],
    attributes: ['id', 'name', 'legalName', 'ruc', 'email', 'phone', 'isActive', 'createdAt']
  });

  return apiResponse(res, req, next)({
    clients,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
}

const listRoute = {
  validators,
  default: handler,
  action: 'list',
  entity: 'clients'
};

export default listRoute;
export { validators };
