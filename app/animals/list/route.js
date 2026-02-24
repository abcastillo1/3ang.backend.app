import { validateField } from '../../../helpers/validator.js';
import apiResponse from '../../../helpers/response.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import modelsInstance from '../../../models/index.js';
import { Op } from 'sequelize';

const validators = [
  validateField('data.page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('validators.page.invalid'),
  validateField('data.limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('validators.limit.invalid'),
  validateField('data.search')
    .optional()
    .isString()
    .withMessage('validators.search.invalid'),
  validateField('data.speciesId')
    .optional()
    .isInt({ min: 1 }),
  validateField('data.establishmentsfkId')
    .optional()
    .isInt({ min: 1 }),
  validateField('data.sex')
    .optional()
    .isIn(['Macho', 'Hembra']),
  validateField('data.status')
    .optional()
    .isIn(['Activo', 'Inactivo', 'Vendido', 'Muerto']),
  validateRequest,
  authenticate,
  requirePermission('animals.view')
];

async function handler(req, res, next) {
  const { Animal } = modelsInstance.models;
  const { page = 1, limit = 10, search, speciesId, establishmentsfkId, sex, status } = req.body.data || {};
  const organizationId = req.user.organizationId;

  const where = {
    organizationfkId: organizationId
  };

  if (search) {
    where[Op.or] = [
      { code: { [Op.like]: `%${search}%` } },
      { name: { [Op.like]: `%${search}%` } },
      { breed: { [Op.like]: `%${search}%` } }
    ];
  }
  if (speciesId) where.speciesId = speciesId;
  if (establishmentsfkId) where.establishmentsfkId = establishmentsfkId;
  if (sex) where.sex = sex;
  if (status) where.status = status;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const total = await Animal.count({ where });

  const animals = await Animal.findAll({
    where,
    limit: parseInt(limit),
    offset,
    order: [['animalId', 'DESC']],
    include: [
      { association: 'species', attributes: ['speciesId', 'name'] }
    ]
  });

  const response = {
    animals: animals.map(a => ({
      animalId: a.animalId,
      code: a.code,
      name: a.name,
      speciesId: a.speciesId,
      species: a.species ? { speciesId: a.species.speciesId, name: a.species.name } : null,
      establishmentsfkId: a.establishmentsfkId,
      sex: a.sex,
      breed: a.breed,
      birthDate: a.birthDate,
      entryDate: a.entryDate,
      entryType: a.entryType,
      status: a.status,
      purpose: a.purpose,
      color: a.color,
      race: a.race,
      createdAt: a.createdAt
    })),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit))
    }
  };

  return apiResponse(res, req, next)(response);
}

const listRoute = {
  validators,
  default: handler,
  action: 'list',
  entity: 'animals'
};

export default listRoute;
export { validators };
