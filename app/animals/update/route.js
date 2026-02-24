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
  validateField('data.animalId')
    .notEmpty()
    .withMessage('validators.id.required')
    .isInt({ min: 1 })
    .withMessage('validators.id.invalid'),
  validateField('data.code')
    .optional()
    .isString()
    .isLength({ max: 50 }),
  validateField('data.name')
    .optional()
    .isString()
    .isLength({ max: 100 }),
  validateField('data.speciesId')
    .optional()
    .isInt({ min: 1 }),
  validateField('data.establishmentsfkId')
    .optional()
    .isInt({ min: 1 }),
  validateField('data.sex')
    .optional()
    .isIn(['Macho', 'Hembra']),
  validateField('data.breed')
    .optional()
    .isString()
    .isLength({ max: 100 }),
  validateField('data.birthDate')
    .optional()
    .isISO8601(),
  validateField('data.fatherId')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('validators.id.invalid'),
  validateField('data.motherId')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('validators.id.invalid'),
  validateField('data.entryDate')
    .optional()
    .isISO8601(),
  validateField('data.entryType')
    .optional()
    .isIn(['Nacimiento', 'Compra', 'Transferencia']),
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
  requirePermission('animals.update')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { Animal, Species, Establishment } = modelsInstance.models;
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

  if (data.code) {
    const existingAnimal = await Animal.findOne({
      where: {
        code: data.code.trim(),
        organizationfkId: organizationId,
        animalId: { [Op.ne]: data.animalId }
      }
    });
    if (existingAnimal) {
      throwError(HTTP_STATUS.CONFLICT, 'animals.codeExists');
    }
  }

  if (data.speciesId) {
    const species = await Species.findByPk(data.speciesId);
    if (!species) {
      throwError(HTTP_STATUS.NOT_FOUND, 'species.notFound');
    }
  }

  if (data.establishmentsfkId) {
    const establishment = await Establishment.findOne({
      where: {
        id: data.establishmentsfkId,
        organizationId
      }
    });
    if (!establishment) {
      throwError(HTTP_STATUS.NOT_FOUND, 'establishments.notFound');
    }
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
    if (father.animalId === data.animalId) {
      throwError(HTTP_STATUS.BAD_REQUEST, 'animals.cannotBeOwnParent');
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
    if (mother.animalId === data.animalId) {
      throwError(HTTP_STATUS.BAD_REQUEST, 'animals.cannotBeOwnParent');
    }
  }

  const updateData = {};
  const allowedFields = [
    'code', 'name', 'speciesId', 'establishmentsfkId', 'sex', 'breed',
    'birthDate', 'fatherId', 'motherId', 'entryDate', 'entryType',
    'color', 'race', 'status', 'purpose'
  ];
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updateData[field] = typeof data[field] === 'string' ? data[field].trim() || null : data[field];
    }
  }
  if (data.image !== undefined) {
    updateData.image = data.image == null ? null : (typeof data.image === 'object' ? JSON.stringify(data.image) : String(data.image));
  }
  if (data.gallery !== undefined) {
    updateData.gallery = data.gallery == null ? null : (Array.isArray(data.gallery) ? JSON.stringify(data.gallery) : typeof data.gallery === 'string' ? data.gallery : null);
  }

  if (Object.keys(updateData).length > 0) {
    await animal.update(updateData);
    await animal.reload();
  }

  const response = {
    animal: buildAnimalResponse(animal)
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

const updateRoute = {
  validators,
  default: handler,
  action: 'update',
  entity: 'animals'
};

export default updateRoute;
export { validators };
