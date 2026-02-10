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
  validateField('data.categoryId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('validators.categoryId.invalid'),
  validateField('data.isActive')
    .optional()
    .isBoolean()
    .withMessage('validators.isActive.invalid'),
  validateRequest,
  authenticate,
  requirePermission('inventory.products.view')
];

async function handler(req, res, next) {
  const { InventoryProduct, ProductCategory } = modelsInstance.models;
  const { page = 1, limit = 10, search, categoryId, isActive } = req.body.data || {};

  const where = {
    organizationId: req.user.organizationId
  };

  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { sku: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } }
    ];
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const total = await InventoryProduct.count({ where });

  const products = await InventoryProduct.findAll({
    where,
    limit: parseInt(limit),
    offset,
    order: [['createdAt', 'DESC']],
    include: [{
      model: ProductCategory,
      as: 'category',
      attributes: ['id', 'name', 'description'],
      required: false
    }]
  });

  const response = {
    products: products.map(product => ({
      id: product.id,
      organizationId: product.organizationId,
      name: product.name,
      sku: product.sku,
      description: product.description,
      image: product.image,
      gallery: product.gallery,
      unitOfMeasure: product.unitOfMeasure,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      category: product.category ? {
        id: product.category.id,
        name: product.category.name,
        description: product.category.description
      } : null
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
  entity: 'inventory.products'
};

export default listRoute;
export { validators };
