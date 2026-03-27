import { Op } from 'sequelize';
import { throwError } from './errors.js';
import { HTTP_STATUS } from '../config/constants.js';
export const CROSS_REF_KINDS = ['document', 'tree_node'];

export const CROSS_REF_RELATION_TYPES = [
  'related',
  'supports',
  'supersedes',
  'see_also',
  'contradicts'
];

/**
 * Carga documento o nodo y valida que pertenezcan al proyecto y a la organización.
 * @returns {{ label: string }} label breve para textos de actividad
 */
export async function resolveCrossRefEndpoint(models, { kind, id, auditProjectId, organizationId }) {
  if (kind === 'document') {
    const doc = await models.AuditDocument.findOne({
      where: {
        id,
        organizationId,
        auditProjectId
      },
      attributes: ['id', 'originalName']
    });
    if (!doc) {
      throw throwError(HTTP_STATUS.BAD_REQUEST, 'references.documentNotInProject');
    }
    return { label: `documento «${doc.originalName}»` };
  }
  if (kind === 'tree_node') {
    const node = await models.AuditTreeNode.findOne({
      where: { id, auditProjectId },
      attributes: ['id', 'name']
    });
    if (!node) {
      throw throwError(HTTP_STATUS.BAD_REQUEST, 'references.nodeNotInProject');
    }
    return { label: `nodo «${node.name}»` };
  }
  throw throwError(HTTP_STATUS.BAD_REQUEST, 'references.invalidKind');
}

/** Serializa una fila de audit_cross_references para respuestas API. */
export function serializeCrossReference(row) {
  const r = row.get ? row.get({ plain: true }) : row;
  return {
    id: r.id,
    auditProjectId: r.auditProjectId,
    sourceKind: r.sourceKind,
    sourceId: r.sourceId,
    targetKind: r.targetKind,
    targetId: r.targetId,
    relationType: r.relationType,
    note: r.note ?? null,
    createdByUserId: r.createdByUserId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt
  };
}

/**
 * Referencias salientes del nodo (solo source_kind = tree_node y este nodo como origen).
 * Para aristas entrantes al nodo u otros extremos, usar POST .../references/list u otras consultas.
 */
export async function fetchCrossReferencesFromNode(models, { organizationId, auditProjectId, nodeId }) {
  const { AuditCrossReference } = models;
  const rows = await AuditCrossReference.findAll({
    where: {
      organizationId,
      auditProjectId,
      sourceKind: 'tree_node',
      sourceId: nodeId
    },
    order: [['createdAt', 'DESC']]
  });
  return rows.map(serializeCrossReference);
}
/**
 * Mapa documentId → referencias donde ese documento es origen o destino.
 * @returns {Map<number, object[]>}
 */
export async function fetchCrossReferencesByDocumentIds(
  models,
  { organizationId, auditProjectId, documentIds }
) {
  const { AuditCrossReference } = models;
  const ids = [...new Set((documentIds || []).map(Number).filter((n) => n > 0))];
  if (!ids.length) {
    return new Map();
  }
  const rows = await AuditCrossReference.findAll({
    where: {
      organizationId,
      auditProjectId,
      [Op.or]: [
        { sourceKind: 'document', sourceId: { [Op.in]: ids } },
        { targetKind: 'document', targetId: { [Op.in]: ids } }
      ]
    },
    order: [['createdAt', 'DESC']]
  });
  const map = new Map();
  for (const id of ids) {
    map.set(id, []);
  }
  for (const row of rows) {
    const plain = serializeCrossReference(row);
    if (row.sourceKind === 'document' && map.has(row.sourceId)) {
      map.get(row.sourceId).push(plain);
    }
    if (row.targetKind === 'document' && map.has(row.targetId)) {
      map.get(row.targetId).push(plain);
    }
  }
  return map;
}