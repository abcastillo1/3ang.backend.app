import apiResponse from '../../../../helpers/response.js';
import authenticate from '../../../../middleware/auth.js';
import { requirePermission } from '../../../../middleware/permissions.js';
import { validateField } from '../../../../helpers/validator.js';
import validateRequest from '../../../../middleware/validation.js';
import { parseProductImages } from '../../../../helpers/inventory.js';
import modelsInstance from '../../../../models/index.js';

const validators = [
  validateField('data.id')
    .notEmpty()
    .withMessage('validators.product.id.required')
    .isInt({ min: 1 })
    .withMessage('validators.product.id.invalid'),
  validateField('data.establishmentId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('validators.establishmentId.invalid'),
  validateRequest,
  authenticate,
  requirePermission('inventory.products.view')
];

async function handler(req, res, next) {
  const { InventoryProduct, ProductCategory, InventoryBatch } = modelsInstance.models;
  const { id, establishmentId } = req.body.data;

  try {
    const includeBatch = establishmentId != null;
    const includeOpts = [{
      model: ProductCategory,
      as: 'category',
      attributes: ['id', 'name', 'description'],
      required: false
    }];

    if (includeBatch) {
      includeOpts.push({
        model: InventoryBatch,
        as: 'batches',
        required: false,
        where: { establishmentId },
        attributes: ['id', 'batchCode', 'currentQuantity', 'unitCost', 'manufacturingDate', 'expirationDate', 'registrationDate'],
        separate: true
      });
    }

    const product = await InventoryProduct.findOne({
      where: {
        id,
        organizationId: req.user.organizationId
      },
      include: includeOpts
    });

    if (!product) {
      return res.status(404).json({
        message: 'inventory.products.notFound'
      });
    }

    const { image, gallery } = parseProductImages(product);

    const productObj = {
      id: product.id,
      organizationId: product.organizationId,
      name: product.name,
      sku: product.sku,
      description: product.description,
      image,
      gallery,
      unitOfMeasure: product.unitOfMeasure,
      generalPrice: product.generalPrice != null ? parseFloat(product.generalPrice) : null,
      costPrice: product.costPrice != null ? parseFloat(product.costPrice) : null,
      ivaType: product.ivaType,
      minimumPrice: product.minimumPrice != null ? parseFloat(product.minimumPrice) : null,
      minStockLevel: product.minStockLevel != null ? parseFloat(product.minStockLevel) : null,
      batchActive: !!product.batchActive,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
            description: product.category.description
          }
        : null
    };

    if (includeBatch && product.batches) {
      productObj.batches = product.batches.map((b) => ({
        id: b.id,
        batchCode: b.batchCode,
        currentQuantity: parseFloat(b.currentQuantity),
        unitCost: b.unitCost != null ? parseFloat(b.unitCost) : null,
        manufacturingDate: b.manufacturingDate,
        expirationDate: b.expirationDate,
        registrationDate: b.registrationDate
      }));
    }

    const response = { product: productObj };
    return apiResponse(res, req, next)(response);
  } catch (error) {
    next(error);
  }
}

const viewRoute = {
  validators,
  default: handler,
  action: 'view',
  entity: 'inventory.products'
};

export default viewRoute;
export { validators };
