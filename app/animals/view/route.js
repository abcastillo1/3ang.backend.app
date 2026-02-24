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
  requirePermission('animals.view')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { Animal } = modelsInstance.models;
  const organizationId = req.user.organizationId;

  const animal = await Animal.findOne({
    where: {
      animalId: data.animalId,
      organizationfkId: organizationId
    },
    include: [
      { association: 'species', attributes: ['speciesId', 'name'] },
      { association: 'establishment', attributes: ['id', 'name'] }
    ]
  });

  if (!animal) {
    throwError(HTTP_STATUS.NOT_FOUND, 'animals.notFound');
  }

  const response = {
    animal: {
      animalId: animal.animalId,
      code: animal.code,
      name: animal.name,
      speciesId: animal.speciesId,
      species: animal.species ? { speciesId: animal.species.speciesId, name: animal.species.name } : null,
      organizationfkId: animal.organizationfkId,
      establishmentsfkId: animal.establishmentsfkId,
      establishment: animal.establishment ? { id: animal.establishment.id, name: animal.establishment.name } : null,
      sex: animal.sex,
      breed: animal.breed,
      birthDate: animal.birthDate,
      fatherId: animal.fatherId,
      motherId: animal.motherId,
      entryDate: animal.entryDate,
      entryType: animal.entryType,
      image: animal.image,
      gallery: animal.gallery,
      color: animal.color,
      race: animal.race,
      status: animal.status,
      purpose: animal.purpose,
      createdAt: animal.createdAt,
      updatedAt: animal.updatedAt
    }
  };

  return apiResponse(res, req, next)(response);
}

const viewRoute = {
  validators,
  default: handler,
  action: 'view',
  entity: 'animals'
};

export default viewRoute;
export { validators };
