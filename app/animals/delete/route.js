import { validateField } from '../../../helpers/validator.js';
import apiResponse from '../../../helpers/response.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import modelsInstance from '../../../models/index.js';
import { HTTP_STATUS } from '../../../config/constants.js';
import { throwError } from '../../../helpers/errors.js';

const validators = [
  validateField('data.animalId')
    .notEmpty()
    .withMessage('validators.id.required')
    .isInt({ min: 1 })
    .withMessage('validators.id.invalid'),
  validateRequest,
  authenticate,
  requirePermission('animals.delete')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { Animal } = modelsInstance.models;
  const organizationId = req.user.organizationId;

  const animal = await Animal.findOne({
    where: {
      animalId: data.animalId,
      organizationfkId: organizationId
    }
  });

  if (!animal) {
    throwError(HTTP_STATUS.NOT_FOUND, 'animals.notFound');
  }

  const fatherCount = await Animal.count({
    where: { fatherId: animal.animalId }
  });
  const motherCount = await Animal.count({
    where: { motherId: animal.animalId }
  });
  if (fatherCount > 0 || motherCount > 0) {
    throwError(HTTP_STATUS.CONFLICT, 'animals.hasChildren');
  }

  await animal.destroy();

  const response = {
    message: 'Animal deleted successfully'
  };

  return apiResponse(res, req, next)(response);
}

const deleteRoute = {
  validators,
  default: handler,
  action: 'delete',
  entity: 'animals'
};

export default deleteRoute;
export { validators };
