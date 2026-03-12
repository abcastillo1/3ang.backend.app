/**
 * Keeps audit_tree_nodes in sync with engagement_file_sections / checklist_items
 * so tree/full is the single hierarchy under the engagement_file root.
 */
import { Op } from 'sequelize';
import modelsInstance from '../models/index.js';

const TYPE_SECTION_NODE = 'folder';
const TYPE_CHECKLIST_ITEM_NODE = 'checklist_item';

const ROOT_TYPE = 'engagement_file';

/**
 * Root node type seeded by tree-seed (expediente estructurado).
 */
export async function findEngagementFileRoot(auditProjectId, transaction) {
  const { AuditTreeNode } = modelsInstance.models;
  let root = await AuditTreeNode.findOne({
    where: { auditProjectId, type: ROOT_TYPE, parentId: null },
    order: [['id', 'ASC']],
    transaction
  });
  if (!root) {
    root = await AuditTreeNode.findOne({
      where: { auditProjectId, type: 'permanent_file', parentId: null },
      order: [['id', 'ASC']],
      transaction
    });
  }
  return root;
}

/** @deprecated use findEngagementFileRoot */
export const findPermanentFileRoot = findEngagementFileRoot;

/**
 * Create a child node under parent; sets path/depth/order. Not a system node (can be moved/deleted via tree API if needed).
 */
export async function createTreeChild(auditProjectId, parentNode, type, name, refId, sortOrder, transaction) {
  const { AuditTreeNode } = modelsInstance.models;
  const parentPath = parentNode.path;
  const parentDepth = parentNode.depth;
  const maxOrder = await AuditTreeNode.max('order', {
    where: { auditProjectId, parentId: parentNode.id },
    transaction
  });
  const order = sortOrder !== undefined && sortOrder !== null ? sortOrder : (maxOrder || 0) + 1;

  const node = await AuditTreeNode.create({
    auditProjectId,
    parentId: parentNode.id,
    path: '/',
    depth: parentDepth + 1,
    type,
    name,
    order,
    refId: refId || null,
    isSystemNode: false
  }, { transaction });

  const materializedPath = `${parentPath}${node.id}/`;
  await node.update({ path: materializedPath }, { transaction });
  return node;
}

/**
 * Update node display name (section rename or item code/description).
 */
export async function updateTreeNodeName(treeNodeId, name, transaction) {
  if (!treeNodeId || !name) return;
  const { AuditTreeNode } = modelsInstance.models;
  await AuditTreeNode.update(
    { name },
    { where: { id: treeNodeId }, transaction }
  );
}

/**
 * Destroy subtree like tree/delete: null documents, destroy nodes. Does not touch EngagementFileSection/ChecklistItem rows.
 */
export async function destroyTreeSubtree(nodeId, transaction) {
  const { AuditTreeNode, AuditDocument } = modelsInstance.models;
  const node = await AuditTreeNode.findByPk(nodeId, { transaction });
  if (!node) return;

  const subtreeIds = [node.id];
  const descendants = await AuditTreeNode.findAll({
    where: {
      auditProjectId: node.auditProjectId,
      path: { [Op.like]: `${node.path}%` },
      id: { [Op.ne]: node.id }
    },
    attributes: ['id'],
    transaction
  });
  descendants.forEach(d => subtreeIds.push(d.id));

  await AuditDocument.update(
    { nodeId: null },
    { where: { nodeId: subtreeIds }, transaction }
  );
  await AuditTreeNode.destroy({
    where: { id: subtreeIds },
    transaction
  });
}

/**
 * Reparent a node under newParent (same project). newParent must be under engagement_file root. Simplified from tree/move.
 */
export async function moveTreeNode(nodeId, newParentId, transaction) {
  const { AuditTreeNode } = modelsInstance.models;
  const node = await AuditTreeNode.findByPk(nodeId, { transaction });
  if (!node || node.isSystemNode) return;

  const newParent = await AuditTreeNode.findOne({
    where: { id: newParentId, auditProjectId: node.auditProjectId },
    transaction
  });
  if (!newParent) return;

  if (newParent.path.startsWith(node.path)) return;

  const newParentPath = newParent.path;
  const newParentDepth = newParent.depth;
  const newDepth = newParentDepth + 1;
  const depthDiff = newDepth - node.depth;

  const descendants = await AuditTreeNode.findAll({
    where: {
      auditProjectId: node.auditProjectId,
      path: { [Op.like]: `${node.path}%` },
      id: { [Op.ne]: node.id }
    },
    transaction
  });

  const maxOrder = await AuditTreeNode.max('order', {
    where: { auditProjectId: node.auditProjectId, parentId: newParentId },
    transaction
  });

  const oldPath = node.path;
  const newPath = `${newParentPath}${node.id}/`;

  await node.update({
    parentId: newParentId,
    path: newPath,
    depth: newDepth,
    order: (maxOrder || 0) + 1
  }, { transaction });

  for (const desc of descendants) {
    const updatedPath = desc.path.replace(oldPath, newPath);
    await desc.update({
      path: updatedPath,
      depth: desc.depth + depthDiff
    }, { transaction });
  }
}

export function sectionDisplayName(section) {
  if (!section) return '';
  const code = section.code || '';
  const name = section.name || '';
  return code && name && name !== code ? `${code} — ${name}` : (name || code);
}

export function itemDisplayName(item) {
  if (!item) return '';
  const code = item.code || '';
  const desc = item.description || '';
  return code && desc ? `${code} — ${desc}` : (desc || code);
}

export { TYPE_SECTION_NODE, TYPE_CHECKLIST_ITEM_NODE, ROOT_TYPE };
