import { validateField } from '../../../../helpers/validator.js';
import apiResponse from '../../../../helpers/response.js';
import validateRequest from '../../../../middleware/validation.js';
import authenticate from '../../../../middleware/auth.js';
import { requirePermission } from '../../../../middleware/permissions.js';
import validateStockUpdate from '../../../../middleware/inventory/validateStockUpdate.js';
import modelsInstance from '../../../../models/index.js';

const validators = [
  validateField('data.establishmentId')
    .notEmpty()
    .withMessage('validators.establishmentId.required')
    .isInt({ min: 1 })
    .withMessage('validators.establishmentId.invalid'),
  validateField('data.productId')
    .notEmpty()
    .withMessage('validators.productId.required')
    .isInt({ min: 1 })
    .withMessage('validators.productId.invalid'),
  validateField('data.type')
    .optional()
    .isIn(['entry', 'exit', 'transfer', 'adjustment'])
    .withMessage('validators.type.invalid'),
  validateField('data.quantity')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('validators.quantity.invalid'),
  validateField('data.currentStock')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('validators.currentStock.invalid'),
  validateField('data.minStockLevel')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('validators.minStockLevel.invalid'),
  validateField('data.reason')
    .optional()
    .isString()
    .isLength({ max: 255 })
    .withMessage('validators.reason.invalid'),
  validateField('data.metadata')
    .optional()
    .custom((value) => {
      if (typeof value !== 'object' || value === null) {
        return false;
      }
      try {
        JSON.stringify(value);
        return true;
      } catch {
        return false;
      }
    })
    .withMessage('validators.metadata.invalid'),
  validateRequest,
  authenticate,
  requirePermission('inventory.stock.update'),
  validateStockUpdate
];

async function handler(req, res, next) {
  const { InventoryStock, Establishment, InventoryProduct } = modelsInstance.models;

  const stock = await InventoryStock.updateStock(req.stockData, req.user.id);

  const stockWithRelations = await InventoryStock.findByPk(stock.id, {
    include: [
      {
        model: Establishment,
        as: 'establishment',
        attributes: ['id', 'name', 'code']
      },
      {
        model: InventoryProduct,
        as: 'product',
        attributes: ['id', 'name', 'sku', 'unitOfMeasure']
      }
    ]
  });

  const response = {
    stock: {
      id: stockWithRelations.id,
      establishmentId: stockWithRelations.establishmentId,
      productId: stockWithRelations.productId,
      currentStock: parseFloat(stockWithRelations.currentStock),
      minStockLevel: stockWithRelations.minStockLevel ? parseFloat(stockWithRelations.minStockLevel) : null,
      updatedAt: stockWithRelations.updatedAt,
      establishment: stockWithRelations.establishment ? {
        id: stockWithRelations.establishment.id,
        name: stockWithRelations.establishment.name,
        code: stockWithRelations.establishment.code
      } : null,
      product: stockWithRelations.product ? {
        id: stockWithRelations.product.id,
        name: stockWithRelations.product.name,
        sku: stockWithRelations.product.sku,
        unitOfMeasure: stockWithRelations.product.unitOfMeasure
      } : null
    }
  };

  return apiResponse(res, req, next)(response);
}

const updateRoute = {
  validators,
  default: handler,
  action: 'update',
  entity: 'inventory.stock'
};

export default updateRoute;
export { validators };
