import modelsInstance from '../models/index.js';
import { logger } from './logger.js';

export const ACTIVITY_ACTIONS = {
  PROJECT_CREATED: 'project.created',
  PROJECT_UPDATED: 'project.updated',
  PROJECT_DELETED: 'project.deleted',
  ASSIGNMENT_ADDED: 'assignment.added',
  ASSIGNMENT_REMOVED: 'assignment.removed',
  TREE_NODE_CREATED: 'tree.node.created',
  TREE_NODE_MOVED: 'tree.node.moved',
  TREE_NODE_REORDERED: 'tree.node.reordered',
  TREE_NODE_DELETED: 'tree.node.deleted',
  DOCUMENT_UPLOADED: 'document.uploaded',
  DOCUMENT_LINKED: 'document.linked',
  DOCUMENT_DELETED: 'document.deleted',
  CLIENT_CREATED: 'client.created',
  CLIENT_UPDATED: 'client.updated',
  CLIENT_DELETED: 'client.deleted',
  ORGANIZATION_UPDATED: 'organization.updated',
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  ROLE_CREATED: 'role.created',
  ROLE_UPDATED: 'role.updated',
  ROLE_DELETED: 'role.deleted',
  PERMANENT_FILE_SECTION_CREATED: 'permanent_file.section.created',
  PERMANENT_FILE_SECTION_UPDATED: 'permanent_file.section.updated',
  PERMANENT_FILE_SECTION_DELETED: 'permanent_file.section.deleted',
  PERMANENT_FILE_ITEM_CREATED: 'permanent_file.item.created',
  PERMANENT_FILE_ITEM_UPDATED: 'permanent_file.item.updated',
  PERMANENT_FILE_ITEM_DELETED: 'permanent_file.item.deleted'
};

export const ACTIVITY_ENTITIES = {
  PROJECT: 'project',
  ASSIGNMENT: 'assignment',
  TREE_NODE: 'tree_node',
  DOCUMENT: 'document',
  CLIENT: 'client',
  ORGANIZATION: 'organization',
  USER: 'user',
  ROLE: 'role',
  PERMANENT_FILE_SECTION: 'permanent_file_section',
  PERMANENT_FILE_ITEM: 'permanent_file_item'
};

function normalizePayload(payload) {
  const { action, entity, entityId, description, metadata, auditProjectId, organizationId } = payload;
  if (!action || !entity) return null;
  return {
    action,
    entity,
    entityId: entityId ?? null,
    description: description ?? null,
    metadata: metadata ?? null,
    auditProjectId: auditProjectId ?? null,
    organizationId: organizationId ?? null
  };
}

export function pushActivity(req, payload) {
  if (!req || !req.user?.id) return;
  const normalized = normalizePayload(payload);
  if (!normalized) return;
  if (!req.pendingActivities) req.pendingActivities = [];
  req.pendingActivities.push(normalized);
}

export function flushPendingActivities(defaultOrgId, userId, activities) {
  if (!defaultOrgId || !userId || !activities?.length) return;
  setImmediate(async () => {
    const { ActivityLog } = modelsInstance.models;
    for (const p of activities) {
      const orgId = p.organizationId ?? defaultOrgId;
      try {
        await ActivityLog.create({
          organizationId: orgId,
          userId,
          auditProjectId: p.auditProjectId,
          action: p.action,
          entity: p.entity,
          entityId: p.entityId,
          description: p.description,
          metadata: p.metadata
        });
      } catch (err) {
        logger.error('flushPendingActivities failed', { action: p.action, entity: p.entity, error: err.message });
      }
    }
  });
}

export function recordActivity(payload) {
  const { organizationId, userId, action, entity } = payload;
  if (!organizationId || !userId || !action || !entity) return;
  const normalized = normalizePayload(payload);
  if (!normalized) return;
  flushPendingActivities(organizationId, userId, [normalized]);
}
