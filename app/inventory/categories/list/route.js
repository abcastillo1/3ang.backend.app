import apiResponse from '../../../../helpers/response.js';
import authenticate from '../../../../middleware/auth.js';
import { requirePermission } from '../../../../middleware/permissions.js';
import { validateField } from '../../../../helpers/validator.js';
import validateRequest from '../../../../middleware/validation.js';
import { Op } from 'sequelize';
import modelsInstance from '../../../../models/index.js';

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
  validateRequest,
  authenticate,
  requirePermission('inventory.categories.view')
];

async function handler(req, res, next) {
  const { ProductCategory } = modelsInstance.models;
  const { page = 1, limit = 10, search } = req.body.data || {};

  const where = {
    organizationId: req.user.organizationId
  };

  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } }
    ];
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const total = await ProductCategory.count({ where });

  const categories = await ProductCategory.findAll({
    where,
    limit: parseInt(limit),
    offset,
    order: [['name', 'ASC']]
  });

  const response = {
    categories: categories.map(category => ({
      id: category.id,
      organizationId: category.organizationId,
      name: category.name,
      description: category.description,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
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
  entity: 'inventory.categories'
};

export default listRoute;
export { validators };
