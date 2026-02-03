import { validateField } from '../../../../helpers/validator.js';
import apiResponse from '../../../../helpers/response.js';
import validateRequest from '../../../../middleware/validation.js';
import authenticate from '../../../../middleware/auth.js';
import { requirePermission } from '../../../../middleware/permissions.js';
import modelsInstance from '../../../../models/index.js';
import { HTTP_STATUS } from '../../../../config/constants.js';
import { throwError } from '../../../../helpers/errors.js';

const validators = [
  validateField('data.name')
    .notEmpty()
    .withMessage('validators.name.required')
    .isLength({ min: 1, max: 100 })
    .withMessage('validators.name.invalid'),
  validateField('data.description')
    .optional()
    .isString()
    .isLength({ max: 255 })
    .withMessage('validators.description.invalid'),
  validateRequest,
  authenticate,
  requirePermission('inventory.categories.create')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { ProductCategory } = modelsInstance.models;

  const existingCategory = await ProductCategory.findOne({
    where: {
      organizationId: req.user.organizationId,
      name: data.name.trim()
    }
  });

  if (existingCategory) {
    throwError(HTTP_STATUS.CONFLICT, 'inventory.categories.nameExists');
  }

  const categoryData = {
    organizationId: req.user.organizationId,
    name: data.name.trim(),
    description: data.description ? data.description.trim() : null
  };

  const newCategory = await ProductCategory.create(categoryData);

  const response = {
    category: {
      id: newCategory.id,
      organizationId: newCategory.organizationId,
      name: newCategory.name,
      description: newCategory.description,
      createdAt: newCategory.createdAt,
      updatedAt: newCategory.updatedAt
    }
  };

  return apiResponse(res, req, next)(response);
}

const createRoute = {
  validators,
  default: handler,
  action: 'create',
  entity: 'inventory.categories'
};

export default createRoute;
export { validators };
