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
  const { User } = modelsInstance.models;
  const { page = 1, limit = 10, search } = req.body.data || {};

  const where = {
    organizationId: req.user.organizationId,
    id: { [Op.ne]: req.user.id }
  };
  
  if (search) {
    where[Op.or] = [
      { email: { [Op.like]: `%${search}%` } },
      { fullName: { [Op.like]: `%${search}%` } }
    ];
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const total = await User.count({ where });

  const users = await User.findAll({
    where,
    limit: parseInt(limit),
    offset,
    order: [['createdAt', 'DESC']],
    attributes: { exclude: ['passwordHash'] }
  });

  const response = {
    users: users.map(user => user.toPublicJSON()),
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
  default: handler
};

export default listRoute;
export { validators };
