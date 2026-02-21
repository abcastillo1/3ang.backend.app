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
  validateField('data.productId')
    .notEmpty()
    .withMessage('validators.product.id.required')
    .isInt({ min: 1 })
    .withMessage('validators.product.id.invalid'),
  validateField('data.establishmentId')
    .notEmpty()
    .withMessage('validators.establishmentId.required')
    .isInt({ min: 1 })
    .withMessage('validators.establishmentId.invalid'),
  validateRequest,
  authenticate,
  requirePermission('inventory.stock.update')
];

/**
 * Info del producto para el módulo de stock (entradas/salidas).
 * - Producto nuevo en el establecimiento (sin stock): currentStock 0, batches [].
 * - Producto con stock y batchActive: devuelve lotes del establecimiento indicado.
 */
async function handler(req, res, next) {
  const { data } = req.body;
  const { InventoryProduct, InventoryStock, InventoryBatch, ProductCategory, Establishment } = modelsInstance.models;

  const establishment = await Establishment.findOne({
    where: { id: data.establishmentId, organizationId: req.user.organizationId }
  });
  if (!establishment) {
    throwError(HTTP_STATUS.NOT_FOUND, 'establishments.notFound');
  }

  const product = await InventoryProduct.findOne({
    where: { id: data.productId, organizationId: req.user.organizationId },
    include: [{ model: ProductCategory, as: 'category', attributes: ['id', 'name'], required: false }]
  });
  if (!product) {
    throwError(HTTP_STATUS.NOT_FOUND, 'inventory.products.notFound');
  }

  const stockRow = await InventoryStock.findOne({
    where: { establishmentId: data.establishmentId, productId: data.productId }
  });

  const currentStock = stockRow ? parseFloat(stockRow.currentStock) : 0;
  const minStockLevel = stockRow?.minStockLevel != null ? parseFloat(stockRow.minStockLevel) : (product.minStockLevel != null ? parseFloat(product.minStockLevel) : 0);

  let batches = [];
  const batchActive = !!product.batchActive;

  if (batchActive && stockRow) {
    const batchRows = await InventoryBatch.findAll({
      where: {
        establishmentId: data.establishmentId,
        productId: data.productId,
        currentQuantity: { [Op.gt]: 0 }
      },
      order: [['expirationDate', 'ASC']],
      attributes: ['id', 'batchCode', 'currentQuantity', 'manufacturingDate', 'expirationDate', 'unitCost']
    });
    batches = batchRows.map((b) => ({
      batchId: b.id,
      batchCode: b.batchCode,
      currentQuantity: parseFloat(b.currentQuantity),
      manufacturingDate: b.manufacturingDate ?? null,
      expirationDate: b.expirationDate ?? null,
      unitCost: b.unitCost != null ? parseFloat(b.unitCost) : null
    }));
  }

  const response = {
    product: {
      id: product.id,
      name: product.name,
      sku: product.sku,
      unitOfMeasure: product.unitOfMeasure,
      batchActive,
      generalPrice: product.generalPrice != null ? parseFloat(product.generalPrice) : null,
      costPrice: product.costPrice != null ? parseFloat(product.costPrice) : null,
      ivaType: product.ivaType ?? null,
      minimumPrice: product.minimumPrice != null ? parseFloat(product.minimumPrice) : null,
      category: product.category ? { id: product.category.id, name: product.category.name } : null
    },
    establishmentId: data.establishmentId,
    currentStock,
    minStockLevel,
    batches
  };

  return apiResponse(res, req, next)(response);
}

const productInfoRoute = {
  validators,
  default: handler,
  action: 'productInfo',
  entity: 'inventory.stock'
};

export default productInfoRoute;
export { validators };
