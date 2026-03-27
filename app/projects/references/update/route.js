import { validateField } from '../../../../helpers/validator.js';
import validateRequest from '../../../../middleware/validation.js';
import authenticate from '../../../../middleware/auth.js';
import { requirePermission } from '../../../../middleware/permissions.js';
import apiResponse from '../../../../helpers/response.js';
import { throwError } from '../../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../../config/constants.js';
import modelsInstance from '../../../../models/index.js';
import { CROSS_REF_RELATION_TYPES } from '../../../../helpers/cross-reference.js';

const validators = [
  validateField('data.auditProjectId')
    .notEmpty()
    .withMessage('validators.auditProjectId.required')
    .isInt({ min: 1 })
    .withMessage('validators.auditProjectId.invalid'),
  validateField('data.id')
    .notEmpty()
    .withMessage('validators.id.required')
    .isInt({ min: 1 })
    .withMessage('validators.id.invalid'),
  validateField('data.relationType')
    .optional()
    .isIn(CROSS_REF_RELATION_TYPES)
    .withMessage('references.relationType.invalid'),
  validateField('data.note')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 4000 })
    .withMessage('references.note.invalid'),
  validateRequest,
  authenticate,
  requirePermission('projects.references.manage')
];

function requireAtLeastOneField(data) {
  if (data.relationType === undefined && data.note === undefined) {
    throw throwError(HTTP_STATUS.BAD_REQUEST, 'references.nothingToUpdate');
  }
}

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { AuditProject, AuditCrossReference } = modelsInstance.models;

  requireAtLeastOneField(data);

  const project = await AuditProject.findOne({
    where: { id: data.auditProjectId, organizationId: user.organizationId }
  });
  if (!project) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'projects.notFound');
  }

  const ref = await AuditCrossReference.findOne({
    where: {
      id: data.id,
      auditProjectId: project.id,
      organizationId: user.organizationId
    }
  });
  if (!ref) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'references.notFound');
  }

  const patch = {};
  if (data.relationType !== undefined) patch.relationType = data.relationType;
  if (data.note !== undefined) patch.note = data.note?.trim() ? data.note.trim() : null;

  await ref.update(patch);

  req.activityContext = {
    auditProjectId: project.id,
    projectName: project.name,
    referenceId: ref.id
  };

  return apiResponse(res, req, next)({ reference: ref.get({ plain: true }) });
}

const updateRoute = {
  validators,
  default: handler,
  action: 'references.update',
  entity: 'projects',
  activityKey: 'projects.references.update'
};

export default updateRoute;
