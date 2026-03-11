import { validateField } from '../../../helpers/validator.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import apiResponse from '../../../helpers/response.js';
import { throwError } from '../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../config/constants.js';
import modelsInstance from '../../../models/index.js';
import { createDefaultTreeStructure } from '../../../helpers/tree-seed.js';

const validators = [
  validateField('data.name')
    .notEmpty()
    .withMessage('validators.name.required')
    .isLength({ min: 2, max: 255 })
    .withMessage('validators.name.invalid'),
  validateField('data.clientId')
    .notEmpty()
    .withMessage('validators.clientId.required')
    .isInt({ min: 1 })
    .withMessage('validators.clientId.invalid'),
  validateField('data.auditType')
    .optional()
    .isString()
    .withMessage('validators.auditType.invalid'),
  validateField('data.periodStart')
    .optional()
    .isDate()
    .withMessage('validators.periodStart.invalid'),
  validateField('data.periodEnd')
    .optional()
    .isDate()
    .withMessage('validators.periodEnd.invalid'),
  validateField('data.documentIds')
    .optional()
    .isArray()
    .withMessage('validators.documentIds.invalid'),
  validateField('data.documentIds.*')
    .optional()
    .isInt({ min: 1 })
    .withMessage('validators.documentIds.invalid'),
  validateRequest,
  authenticate,
  requirePermission('projects.create')
];

const VALID_TRANSITIONS = {
  draft: ['planning'],
  planning: ['in_progress'],
  in_progress: ['review'],
  review: ['closed'],
  closed: []
};

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { AuditProject, Client, AuditDocument, OrganizationSetting } = modelsInstance.models;

  const client = await Client.findOne({
    where: { id: data.clientId, organizationId: user.organizationId }
  });
  if (!client) {
    throw throwError(HTTP_STATUS.BAD_REQUEST, 'projects.clientNotFound');
  }

  const maxSetting = await OrganizationSetting.findOne({
    where: { organizationId: user.organizationId, settingKey: 'max_audit_projects' }
  });
  if (maxSetting) {
    const max = parseInt(maxSetting.settingValue);
    const currentCount = await AuditProject.count({ where: { organizationId: user.organizationId } });
    if (currentCount >= max) {
      throw throwError(HTTP_STATUS.BAD_REQUEST, 'projects.maxReached');
    }
  }

  if (data.auditType) {
    const typesSetting = await OrganizationSetting.findOne({
      where: { organizationId: user.organizationId, settingKey: 'allowed_audit_types' }
    });
    if (typesSetting) {
      let allowed;
      try { allowed = JSON.parse(typesSetting.settingValue); } catch { allowed = []; }
      if (Array.isArray(allowed) && allowed.length > 0 && !allowed.includes(data.auditType)) {
        throw throwError(HTTP_STATUS.BAD_REQUEST, 'projects.auditTypeNotAllowed');
      }
    }
  }

  const project = await AuditProject.create({
    organizationId: user.organizationId,
    clientId: data.clientId,
    name: data.name,
    auditType: data.auditType || null,
    periodStart: data.periodStart || null,
    periodEnd: data.periodEnd || null,
    status: 'draft'
  });

  if (data.documentIds && data.documentIds.length > 0) {
    await AuditDocument.update(
      { auditProjectId: project.id },
      { where: { id: data.documentIds, organizationId: user.organizationId, auditProjectId: null } }
    );
  }

  await createDefaultTreeStructure(project.id, user.organizationId);

  const result = await AuditProject.findByPk(project.id, {
    include: [{ model: modelsInstance.models.Client, as: 'client', attributes: ['id', 'name', 'ruc'] }]
  });

  req.activityContext = { projectId: project.id, projectName: project.name, clientId: data.clientId };
  return apiResponse(res, req, next)({ project: result });
}

const createRoute = {
  validators,
  default: handler,
  action: 'create',
  entity: 'projects',
  activityKey: 'projects.create'
};

export default createRoute;
export { validators, VALID_TRANSITIONS };
