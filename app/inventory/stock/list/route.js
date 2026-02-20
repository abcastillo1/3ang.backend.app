import { validateField } from '../../../../helpers/validator.js';
import apiResponse from '../../../../helpers/response.js';
import validateRequest from '../../../../middleware/validation.js';
import authenticate from '../../../../middleware/auth.js';
import { requirePermission } from '../../../../middleware/permissions.js';
import { HTTP_STATUS } from '../../../../config/constants.js';
import { throwError } from '../../../../helpers/errors.js';
import { Op } from 'sequelize';
import modelsInstance from '../../../../models/index.js';

const validators = [
  validateField('data.establishmentId')
    .notEmpty()
    .withMessage('validators.establishmentId.required')
    .isInt({ min: 1 })
    .withMessage('validators.establishmentId.invalid'),
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
  requirePermission('inventory.stock.update')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { InventoryStock, Establishment, InventoryProduct, ProductCategory } = modelsInstance.models;

  const establishment = await Establishment.findOne({
    where: {
      id: data.establishmentId,
      organizationId: req.user.organizationId
    }
  });

  if (!establishment) {
    throwError(HTTP_STATUS.NOT_FOUND, 'establishments.notFound');
  }

  const page = Math.max(1, parseInt(data.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(data.limit, 10) || 20));
  const offset = (page - 1) * limit;
  const search = typeof data.search === 'string' && data.search.trim() ? data.search.trim() : null;

  const productWhere = { organizationId: req.user.organizationId };
  if (search) {
    productWhere[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { sku: { [Op.like]: `%${search}%` } }
    ];
  }

  const { count, rows: stocks } = await InventoryStock.findAndCountAll({
    where: { establishmentId: data.establishmentId },
    include: [
      {
        model: InventoryProduct,
        as: 'product',
        required: true,
        where: productWhere,
        attributes: ['id', 'name', 'sku', 'unitOfMeasure', 'generalPrice', 'costPrice', 'ivaType', 'minimumPrice', 'minStockLevel', 'batchActive'],
        include: [
          {
            model: ProductCategory,
            as: 'category',
            attributes: ['id', 'name'],
            required: false
          }
        ]
      }
    ],
    order: [[{ model: InventoryProduct, as: 'product' }, 'name', 'ASC']],
    limit,
    offset,
    distinct: true
  });

  const items = stocks.map((s) => ({
    productId: s.productId,
    productName: s.product?.name ?? null,
    sku: s.product?.sku ?? null,
    unitOfMeasure: s.product?.unitOfMeasure ?? null,
    price: s.price != null ? parseFloat(s.price) : null,
    generalPrice: s.product?.generalPrice != null ? parseFloat(s.product.generalPrice) : null,
    costPrice: s.product?.costPrice != null ? parseFloat(s.product.costPrice) : null,
    ivaType: s.product?.ivaType ?? null,
    minimumPrice: s.product?.minimumPrice != null ? parseFloat(s.product.minimumPrice) : null,
    batchActive: !!s.product?.batchActive,
    currentStock: parseFloat(s.currentStock),
    minStockLevel: s.minStockLevel != null ? parseFloat(s.minStockLevel) : null,
    category: s.product?.category
      ? { id: s.product.category.id, name: s.product.category.name }
      : null
  }));

  const response = {
    establishment: {
      id: establishment.id,
      name: establishment.name,
      code: establishment.code
    },
    items,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit)
    }
  };

  return apiResponse(res, req, next)(response);
}

const listRoute = {
  validators,
  default: handler,
  action: 'list',
  entity: 'inventory.stock'
};

export default listRoute;
export { validators };
