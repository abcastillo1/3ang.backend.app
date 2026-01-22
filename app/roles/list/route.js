import apiResponse from '../../../helpers/response.js';
import authenticate from '../../../middleware/auth.js';
import { validateField } from '../../../helpers/validator.js';
import validateRequest from '../../../middleware/validation.js';
import { Op } from 'sequelize';
import modelsInstance from '../../../models/index.js';

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
  validateRequest,
  authenticate
];

async function handler(req, res, next) {
  const { Role } = modelsInstance.models;
  const { page = 1, limit = 10, search } = req.body.data || {};

  const where = {
    organizationId: req.user.organizationId
  };
  
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } }
    ];
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const total = await Role.count({ where });

  const roles = await Role.findAll({
    where,
    limit: parseInt(limit),
    offset,
    order: [['createdAt', 'DESC']],
    include: [{
      model: modelsInstance.models.Permission,
      as: 'permissions',
      attributes: ['id', 'code', 'description', 'module'],
      through: { attributes: [] }
    }]
  });

  const response = {
    roles: roles.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.permissions.map(p => ({
        id: p.id,
        code: p.code,
        description: p.description,
        module: p.module
      })),
      createdAt: role.createdAt
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
  entity: 'roles'
};

export default listRoute;
export { validators };
