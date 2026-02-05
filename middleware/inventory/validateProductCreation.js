import { HTTP_STATUS } from '../../config/constants.js';
import { throwError } from '../../helpers/errors.js';
import modelsInstance from '../../models/index.js';

export default async function validateProductCreation(req, res, next) {
  const { data } = req.body;
  const { ProductCategory } = modelsInstance.models;

  if (data.categoryId) {
    if (!Number.isInteger(data.categoryId) || data.categoryId < 1) {
      throwError(HTTP_STATUS.BAD_REQUEST, 'validators.categoryId.invalid');
    }

    const category = await ProductCategory.findOne({
      where: {
        id: data.categoryId,
        organizationId: req.user.organizationId
      }
    });

    if (!category) {
      throwError(HTTP_STATUS.NOT_FOUND, 'inventory.categories.notFound');
    }
  }

  next();
}
