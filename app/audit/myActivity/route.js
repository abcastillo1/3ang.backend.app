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
  validateField('data.action')
    .optional()
    .isString()
    .withMessage('validators.action.invalid'),
  validateField('data.entity')
    .optional()
    .isString()
    .withMessage('validators.entity.invalid'),
  validateRequest,
  authenticate
];

async function handler(req, res, next) {
  const { AuditLog } = modelsInstance.models;
  const { 
    page = 1, 
    limit = 20, 
    action, 
    entity
  } = req.body.data || {};

  const where = {
    organizationId: req.user.organizationId,
    userId: req.user.id
  };

  if (action) {
    where.action = action;
  }

  if (entity) {
    where.entity = entity;
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const total = await AuditLog.count({ where });

  const logs = await AuditLog.findAll({
    where,
    limit: parseInt(limit),
    offset,
    order: [['createdAt', 'DESC']]
  });

  const response = {
    activity: logs.map(log => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      metadata: {
        method: log.metadata?.method,
        path: log.metadata?.path,
        ip: log.metadata?.ip
      },
      createdAt: log.createdAt
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

const myActivityRoute = {
  validators,
  default: handler,
  action: 'view',
  entity: 'audit',
  skipAudit: true
};

export default myActivityRoute;
export { validators };
