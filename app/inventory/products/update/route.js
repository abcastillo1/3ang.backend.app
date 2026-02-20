import { validateField } from '../../../../helpers/validator.js';
import apiResponse from '../../../../helpers/response.js';
import validateRequest from '../../../../middleware/validation.js';
import authenticate from '../../../../middleware/auth.js';
import { requirePermission } from '../../../../middleware/permissions.js';
import validateProductCreation from '../../../../middleware/inventory/validateProductCreation.js';
import validateProductImages from '../../../../middleware/inventory/validateProductImages.js';
import { parseProductImages } from '../../../../helpers/inventory.js';
import modelsInstance from '../../../../models/index.js';
import { HTTP_STATUS } from '../../../../config/constants.js';
import { throwError } from '../../../../helpers/errors.js';

const validators = [
  validateField('data.id')
    .notEmpty()
    .withMessage('validators.product.id.required')
    .isInt({ min: 1 })
    .withMessage('validators.product.id.invalid'),
  validateField('data.name')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('validators.name.invalid'),
  validateField('data.unitOfMeasure')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('validators.unitOfMeasure.invalid'),
  validateField('data.categoryId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('validators.categoryId.invalid'),
  validateField('data.sku')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('validators.sku.invalid'),
  validateField('data.description')
    .optional()
    .isString()
    .withMessage('validators.description.invalid'),
  validateField('data.image')
    .optional()
    .isObject()
    .withMessage('validators.image.invalid'),
  validateField('data.gallery')
    .optional()
    .isArray()
    .withMessage('validators.gallery.invalid'),
  validateField('data.isActive')
    .optional()
    .isBoolean()
    .withMessage('validators.isActive.invalid'),
  validateField('data.batchActive')
    .optional()
    .isBoolean()
    .withMessage('validators.batchActive.invalid'),
  validateField('data.generalPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('validators.generalPrice.invalid'),
  validateField('data.costPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('validators.costPrice.invalid'),
  validateField('data.ivaType')
    .optional()
    .isString()
    .isLength({ max: 10 })
    .withMessage('validators.ivaType.invalid'),
  validateField('data.minimumPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('validators.minimumPrice.invalid'),
  validateField('data.minStockLevel')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('validators.minStockLevel.invalid'),
  validateRequest,
  authenticate,
  requirePermission('inventory.products.update'),
  validateProductImages,
  validateProductCreation
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { InventoryProduct, ProductCategory } = modelsInstance.models;

  const product = await InventoryProduct.findOne({
    where: {
      id: data.id,
      organizationId: req.user.organizationId
    },
    include: [{
      model: ProductCategory,
      as: 'category',
      attributes: ['id', 'name', 'description'],
      required: false
    }]
  });

  if (!product) {
    throwError(HTTP_STATUS.NOT_FOUND, 'inventory.products.notFound');
  }

  const updateData = {};

  const fields = [
    'name', 'sku', 'description', 'image', 'gallery', 'unitOfMeasure',
    'generalPrice', 'costPrice', 'ivaType', 'minimumPrice', 'minStockLevel',
    'batchActive', 'isActive', 'categoryId'
  ];

  for (const field of fields) {
    if (data[field] === undefined) continue;
    if (field === 'categoryId') {
      updateData.categoryId = data.categoryId || null;
    } else if (field === 'generalPrice' || field === 'costPrice' || field === 'minimumPrice' || field === 'minStockLevel') {
      updateData[field] = data[field] != null ? parseFloat(data[field]) : null;
    } else if (field === 'batchActive') {
      updateData.batchActive = data.batchActive === true;
    } else {
      updateData[field] = data[field];
    }
  }

  if (Object.keys(updateData).length > 0) {
    await product.update(updateData);
    await product.reload({ include: [{ model: ProductCategory, as: 'category', attributes: ['id', 'name', 'description'], required: false }] });
  }

  const { image, gallery } = parseProductImages(product);

  const response = {
    product: {
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
        ? { id: product.category.id, name: product.category.name, description: product.category.description }
        : null
    }
  };

  return apiResponse(res, req, next)(response);
}

const updateRoute = {
  validators,
  default: handler,
  action: 'update',
  entity: 'inventory.products'
};

export default updateRoute;
export { validators };
