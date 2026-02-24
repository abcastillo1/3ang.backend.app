import { validateField } from '../../../helpers/validator.js';
import apiResponse from '../../../helpers/response.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import modelsInstance from '../../../models/index.js';
import { HTTP_STATUS } from '../../../config/constants.js';
import { throwError } from '../../../helpers/errors.js';
import { Op } from 'sequelize';

const validators = [
  validateField('data.speciesId')
    .notEmpty()
    .withMessage('validators.id.required')
    .isInt({ min: 1 })
    .withMessage('validators.id.invalid'),
  validateField('data.name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('validators.name.invalid'),
  validateField('data.active')
    .optional()
    .isBoolean()
    .withMessage('validators.isActive.invalid'),
  validateRequest,
  authenticate,
  requirePermission('species.update')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { Species } = modelsInstance.models;

  const species = await Species.findByPk(data.speciesId);

  if (!species) {
    throwError(HTTP_STATUS.NOT_FOUND, 'species.notFound');
  }

  const updateData = {};

  if (data.name !== undefined) {
    const trimmedName = data.name.trim();
    if (trimmedName !== species.name) {
      const existingSpecies = await Species.findOne({
        where: {
          name: trimmedName,
          speciesId: { [Op.ne]: species.speciesId }
        }
      });
      if (existingSpecies) {
        throwError(HTTP_STATUS.CONFLICT, 'species.nameExists');
      }
      updateData.name = trimmedName;
    }
  }

  if (data.active !== undefined) {
    updateData.active = data.active;
  }

  if (Object.keys(updateData).length > 0) {
    await species.update(updateData);
    await species.reload();
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

const updateRoute = {
  validators,
  default: handler,
  action: 'update',
  entity: 'species'
};

export default updateRoute;
export { validators };
