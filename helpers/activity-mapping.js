import { ACTIVITY_ACTIONS, ACTIVITY_ENTITIES } from './record-activity.js';

/**
 * Activity description keys. Stored in activity_logs.description; metadata holds interpolation params.
 * When listing activity, the backend translates with assets/translations (es.json, en.json) and returns the final string in description.
 *
 * Keys and expected metadata params (for translations file):
 *   activity.project.created       → projectName, clientId?
 *   activity.project.updated       → projectName, previousStatus?, newStatus?, statusChanged?
 *   activity.project.deleted       → projectName
 *   activity.assignment.added      → targetUserName, projectName, targetUserId?, role?
 *   activity.assignment.removed    → removedUserName, projectName, removedUserId?
 *   activity.tree.node.created     → nodeName, projectName, nodeType?, parentId?
 *   activity.tree.node.moved       → nodeName, projectName, newParentId?
 *   activity.tree.node.reordered   → projectName, parentId?
 *   activity.tree.node.deleted     → nodeName, projectName, deletedCount?
 *   activity.document.uploaded     → originalName, projectName?, nodeId?
 *   activity.document.linked       → count, projectName, nodeId?
 *   activity.document.deleted      → originalName
 *   activity.client.created        → clientName
 *   activity.client.updated        → clientName
 *   activity.client.deleted        → clientName
 *   activity.organization.updated → organizationName
 *   activity.user.created          → userFullName, userEmail?
 *   activity.user.updated          → userFullName, userEmail?
 *   activity.role.created          → roleName
 *   activity.role.updated         → roleName
 *   activity.role.deleted          → roleName
 *   activity.permanentFile.section.created → sectionName, projectName
 *   activity.permanentFile.section.updated → sectionName, projectName
 *   activity.permanentFile.section.deleted → sectionName, projectName
 *   activity.permanentFile.item.created    → itemCode, sectionName?, projectName
 *   activity.permanentFile.item.updated    → itemCode, projectName, status?
 *   activity.permanentFile.item.deleted    → itemCode, projectName
 *   activity.comment.created               → itemCode?, projectName?, commentId?, checklistItemId?
 *   activity.comment.updated               → itemCode?, projectName?, commentId?, checklistItemId?
 *   activity.comment.deleted               → itemCode?, projectName?, commentId?, checklistItemId?
 */
const DESCRIPTION_KEYS = {
  PROJECT_CREATED: 'activity.project.created',
  PROJECT_UPDATED: 'activity.project.updated',
  PROJECT_DELETED: 'activity.project.deleted',
  ASSIGNMENT_ADDED: 'activity.assignment.added',
  ASSIGNMENT_REMOVED: 'activity.assignment.removed',
  TREE_NODE_CREATED: 'activity.tree.node.created',
  TREE_NODE_MOVED: 'activity.tree.node.moved',
  TREE_NODE_REORDERED: 'activity.tree.node.reordered',
  TREE_NODE_DELETED: 'activity.tree.node.deleted',
  DOCUMENT_UPLOADED: 'activity.document.uploaded',
  DOCUMENT_LINKED: 'activity.document.linked',
  DOCUMENT_DELETED: 'activity.document.deleted',
  CLIENT_CREATED: 'activity.client.created',
  CLIENT_UPDATED: 'activity.client.updated',
  CLIENT_DELETED: 'activity.client.deleted',
  ORGANIZATION_UPDATED: 'activity.organization.updated',
  USER_CREATED: 'activity.user.created',
  USER_UPDATED: 'activity.user.updated',
  ROLE_CREATED: 'activity.role.created',
  ROLE_UPDATED: 'activity.role.updated',
  ROLE_DELETED: 'activity.role.deleted',
  PERMANENT_FILE_SECTION_CREATED: 'activity.permanentFile.section.created',
  PERMANENT_FILE_SECTION_UPDATED: 'activity.permanentFile.section.updated',
  PERMANENT_FILE_SECTION_DELETED: 'activity.permanentFile.section.deleted',
  PERMANENT_FILE_ITEM_CREATED: 'activity.permanentFile.item.created',
  PERMANENT_FILE_ITEM_UPDATED: 'activity.permanentFile.item.updated',
  PERMANENT_FILE_ITEM_DELETED: 'activity.permanentFile.item.deleted',
  COMMENT_CREATED: 'activity.comment.created',
  COMMENT_UPDATED: 'activity.comment.updated',
  COMMENT_DELETED: 'activity.comment.deleted'
};

