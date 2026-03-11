import { validateField } from '../../../../helpers/validator.js';
import validateRequest from '../../../../middleware/validation.js';
import authenticate from '../../../../middleware/auth.js';
import { requirePermission } from '../../../../middleware/permissions.js';
import apiResponse from '../../../../helpers/response.js';
import { throwError } from '../../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../../config/constants.js';
import modelsInstance from '../../../../models/index.js';
import { getActivityDescription } from '../../../../middleware/i18n.js';

const validators = [
  validateField('data.page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('validators.page.invalid'),
  validateField('data.limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('validators.limit.invalid'),
  validateField('data.auditProjectId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('validators.auditProjectId.invalid'),
  validateField('data.userId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('validators.userId.invalid'),
  validateField('data.action')
    .optional()
    .isString()
    .withMessage('validators.action.invalid'),
  validateField('data.entity')
    .optional()
    .isString()
    .withMessage('validators.entity.invalid'),
  validateField('data.locale')
    .optional()
    .isString()
    .isLength({ max: 10 })
    .withMessage('validators.locale.invalid'),
  validateRequest,
  authenticate,
  requirePermission('activity.view')
];

async function handler(req, res, next) {
  const { data = {} } = req.body;
  const { page = 1, limit = 20, auditProjectId, userId, action, entity, locale } = data;
  const { user } = req;
  const requestLocale = locale || req.get('Accept-Language') || 'es';
  const { ActivityLog, AuditProject, User } = modelsInstance.models;

  const where = { organizationId: user.organizationId };

  if (auditProjectId) {
    const project = await AuditProject.findOne({
      where: { id: auditProjectId, organizationId: user.organizationId }
    });
    if (!project) {
      throw throwError(HTTP_STATUS.NOT_FOUND, 'projects.notFound');
    }
    where.auditProjectId = auditProjectId;
  }

  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (entity) where.entity = entity;

  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const limitNum = parseInt(limit, 10);

  const total = await ActivityLog.count({ where });

  const logs = await ActivityLog.findAll({
    where,
    limit: limitNum,
    offset,
    order: [['createdAt', 'DESC']],
    include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'email'] }]
  });

  const response = {
    activity: logs.map(log => ({
      id: log.id,
      userId: log.userId,
      userFullName: log.user?.fullName ?? null,
      userEmail: log.user?.email ?? null,
      auditProjectId: log.auditProjectId,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      description: getActivityDescription(log.description, log.metadata, requestLocale),
      descriptionKey: log.description,
      metadata: log.metadata,
      createdAt: log.createdAt
    })),
    pagination: {
      page: parseInt(page, 10),
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    }
  };

  return apiResponse(res, req, next)(response);
}

const listRoute = {
  validators,
  default: handler,
  action: 'activity.list',
  entity: 'audit',
  skipAudit: true
};

export default listRoute;
export { validators };
