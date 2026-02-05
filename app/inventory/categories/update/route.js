import { validateField } from '../../../../helpers/validator.js';
import apiResponse from '../../../../helpers/response.js';
import validateRequest from '../../../../middleware/validation.js';
import authenticate from '../../../../middleware/auth.js';
import { requirePermission } from '../../../../middleware/permissions.js';
import modelsInstance from '../../../../models/index.js';
import { HTTP_STATUS } from '../../../../config/constants.js';
import { throwError } from '../../../../helpers/errors.js';
import { Op } from 'sequelize';

const validators = [
  validateField('data.id')
    .notEmpty()
    .withMessage('validators.id.required')
    .isInt({ min: 1 })
    .withMessage('validators.id.invalid'),
  validateField('data.name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('validators.name.invalid'),
  validateField('data.description')
    .optional()
    .isString()
    .isLength({ max: 255 })
    .withMessage('validators.description.invalid'),
  validateRequest,
  authenticate,
  requirePermission('inventory.categories.update')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { ProductCategory } = modelsInstance.models;

  const category = await ProductCategory.findOne({
    where: {
      id: data.id,
      organizationId: req.user.organizationId
    }
  });

  if (!category) {
    throwError(HTTP_STATUS.NOT_FOUND, 'inventory.categories.notFound');
  }

  const updateData = {};

  if (data.name !== undefined) {
    const trimmedName = data.name.trim();
    
    if (trimmedName !== category.name) {
      const existingCategory = await ProductCategory.findOne({
        where: {
          organizationId: req.user.organizationId,
          name: trimmedName,
          id: { [Op.ne]: category.id }
        }
      });

      if (existingCategory) {
        throwError(HTTP_STATUS.CONFLICT, 'inventory.categories.nameExists');
      }

      updateData.name = trimmedName;
    }
  }

  if (data.description !== undefined) {
    updateData.description = data.description ? data.description.trim() : null;
  }

  if (Object.keys(updateData).length > 0) {
    await category.update(updateData);
    await category.reload();
  }

  const response = {
    category: {
      id: category.id,
      organizationId: category.organizationId,
      name: category.name,
      description: category.description,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    }
  };

  return apiResponse(res, req, next)(response);
}

const updateRoute = {
  validators,
  default: handler,
  action: 'update',
  entity: 'inventory.categories'
};

export default updateRoute;
export { validators };
