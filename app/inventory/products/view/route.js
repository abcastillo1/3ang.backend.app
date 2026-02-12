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
  validateRequest,
  authenticate,
  requirePermission('inventory.products.view')
];

async function handler(req, res, next) {
  const { InventoryProduct, ProductCategory } = modelsInstance.models;
  const { id } = req.body.data;

  try {
    const product = await InventoryProduct.findOne({
      where: {
        id,
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
      return res.status(404).json({
        message: 'inventory.products.notFound'
      });
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
      }
    };

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
