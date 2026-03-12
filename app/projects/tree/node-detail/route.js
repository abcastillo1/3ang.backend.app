import { validateField } from '../../../../helpers/validator.js';
import validateRequest from '../../../../middleware/validation.js';
import authenticate from '../../../../middleware/auth.js';
import { requirePermission } from '../../../../middleware/permissions.js';
import apiResponse from '../../../../helpers/response.js';
import { throwError } from '../../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../../config/constants.js';
import modelsInstance from '../../../../models/index.js';
import { TYPE_SECTION_NODE, TYPE_CHECKLIST_ITEM_NODE } from '../../../../helpers/engagement-file-tree-sync.js';
import { loadAssigneesForItems, loadAssigneesForItem } from '../../../../helpers/checklist-item-assignees.js';

const validators = [
  validateField('data.auditProjectId')
    .notEmpty()
    .withMessage('validators.auditProjectId.required')
    .isInt({ min: 1 })
    .withMessage('validators.auditProjectId.invalid'),
  validateField('data.nodeId')
    .notEmpty()
    .withMessage('validators.nodeId.required')
    .isInt({ min: 1 })
    .withMessage('validators.nodeId.invalid'),
  validateRequest,
  authenticate,
  requirePermission('projects.view')
];

function serializeUser(u) {
  if (!u) return null;
  return { id: u.id, name: u.fullName || u.name, email: u.email };
}

function serializeDocument(d) {
  if (!d) return null;
  return {
    id: d.id,
    originalName: d.originalName,
    mimeType: d.mimeType,
    size: d.size,
    nodeId: d.nodeId,
    createdAt: d.createdAt
  };
}

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const {
    AuditProject,
    AuditTreeNode,
    EngagementFileSection,
    ChecklistItem,
    AuditDocument,
    User
  } = modelsInstance.models;

  const project = await AuditProject.findOne({
    where: { id: data.auditProjectId, organizationId: user.organizationId }
  });
  if (!project) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'projects.notFound');
  }

  const node = await AuditTreeNode.findOne({
    where: { id: data.nodeId, auditProjectId: project.id }
  });
  if (!node) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'projects.tree.nodeNotFound');
  }

  // Evidencia formal del nodo: excluye adjuntos de comentarios (comment_id IS NULL)
  const documents = await AuditDocument.findAll({
    where: { auditProjectId: project.id, nodeId: node.id, commentId: null },
    attributes: ['id', 'originalName', 'mimeType', 'size', 'nodeId', 'createdAt'],
    order: [['createdAt', 'DESC']]
  });

  const payload = {
    node: {
      id: node.id,
      auditProjectId: node.auditProjectId,
      parentId: node.parentId,
      type: node.type,
      name: node.name,
      refId: node.refId,
      depth: node.depth,
      path: node.path,
      order: node.order,
      isSystemNode: node.isSystemNode,
      documentsCount: documents.length
    },
    detailType: 'generic',
    section: null,
    item: null,
    documents: documents.map(d => serializeDocument(d))
  };

  const refId = node.refId;

  if (node.type === TYPE_SECTION_NODE && refId) {
    const section = await EngagementFileSection.findOne({
      where: { id: refId, auditProjectId: project.id },
      include: [
        {
          model: ChecklistItem,
          as: 'items',
          required: false,
          include: [{ model: User, as: 'assignedUser', attributes: ['id', 'fullName', 'email'], required: false }]
        }
      ]
    });
    if (section) {
      if (section.items && section.items.length) {
        section.items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      }
      const itemIds = (section.items || []).map(it => it.id);
      const assigneesMap = await loadAssigneesForItems(itemIds, null);
      payload.detailType = 'section';
      payload.section = {
        id: section.id,
        code: section.code,
        name: section.name,
        description: section.description,
        priority: section.priority,
        sortOrder: section.sortOrder,
        treeNodeId: section.treeNodeId,
        items: (section.items || []).map(it => ({
          id: it.id,
          code: it.code,
          description: it.description,
          status: it.status,
          isRequired: it.isRequired,
          ref: it.ref,
          treeNodeId: it.treeNodeId,
          sortOrder: it.sortOrder,
          lastReviewedAt: it.lastReviewedAt,
          createdByUserId: it.createdByUserId,
          assignedUser: serializeUser(it.assignedUser),
          assignees: assigneesMap.get(it.id) || [],
        }))
      };
    }
  }

  if (node.type === TYPE_CHECKLIST_ITEM_NODE && refId) {
    const item = await ChecklistItem.findOne({
      where: { id: refId },
      include: [
        { model: EngagementFileSection, as: 'section', required: true },
        { model: User, as: 'assignedUser', attributes: ['id', 'fullName', 'email'], required: false },
        { model: User, as: 'createdBy', attributes: ['id', 'fullName', 'email'], required: false }
      ]
    });
    if (item && item.section && item.section.auditProjectId === project.id) {
      const itemAssignees = await loadAssigneesForItem(item.id, null);
      payload.detailType = 'checklist_item';
      payload.item = {
        id: item.id,
        sectionId: item.sectionId,
        createdByUserId: item.createdByUserId,
        createdBy: serializeUser(item.createdBy),
        code: item.code,
        description: item.description,
        status: item.status,
        isRequired: item.isRequired,
        ref: item.ref,
        treeNodeId: item.treeNodeId,
        sortOrder: item.sortOrder,
        lastReviewedAt: item.lastReviewedAt,
        assignedUser: serializeUser(item.assignedUser),
        assignees: itemAssignees,
        section: { id: item.section.id, code: item.section.code, name: item.section.name }
      };
    }
  }

  return apiResponse(res, req, next)(payload);
}

const nodeDetailRoute = {
  validators,
  default: handler,
  action: 'tree-node-detail',
  entity: 'projects'
};

export default nodeDetailRoute;
