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
  validateField('data.code')
    .notEmpty()
    .withMessage('validators.animals.code.required')
    .isLength({ max: 50 })
    .withMessage('validators.animals.code.invalid'),
  validateField('data.name')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('validators.animals.name.invalid'),
  validateField('data.speciesId')
    .notEmpty()
    .withMessage('validators.animals.speciesId.required')
    .isInt({ min: 1 })
    .withMessage('validators.animals.speciesId.invalid'),
  validateField('data.establishmentsfkId')
    .notEmpty()
    .withMessage('validators.animals.establishmentId.required')
    .isInt({ min: 1 })
    .withMessage('validators.animals.establishmentId.invalid'),
  validateField('data.sex')
    .notEmpty()
    .withMessage('validators.animals.sex.required')
    .isIn(['Macho', 'Hembra'])
    .withMessage('validators.animals.sex.invalid'),
  validateField('data.breed')
    .optional()
    .isString()
    .isLength({ max: 100 }),
  validateField('data.birthDate')
    .optional()
    .isISO8601()
    .withMessage('validators.date.invalid'),
  validateField('data.fatherId')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('validators.id.invalid'),
  validateField('data.motherId')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('validators.id.invalid'),
  validateField('data.entryDate')
    .notEmpty()
    .withMessage('validators.animals.entryDate.required')
    .isISO8601()
    .withMessage('validators.date.invalid'),
  validateField('data.entryType')
    .notEmpty()
    .withMessage('validators.animals.entryType.required')
    .isIn(['Nacimiento', 'Compra', 'Transferencia'])
    .withMessage('validators.animals.entryType.invalid'),
  validateField('data.image')
    .optional(),
  validateField('data.gallery')
    .optional(),
  validateField('data.color')
    .optional()
    .isString()
    .isLength({ max: 50 }),
  validateField('data.race')
    .optional({ values: 'falsy' })
    .isString()
    .isLength({ max: 50 })
    .withMessage('validators.name.invalid'),
  validateField('data.status')
    .optional()
    .isIn(['Activo', 'Inactivo', 'Vendido', 'Muerto']),
  validateField('data.purpose')
    .optional({ values: 'falsy' })
    .isString()
    .isLength({ max: 50 }),
  validateRequest,
  authenticate,
  requirePermission('animals.create')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { Animal, Species, Establishment } = modelsInstance.models;
  const organizationId = req.user.organizationId;

  const existingAnimal = await Animal.findOne({
    where: {
      code: data.code.trim(),
      organizationfkId: organizationId
    }
  });

  if (existingAnimal) {
    throwError(HTTP_STATUS.CONFLICT, 'animals.codeExists');
  }

  const species = await Species.findByPk(data.speciesId);
  if (!species) {
    throwError(HTTP_STATUS.NOT_FOUND, 'species.notFound');
  }

  const establishment = await Establishment.findOne({
    where: {
      id: data.establishmentsfkId,
      organizationId
    }
  });
  if (!establishment) {
    throwError(HTTP_STATUS.NOT_FOUND, 'establishments.notFound');
  }

  if (data.fatherId) {
    const father = await Animal.findOne({
      where: {
        animalId: data.fatherId,
        organizationfkId: organizationId
      }
    });
    if (!father) {
      throwError(HTTP_STATUS.NOT_FOUND, 'animals.fatherNotFound');
    }
    if (father.sex !== 'Macho') {
      throwError(HTTP_STATUS.BAD_REQUEST, 'animals.fatherMustBeMale');
    }
  }

  if (data.motherId) {
    const mother = await Animal.findOne({
      where: {
        animalId: data.motherId,
        organizationfkId: organizationId
      }
    });
    if (!mother) {
      throwError(HTTP_STATUS.NOT_FOUND, 'animals.motherNotFound');
    }
    if (mother.sex !== 'Hembra') {
      throwError(HTTP_STATUS.BAD_REQUEST, 'animals.motherMustBeFemale');
    }
  }

  const imageValue = data.image == null ? null : (typeof data.image === 'object' ? JSON.stringify(data.image) : String(data.image));
  const galleryValue = data.gallery == null ? null : (Array.isArray(data.gallery) ? JSON.stringify(data.gallery) : typeof data.gallery === 'string' ? data.gallery : null);

  const animalData = {
    code: data.code.trim(),
    name: data.name?.trim() || null,
    speciesId: data.speciesId,
    organizationfkId: organizationId,
    establishmentsfkId: data.establishmentsfkId,
    sex: data.sex,
    breed: data.breed?.trim() || null,
    birthDate: data.birthDate || null,
    fatherId: data.fatherId || null,
    motherId: data.motherId || null,
    entryDate: data.entryDate,
    entryType: data.entryType,
    image: imageValue,
    gallery: galleryValue,
    color: data.color?.trim() || null,
    race: data.race?.trim() || null,
    status: data.status || 'Activo',
    purpose: data.purpose?.trim() || null
  };

  const newAnimal = await Animal.create(animalData);

  const response = {
    animal: buildAnimalResponse(newAnimal)
  };

  return apiResponse(res, req, next)(response);
}

function buildAnimalResponse(animal) {
  return {
    animalId: animal.animalId,
    code: animal.code,
    name: animal.name,
    speciesId: animal.speciesId,
    organizationfkId: animal.organizationfkId,
    establishmentsfkId: animal.establishmentsfkId,
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
  };
}

const createRoute = {
  validators,
  default: handler,
  action: 'create',
  entity: 'animals'
};

export default createRoute;
export { validators };
