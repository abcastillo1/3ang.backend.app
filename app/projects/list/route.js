import { validateField } from '../../../helpers/validator.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import apiResponse from '../../../helpers/response.js';
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
  validateField('data.clientId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('validators.clientId.invalid'),
  validateField('data.status')
    .optional()
    .isIn(['draft', 'planning', 'in_progress', 'review', 'closed'])
    .withMessage('validators.status.invalid'),
  validateField('data.search')
    .optional()
    .isString()
    .withMessage('validators.search.invalid'),
  validateRequest,
  authenticate,
  requirePermission('projects.view')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { AuditProject, Client } = modelsInstance.models;

  const page = parseInt(data.page) || 1;
  const limit = parseInt(data.limit) || 20;
  const offset = (page - 1) * limit;

  const where = { organizationId: user.organizationId };

  if (data.clientId) where.clientId = data.clientId;
  if (data.status) where.status = data.status;
  if (data.search) {
    where.name = { [Op.like]: `%${data.search}%` };
  }

  const total = await AuditProject.count({ where });

  const projects = await AuditProject.findAll({
    where,
    limit,
    offset,
    order: [['createdAt', 'DESC']],
    include: [
      { model: Client, as: 'client', attributes: ['id', 'name', 'ruc'] }
    ],
    attributes: ['id', 'name', 'auditType', 'periodStart', 'periodEnd', 'status', 'clientId', 'createdAt']
  });

  return apiResponse(res, req, next)({
    projects,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
}

const listRoute = {
  validators,
  default: handler,
  action: 'list',
  entity: 'projects'
};

export default listRoute;
export { validators };
