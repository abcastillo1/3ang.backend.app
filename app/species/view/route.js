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
  requirePermission('species.view')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { Species } = modelsInstance.models;

  const species = await Species.findByPk(data.speciesId);

  if (!species) {
    throwError(HTTP_STATUS.NOT_FOUND, 'species.notFound');
  }

  const response = {
    species: {
      speciesId: species.speciesId,
      name: species.name,
      active: species.active
    }
  };

  return apiResponse(res, req, next)(response);
}

const viewRoute = {
  validators,
  default: handler,
  action: 'view',
  entity: 'species'
};

export default viewRoute;
export { validators };
