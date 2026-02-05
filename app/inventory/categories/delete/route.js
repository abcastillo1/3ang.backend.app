import { validateField } from '../../../../helpers/validator.js';
import apiResponse from '../../../../helpers/response.js';
import validateRequest from '../../../../middleware/validation.js';
import authenticate from '../../../../middleware/auth.js';
import { requirePermission } from '../../../../middleware/permissions.js';
import modelsInstance from '../../../../models/index.js';
import { HTTP_STATUS } from '../../../../config/constants.js';
import { throwError } from '../../../../helpers/errors.js';

const validators = [
  validateField('data.id')
    .notEmpty()
    .withMessage('validators.id.required')
    .isInt({ min: 1 })
    .withMessage('validators.id.invalid'),
  validateRequest,
  authenticate,
  requirePermission('inventory.categories.update')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { ProductCategory, InventoryProduct } = modelsInstance.models;

  const category = await ProductCategory.findOne({
    where: {
      id: data.id,
      organizationId: req.user.organizationId
    }
  });

  if (!category) {
    throwError(HTTP_STATUS.NOT_FOUND, 'inventory.categories.notFound');
  }

  const productsCount = await InventoryProduct.count({
    where: {
      categoryId: category.id,
      organizationId: req.user.organizationId
    }
  });

  if (productsCount > 0) {
    throwError(HTTP_STATUS.CONFLICT, 'inventory.categories.hasProducts');
  }

  await category.destroy();

  const response = {
    message: 'Category deleted successfully'
  };

  return apiResponse(res, req, next)(response);
}

const deleteRoute = {
  validators,
  default: handler,
  action: 'delete',
  entity: 'inventory.categories'
};

export default deleteRoute;
export { validators };
