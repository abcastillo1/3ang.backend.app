import { validateField } from '../../../helpers/validator.js';
import apiResponse from '../../../helpers/response.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import modelsInstance from '../../../models/index.js';
import { HTTP_STATUS } from '../../../config/constants.js';
import { throwError } from '../../../helpers/errors.js';

const validators = [
  validateField('data.name')
    .notEmpty()
    .withMessage('validators.name.required')
    .isLength({ min: 1, max: 100 })
    .withMessage('validators.name.invalid'),
  validateField('data.active')
    .optional()
    .isBoolean()
    .withMessage('validators.isActive.invalid'),
  validateRequest,
  authenticate,
  requirePermission('species.create')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { Species } = modelsInstance.models;

  const existingSpecies = await Species.findOne({
    where: { name: data.name.trim() }
  });

  if (existingSpecies) {
    throwError(HTTP_STATUS.CONFLICT, 'species.nameExists');
  }

  const speciesData = {
    name: data.name.trim(),
    active: data.active !== undefined ? data.active : true
  };

  const newSpecies = await Species.create(speciesData);

  const response = {
    species: {
      speciesId: newSpecies.speciesId,
      name: newSpecies.name,
      active: newSpecies.active
    }
  };

  return apiResponse(res, req, next)(response);
}

const createRoute = {
  validators,
  default: handler,
  action: 'create',
  entity: 'species'
};

export default createRoute;
export { validators };
