import { validateField } from '../../../helpers/validator.js';
import apiResponse from '../../../helpers/response.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import modelsInstance from '../../../models/index.js';
import { Op } from 'sequelize';

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
  validateField('data.active')
    .optional()
    .isBoolean()
    .withMessage('validators.isActive.invalid'),
  validateRequest,
  authenticate,
  requirePermission('species.view')
];

async function handler(req, res, next) {
  const { Species } = modelsInstance.models;
  const { page = 1, limit = 10, search, active } = req.body.data || {};

  const where = {};

  if (search) {
    where.name = { [Op.like]: `%${search}%` };
  }

  if (active !== undefined) {
    where.active = active;
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const total = await Species.count({ where });

  const species = await Species.findAll({
    where,
    limit: parseInt(limit),
    offset,
    order: [['name', 'ASC']]
  });

  const response = {
    species: species.map(s => ({
      speciesId: s.speciesId,
      name: s.name,
      active: s.active
    })),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit))
    }
  };

  return apiResponse(res, req, next)(response);
}

const listRoute = {
  validators,
  default: handler,
  action: 'list',
  entity: 'species'
};

export default listRoute;
export { validators };