const MAP = {
  'projects.create': {
    action: ACTIVITY_ACTIONS.PROJECT_CREATED,
    entity: ACTIVITY_ENTITIES.PROJECT,
    build: (ctx) => ({
      entityId: ctx.projectId,
      auditProjectId: ctx.projectId,
      description: DESCRIPTION_KEYS.PROJECT_CREATED,
      metadata: { projectName: ctx.projectName, clientId: ctx.clientId }
    })
  },
  'projects.update': {
    action: ACTIVITY_ACTIONS.PROJECT_UPDATED,
    entity: ACTIVITY_ENTITIES.PROJECT,
    build: (ctx) => ({
      entityId: ctx.projectId,
      auditProjectId: ctx.projectId,
      description: DESCRIPTION_KEYS.PROJECT_UPDATED,
      metadata: { projectName: ctx.projectName, previousStatus: ctx.previousStatus, newStatus: ctx.newStatus, statusChanged: ctx.statusChanged }
    })
  },
  'projects.delete': {
    action: ACTIVITY_ACTIONS.PROJECT_DELETED,
    entity: ACTIVITY_ENTITIES.PROJECT,
    build: (ctx) => ({
      entityId: ctx.projectId,
      auditProjectId: ctx.projectId,
      description: DESCRIPTION_KEYS.PROJECT_DELETED,
      metadata: { projectName: ctx.projectName }
    })
  },
  'projects.assignments.add': {
    action: ACTIVITY_ACTIONS.ASSIGNMENT_ADDED,
    entity: ACTIVITY_ENTITIES.ASSIGNMENT,
    build: (ctx) => ({
      entityId: ctx.assignmentId,
      auditProjectId: ctx.auditProjectId,
      description: DESCRIPTION_KEYS.ASSIGNMENT_ADDED,
      metadata: { projectName: ctx.projectName, targetUserId: ctx.targetUserId, targetUserName: ctx.targetUserName, role: ctx.role }
    })
  },
  'projects.assignments.remove': {
    action: ACTIVITY_ACTIONS.ASSIGNMENT_REMOVED,
    entity: ACTIVITY_ENTITIES.ASSIGNMENT,
    build: (ctx) => ({
      entityId: ctx.assignmentId,
      auditProjectId: ctx.auditProjectId,
      description: DESCRIPTION_KEYS.ASSIGNMENT_REMOVED,
      metadata: { projectName: ctx.projectName, removedUserId: ctx.removedUserId, removedUserName: ctx.removedUserName }
    })
  },
  'projects.tree.create': {
    action: ACTIVITY_ACTIONS.TREE_NODE_CREATED,
    entity: ACTIVITY_ENTITIES.TREE_NODE,
    build: (ctx) => ({
      entityId: ctx.nodeId,
      auditProjectId: ctx.auditProjectId,
      description: DESCRIPTION_KEYS.TREE_NODE_CREATED,
      metadata: { projectName: ctx.projectName, nodeName: ctx.nodeName, nodeType: ctx.nodeType, parentId: ctx.parentId }
    })
  },
  'projects.tree.move': {
    action: ACTIVITY_ACTIONS.TREE_NODE_MOVED,
    entity: ACTIVITY_ENTITIES.TREE_NODE,
    build: (ctx) => ({
      entityId: ctx.nodeId,
      auditProjectId: ctx.auditProjectId,
      description: DESCRIPTION_KEYS.TREE_NODE_MOVED,
      metadata: { projectName: ctx.projectName, nodeName: ctx.nodeName, newParentId: ctx.newParentId }
    })
  },
  'projects.tree.reorder': {
    action: ACTIVITY_ACTIONS.TREE_NODE_REORDERED,
    entity: ACTIVITY_ENTITIES.TREE_NODE,
    build: (ctx) => ({
      auditProjectId: ctx.auditProjectId,
      description: DESCRIPTION_KEYS.TREE_NODE_REORDERED,
      metadata: { projectName: ctx.projectName, parentId: ctx.parentId }
    })
  },
  'projects.tree.delete': {
    action: ACTIVITY_ACTIONS.TREE_NODE_DELETED,
    entity: ACTIVITY_ENTITIES.TREE_NODE,
    build: (ctx) => ({
      entityId: ctx.nodeId,
      auditProjectId: ctx.auditProjectId,
      description: DESCRIPTION_KEYS.TREE_NODE_DELETED,
      metadata: { projectName: ctx.projectName, nodeName: ctx.nodeName, deletedCount: ctx.deletedCount }
    })
  },
  'files.confirm': {
    action: ACTIVITY_ACTIONS.DOCUMENT_UPLOADED,
    entity: ACTIVITY_ENTITIES.DOCUMENT,
    build: (ctx) => ({
      entityId: ctx.documentId,
      auditProjectId: ctx.auditProjectId ?? undefined,
      description: DESCRIPTION_KEYS.DOCUMENT_UPLOADED,
      metadata: { originalName: ctx.originalName, projectName: ctx.projectName, nodeId: ctx.nodeId }
    })
  },
  'files.link': {
    action: ACTIVITY_ACTIONS.DOCUMENT_LINKED,
    entity: ACTIVITY_ENTITIES.DOCUMENT,
    build: (ctx) => ({
      auditProjectId: ctx.auditProjectId,
      description: DESCRIPTION_KEYS.DOCUMENT_LINKED,
      metadata: { projectName: ctx.projectName, documentIds: ctx.documentIds, count: ctx.count, nodeId: ctx.nodeId }
    })
  },
  'files.delete': {
    action: ACTIVITY_ACTIONS.DOCUMENT_DELETED,
    entity: ACTIVITY_ENTITIES.DOCUMENT,
    build: (ctx) => ({
      entityId: ctx.documentId,
      auditProjectId: ctx.auditProjectId ?? undefined,
      description: DESCRIPTION_KEYS.DOCUMENT_DELETED,
      metadata: { originalName: ctx.originalName }
    })
  },
  'clients.create': {
    action: ACTIVITY_ACTIONS.CLIENT_CREATED,
    entity: ACTIVITY_ENTITIES.CLIENT,
    build: (ctx) => ({
      entityId: ctx.clientId,
      description: DESCRIPTION_KEYS.CLIENT_CREATED,
      metadata: { clientName: ctx.clientName }
    })
  },
  'clients.update': {
    action: ACTIVITY_ACTIONS.CLIENT_UPDATED,
    entity: ACTIVITY_ENTITIES.CLIENT,
    build: (ctx) => ({
      entityId: ctx.clientId,
      description: DESCRIPTION_KEYS.CLIENT_UPDATED,
      metadata: { clientName: ctx.clientName }
    })
  },
  'clients.delete': {
    action: ACTIVITY_ACTIONS.CLIENT_DELETED,
    entity: ACTIVITY_ENTITIES.CLIENT,
    build: (ctx) => ({
      entityId: ctx.clientId,
      description: DESCRIPTION_KEYS.CLIENT_DELETED,
      metadata: { clientName: ctx.clientName }
    })
  },
  'organizations.update': {
    action: ACTIVITY_ACTIONS.ORGANIZATION_UPDATED,
    entity: ACTIVITY_ENTITIES.ORGANIZATION,
    build: (ctx) => ({
      organizationId: ctx.organizationId,
      entityId: ctx.organizationId,
      description: DESCRIPTION_KEYS.ORGANIZATION_UPDATED,
      metadata: { organizationName: ctx.organizationName }
    })
  },
  'users.create': {
    action: ACTIVITY_ACTIONS.USER_CREATED,
    entity: ACTIVITY_ENTITIES.USER,
    build: (ctx) => ({
      entityId: ctx.userId,
      description: DESCRIPTION_KEYS.USER_CREATED,
      metadata: { userFullName: ctx.userFullName, userEmail: ctx.userEmail }
    })
  },
  'users.update': {
    action: ACTIVITY_ACTIONS.USER_UPDATED,
    entity: ACTIVITY_ENTITIES.USER,
    build: (ctx) => ({
      entityId: ctx.userId,
      description: DESCRIPTION_KEYS.USER_UPDATED,
      metadata: { userFullName: ctx.userFullName, userEmail: ctx.userEmail }
    })
  },
  'roles.create': {
    action: ACTIVITY_ACTIONS.ROLE_CREATED,
    entity: ACTIVITY_ENTITIES.ROLE,
    build: (ctx) => ({
      entityId: ctx.roleId,
      description: DESCRIPTION_KEYS.ROLE_CREATED,
      metadata: { roleName: ctx.roleName }
    })
  },
  'roles.update': {
    action: ACTIVITY_ACTIONS.ROLE_UPDATED,
    entity: ACTIVITY_ENTITIES.ROLE,
    build: (ctx) => ({
      entityId: ctx.roleId,
      description: DESCRIPTION_KEYS.ROLE_UPDATED,
      metadata: { roleName: ctx.roleName }
    })
  },
  'roles.delete': {
    action: ACTIVITY_ACTIONS.ROLE_DELETED,
    entity: ACTIVITY_ENTITIES.ROLE,
    build: (ctx) => ({
      entityId: ctx.roleId,
      description: DESCRIPTION_KEYS.ROLE_DELETED,
      metadata: { roleName: ctx.roleName }
    })
  },
  'projects.permanentFile.section.create': {
    action: ACTIVITY_ACTIONS.PERMANENT_FILE_SECTION_CREATED,
    entity: ACTIVITY_ENTITIES.PERMANENT_FILE_SECTION,
    build: (ctx) => ({
      entityId: ctx.sectionId,
      auditProjectId: ctx.auditProjectId,
      description: DESCRIPTION_KEYS.PERMANENT_FILE_SECTION_CREATED,
      metadata: { sectionName: ctx.sectionName, projectName: ctx.projectName }
    })
  },
  'projects.permanentFile.section.update': {
    action: ACTIVITY_ACTIONS.PERMANENT_FILE_SECTION_UPDATED,
    entity: ACTIVITY_ENTITIES.PERMANENT_FILE_SECTION,
    build: (ctx) => ({
      entityId: ctx.sectionId,
      auditProjectId: ctx.auditProjectId,
      description: DESCRIPTION_KEYS.PERMANENT_FILE_SECTION_UPDATED,
      metadata: { sectionName: ctx.sectionName, projectName: ctx.projectName }
    })
  },
  'projects.permanentFile.section.delete': {
    action: ACTIVITY_ACTIONS.PERMANENT_FILE_SECTION_DELETED,
    entity: ACTIVITY_ENTITIES.PERMANENT_FILE_SECTION,
    build: (ctx) => ({
      entityId: ctx.sectionId,
      auditProjectId: ctx.auditProjectId,
      description: DESCRIPTION_KEYS.PERMANENT_FILE_SECTION_DELETED,
      metadata: { sectionName: ctx.sectionName, projectName: ctx.projectName }
    })
  },
  'projects.permanentFile.item.create': {
    action: ACTIVITY_ACTIONS.PERMANENT_FILE_ITEM_CREATED,
    entity: ACTIVITY_ENTITIES.PERMANENT_FILE_ITEM,
    build: (ctx) => ({
      entityId: ctx.itemId,
      auditProjectId: ctx.auditProjectId,
      description: DESCRIPTION_KEYS.PERMANENT_FILE_ITEM_CREATED,
      metadata: { itemCode: ctx.itemCode, sectionName: ctx.sectionName, projectName: ctx.projectName }
    })
  },
  'projects.permanentFile.item.update': {
    action: ACTIVITY_ACTIONS.PERMANENT_FILE_ITEM_UPDATED,
    entity: ACTIVITY_ENTITIES.PERMANENT_FILE_ITEM,
    build: (ctx) => ({
      entityId: ctx.itemId,
      auditProjectId: ctx.auditProjectId,
      description: DESCRIPTION_KEYS.PERMANENT_FILE_ITEM_UPDATED,
      metadata: { itemCode: ctx.itemCode, projectName: ctx.projectName, status: ctx.status }
    })
  },
  'projects.permanentFile.item.delete': {
    action: ACTIVITY_ACTIONS.PERMANENT_FILE_ITEM_DELETED,
    entity: ACTIVITY_ENTITIES.PERMANENT_FILE_ITEM,
    build: (ctx) => ({
      entityId: ctx.itemId,
      auditProjectId: ctx.auditProjectId,
      description: DESCRIPTION_KEYS.PERMANENT_FILE_ITEM_DELETED,
      metadata: { itemCode: ctx.itemCode, projectName: ctx.projectName }
    })
  },
  'comments.create': {
    action: ACTIVITY_ACTIONS.COMMENT_CREATED,
    entity: ACTIVITY_ENTITIES.COMMENT,
    build: (ctx) => ({
      entityId: ctx.commentId ?? null,
      auditProjectId: ctx.auditProjectId ?? null,
      description: DESCRIPTION_KEYS.COMMENT_CREATED,
      metadata: {
        projectName: ctx.projectName ?? null,
        itemCode: ctx.itemCode ?? null,
        commentId: ctx.commentId ?? null,
        checklistItemId: ctx.checklistItemId ?? null
      }
    })
  },
  'comments.update': {
    action: ACTIVITY_ACTIONS.COMMENT_UPDATED,
    entity: ACTIVITY_ENTITIES.COMMENT,
    build: (ctx) => ({
      entityId: ctx.commentId ?? null,
      auditProjectId: ctx.auditProjectId ?? null,
      description: DESCRIPTION_KEYS.COMMENT_UPDATED,
      metadata: {
        projectName: ctx.projectName ?? null,
        itemCode: ctx.itemCode ?? null,
        commentId: ctx.commentId ?? null,
        checklistItemId: ctx.checklistItemId ?? null
      }
    })
  },
  'comments.delete': {
    action: ACTIVITY_ACTIONS.COMMENT_DELETED,
    entity: ACTIVITY_ENTITIES.COMMENT,
    build: (ctx) => ({
      entityId: ctx.commentId ?? null,
      auditProjectId: ctx.auditProjectId ?? null,
      description: DESCRIPTION_KEYS.COMMENT_DELETED,
      metadata: {
        projectName: ctx.projectName ?? null,
        itemCode: ctx.itemCode ?? null,
        commentId: ctx.commentId ?? null,
        checklistItemId: ctx.checklistItemId ?? null
      }
    })
  }
};

export function getActivityPayload(activityKey, context) {
  const entry = MAP[activityKey];
  if (!entry || !context) return null;
  const built = entry.build(context);
  return {
    action: entry.action,
    entity: entry.entity,
    entityId: built.entityId ?? null,
    description: built.description,
    metadata: built.metadata ?? null,
    auditProjectId: built.auditProjectId ?? null,
    organizationId: built.organizationId ?? null
  };
}

export function hasActivityMapping(activityKey) {
  return Boolean(MAP[activityKey]);
}

export { DESCRIPTION_KEYS };
