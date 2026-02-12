import { validateField } from '../../../../helpers/validator.js';
import apiResponse from '../../../../helpers/response.js';
import validateRequest from '../../../../middleware/validation.js';
import authenticate from '../../../../middleware/auth.js';
import { requirePermission } from '../../../../middleware/permissions.js';
import validateProductCreation from '../../../../middleware/inventory/validateProductCreation.js';
import validateProductImages from '../../../../middleware/inventory/validateProductImages.js';
import { parseProductImages } from '../../../../helpers/inventory.js';
import modelsInstance from '../../../../models/index.js';

const validators = [
  validateField('data.name')
    .notEmpty()
    .withMessage('validators.name.required')
    .isLength({ min: 1, max: 255 })
    .withMessage('validators.name.invalid'),
  validateField('data.unitOfMeasure')
    .notEmpty()
    .withMessage('validators.unitOfMeasure.required')
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
    .withMessage('validators.image.invalid'),
  validateField('data.gallery')
    .optional()
    .withMessage('validators.gallery.invalid'),
  validateField('data.isActive')
    .optional()
    .isBoolean()
    .withMessage('validators.isActive.invalid'),
  validateRequest,
  authenticate,
  requirePermission('inventory.products.create'),
  validateProductImages,
  validateProductCreation
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { InventoryProduct, ProductCategory } = modelsInstance.models;

  const productData = {
    organizationId: req.user.organizationId,
    categoryId: data.categoryId || null,
    name: data.name,
    sku: data.sku || null,
    description: data.description || null,
    image: data.image != null ? JSON.stringify(data.image) : null,
    gallery: data.gallery != null && Array.isArray(data.gallery) ? JSON.stringify(data.gallery) : null,
    unitOfMeasure: data.unitOfMeasure,
    isActive: data.isActive !== undefined ? data.isActive : true
  };

  const newProduct = await InventoryProduct.create(productData);

  const productWithRelations = await InventoryProduct.findByPk(newProduct.id, {
    include: [{
      model: ProductCategory,
      as: 'category',
      attributes: ['id', 'name', 'description']
    }]
  });

  const { image, gallery } = parseProductImages(productWithRelations);

  const response = {
    product: {
      id: productWithRelations.id,
      organizationId: productWithRelations.organizationId,
      name: productWithRelations.name,
      sku: productWithRelations.sku,
      description: productWithRelations.description,
      image,
      gallery,
      unitOfMeasure: productWithRelations.unitOfMeasure,
      isActive: productWithRelations.isActive,
      createdAt: productWithRelations.createdAt,
      updatedAt: productWithRelations.updatedAt,
      category: productWithRelations.category
        ? {
            id: productWithRelations.category.id,
            name: productWithRelations.category.name,
            description: productWithRelations.category.description
          }
        : null
    }
  };

  return apiResponse(res, req, next)(response);
}

const createRoute = {
  validators,
  default: handler,
  action: 'create',
  entity: 'inventory.products'
};

export default createRoute;
export { validators };
