import { validateField } from '../../../../helpers/validator.js';
import validateRequest from '../../../../middleware/validation.js';
import authenticate from '../../../../middleware/auth.js';
import { requirePermission } from '../../../../middleware/permissions.js';
import apiResponse from '../../../../helpers/response.js';
import { throwError } from '../../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../../config/constants.js';
import modelsInstance from '../../../../models/index.js';
import { CROSS_REF_KINDS, CROSS_REF_RELATION_TYPES, resolveCrossRefEndpoint } from '../../../../helpers/cross-reference.js';

const validators = [
  validateField('data.auditProjectId')
    .notEmpty()
    .withMessage('validators.auditProjectId.required')
    .isInt({ min: 1 })
    .withMessage('validators.auditProjectId.invalid'),
  validateField('data.sourceKind')
    .notEmpty()
    .withMessage('references.sourceKind.required')
    .isIn(CROSS_REF_KINDS)
    .withMessage('references.sourceKind.invalid'),
  validateField('data.sourceId')
    .notEmpty()
    .withMessage('references.sourceId.required')
    .isInt({ min: 1 })
    .withMessage('references.sourceId.invalid'),
  validateField('data.targetKind')
    .notEmpty()
    .withMessage('references.targetKind.required')
    .isIn(CROSS_REF_KINDS)
    .withMessage('references.targetKind.invalid'),
  validateField('data.targetId')
    .notEmpty()
    .withMessage('references.targetId.required')
    .isInt({ min: 1 })
    .withMessage('references.targetId.invalid'),
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

function serializeRef(row) {
  return {
    id: row.id,
    auditProjectId: row.auditProjectId,
    sourceKind: row.sourceKind,
    sourceId: row.sourceId,
    targetKind: row.targetKind,
    targetId: row.targetId,
    relationType: row.relationType,
    note: row.note,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { AuditProject, AuditCrossReference } = modelsInstance.models;

  const project = await AuditProject.findOne({
    where: { id: data.auditProjectId, organizationId: user.organizationId }
  });
  if (!project) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'projects.notFound');
  }

  const sourceId = parseInt(data.sourceId, 10);
  const targetId = parseInt(data.targetId, 10);
  if (
    data.sourceKind === data.targetKind &&
    sourceId === targetId
  ) {
    throw throwError(HTTP_STATUS.BAD_REQUEST, 'references.selfReference');
  }

  const src = await resolveCrossRefEndpoint(modelsInstance.models, {
    kind: data.sourceKind,
    id: sourceId,
    auditProjectId: project.id,
    organizationId: user.organizationId
  });
  const tgt = await resolveCrossRefEndpoint(modelsInstance.models, {
    kind: data.targetKind,
    id: targetId,
    auditProjectId: project.id,
    organizationId: user.organizationId
  });

  let row;
  try {
    row = await AuditCrossReference.create({
      organizationId: user.organizationId,
      auditProjectId: project.id,
      sourceKind: data.sourceKind,
      sourceId,
      targetKind: data.targetKind,
      targetId,
      relationType: data.relationType || 'related',
      note: data.note?.trim() || null,
      createdByUserId: user.id
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      throw throwError(HTTP_STATUS.CONFLICT, 'references.duplicate');
    }
    throw err;
  }

  req.activityContext = {
    auditProjectId: project.id,
    projectName: project.name,
    referenceId: row.id,
    sourceLabel: src.label,
    targetLabel: tgt.label
  };

  return apiResponse(res, req, next)({ reference: serializeRef(row) });
}

const createRoute = {
  validators,
  default: handler,
  action: 'references.create',
  entity: 'projects',
  activityKey: 'projects.references.create'
};

export default createRoute;
