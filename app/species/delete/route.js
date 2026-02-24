import { validateField } from '../../../helpers/validator.js';
import apiResponse from '../../../helpers/response.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import modelsInstance from '../../../models/index.js';
import { HTTP_STATUS } from '../../../config/constants.js';
import { throwError } from '../../../helpers/errors.js';

const validators = [
  validateField('data.speciesId')
    .notEmpty()
    .withMessage('validators.id.required')
    .isInt({ min: 1 })
    .withMessage('validators.id.invalid'),
  validateRequest,
  authenticate,
  requirePermission('species.delete')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { Species, Animal } = modelsInstance.models;

  const species = await Species.findByPk(data.speciesId);

  if (!species) {
    throwError(HTTP_STATUS.NOT_FOUND, 'species.notFound');
  }

  const animalsCount = await Animal.count({
    where: { speciesId: species.speciesId }
  });

  if (animalsCount > 0) {
    throwError(HTTP_STATUS.CONFLICT, 'species.hasAnimals');
  }

  await species.destroy();

  const response = {
    message: 'Species deleted successfully'
  };

  return apiResponse(res, req, next)(response);
}

const deleteRoute = {
  validators,
  default: handler,
  action: 'delete',
  entity: 'species'
};

export default deleteRoute;
export { validators };
