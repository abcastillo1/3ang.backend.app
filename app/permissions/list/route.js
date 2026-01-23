import apiResponse from '../../../helpers/response.js';
import authenticate from '../../../middleware/auth.js';
import { validateField } from '../../../helpers/validator.js';
import validateRequest from '../../../middleware/validation.js';
import { Op } from 'sequelize';
import modelsInstance from '../../../models/index.js';

const validators = [
  validateField('data.module')
    .optional()
    .isString()
    .withMessage('validators.module.invalid'),
  validateRequest,
  authenticate
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { Permission } = modelsInstance.models;

  const where = {};
  
  if (data.module) {
    where.module = data.module;
  }

  const permissions = await Permission.findAll({
    where,
    order: [['module', 'ASC'], ['code', 'ASC']]
  });

  const response = {
    permissions: permissions.map(p => ({
      id: p.id,
      code: p.code,
      description: p.description,
      module: p.module
    }))
  };

  return apiResponse(res, req, next)(response);
}

const listRoute = {
  validators,
  default: handler,
  action: 'list',
  entity: 'permissions'
};

export default listRoute;
export { validators };
