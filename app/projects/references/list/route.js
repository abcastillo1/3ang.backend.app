import { validateField } from '../../../../helpers/validator.js';
import validateRequest from '../../../../middleware/validation.js';
import authenticate from '../../../../middleware/auth.js';
import { requirePermission } from '../../../../middleware/permissions.js';
import apiResponse from '../../../../helpers/response.js';
import { throwError } from '../../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../../config/constants.js';
import modelsInstance from '../../../../models/index.js';
import { Op } from 'sequelize';
import { CROSS_REF_KINDS } from '../../../../helpers/cross-reference.js';

const DIR = ['outgoing', 'incoming', 'both'];

const validators = [
  validateField('data.auditProjectId')
    .notEmpty()
    .withMessage('validators.auditProjectId.required')
    .isInt({ min: 1 })
    .withMessage('validators.auditProjectId.invalid'),
  validateField('data.kind')
    .notEmpty()
    .withMessage('references.scopeKind.required')
    .isIn(CROSS_REF_KINDS)
    .withMessage('references.scopeKind.invalid'),
  validateField('data.id')
    .notEmpty()
    .withMessage('references.scopeId.required')
    .isInt({ min: 1 })
    .withMessage('references.scopeId.invalid'),
  validateField('data.direction')
    .optional()
    .isIn(DIR)
    .withMessage('references.direction.invalid'),
  validateField('data.includeDetails')
    .optional()
    .isBoolean()
    .withMessage('references.includeDetails.invalid'),
  validateRequest,
  authenticate,
  requirePermission('projects.references.manage')
];

async function enrichRows(rows, includeDetails, auditProjectId) {
  if (!includeDetails) {
    return rows.map((r) => ({ ...r.get({ plain: true }) }));
  }
  const docIds = new Set();
  const nodeIds = new Set();
  for (const r of rows) {
    if (r.sourceKind === 'document') docIds.add(r.sourceId);
    else nodeIds.add(r.sourceId);
    if (r.targetKind === 'document') docIds.add(r.targetId);
    else nodeIds.add(r.targetId);
  }
  const { AuditDocument, AuditTreeNode } = modelsInstance.models;
  const docs = docIds.size
    ? await AuditDocument.findAll({
        where: { id: [...docIds], auditProjectId },
        attributes: ['id', 'originalName', 'mimeType']
      })
    : [];
  const nodes = nodeIds.size
    ? await AuditTreeNode.findAll({
        where: { id: [...nodeIds], auditProjectId },
        attributes: ['id', 'name', 'type']
      })
    : [];
  const docMap = Object.fromEntries(docs.map((d) => [d.id, d.get({ plain: true })]));
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n.get({ plain: true })]));
  return rows.map((r) => {
    const plain = r.get({ plain: true });
    const out = { ...plain };
    out.sourceDetail =
      plain.sourceKind === 'document'
        ? docMap[plain.sourceId] || null
        : nodeMap[plain.sourceId] || null;
    out.targetDetail =
      plain.targetKind === 'document'
        ? docMap[plain.targetId] || null
        : nodeMap[plain.targetId] || null;
    return out;
  });
}

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { AuditProject, AuditCrossReference } = modelsInstance.models;
  const direction = data.direction || 'both';
  const scopeKind = data.kind;
  const scopeId = parseInt(data.id, 10);

  const project = await AuditProject.findOne({
    where: { id: data.auditProjectId, organizationId: user.organizationId }
  });
  if (!project) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'projects.notFound');
  }

  const whereParts = [{ auditProjectId: project.id, organizationId: user.organizationId }];

  if (direction === 'outgoing') {
    whereParts.push({ sourceKind: scopeKind, sourceId: scopeId });
  } else if (direction === 'incoming') {
    whereParts.push({ targetKind: scopeKind, targetId: scopeId });
  } else {
    whereParts.push({
      [Op.or]: [
        { sourceKind: scopeKind, sourceId: scopeId },
        { targetKind: scopeKind, targetId: scopeId }
      ]
    });
  }

  const rows = await AuditCrossReference.findAll({
    where: { [Op.and]: whereParts },
    order: [['createdAt', 'DESC']]
  });

  const references = await enrichRows(rows, data.includeDetails === true, project.id);

  return apiResponse(res, req, next)({ references });
}

const listRoute = {
  validators,
  default: handler,
  action: 'references.list',
  entity: 'projects',
  skipAudit: true
};

export default listRoute;
