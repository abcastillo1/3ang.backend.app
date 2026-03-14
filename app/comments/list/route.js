import { validateField } from '../../../helpers/validator.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import apiResponse from '../../../helpers/response.js';
import { throwError } from '../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../config/constants.js';
import modelsInstance from '../../../models/index.js';

const validators = [
  validateField('data.auditProjectId')
    .notEmpty()
    .withMessage('validators.auditProjectId.required')
    .isInt({ min: 1 })
    .withMessage('validators.auditProjectId.invalid'),
  validateField('data.checklistItemId')
    .notEmpty()
    .withMessage('validators.checklistItemId.required')
    .isInt({ min: 1 })
    .withMessage('validators.checklistItemId.invalid'),
  validateField('data.parentId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('validators.parentId.invalid'),
  validateField('data.page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('validators.page.invalid'),
  validateField('data.limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('validators.limit.invalid'),
  validateRequest,
  authenticate,
  requirePermission('projects.view')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const {
    AuditProject,
    ChecklistItem,
    ChecklistItemComment,
    User,
    EngagementFileSection
  } = modelsInstance.models;

  const project = await AuditProject.findOne({
    where: { id: data.auditProjectId, organizationId: user.organizationId }
  });

  if (!project) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'projects.notFound');
  }

  const item = await ChecklistItem.findOne({
    where: { id: data.checklistItemId },
    include: [{ model: EngagementFileSection, as: 'section', required: true }]
  });

  if (!item || !item.section || item.section.auditProjectId !== project.id) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'permanentFile.itemNotFound');
  }

  const ORDER = [['createdAt', 'ASC'], ['id', 'ASC']];
  const whereBase = { auditProjectId: project.id, checklistItemId: item.id };

  const hasParentFilter = Object.prototype.hasOwnProperty.call(data, 'parentId');
  const parentIdFilter = hasParentFilter ? (data.parentId === null || data.parentId === undefined ? null : data.parentId) : null;

  const where = { ...whereBase, parentId: parentIdFilter };

  const total = await ChecklistItemComment.count({ where });

  const page = parseInt(data.page, 10) || 1;
  const limit = Math.min(parseInt(data.limit, 10) || 10, 100);
  const offset = (page - 1) * limit;

  const comments = await ChecklistItemComment.findAll({
    where,
    limit: hasParentFilter ? undefined : limit,
    offset: hasParentFilter ? 0 : offset,
    order: ORDER,
    include: [{ model: User, as: 'author', attributes: ['id', 'fullName', 'email'] }]
  });

  function toPayload(c) {
    const json = c.toJSON ? c.toJSON() : c;
    const raw = json.mentionUserIds || [];
    const mentionsUser = Array.isArray(raw) && raw[0] && typeof raw[0] === 'object' ? raw : [];
    return {
      id: json.id,
      checklistItemId: json.checklistItemId,
      auditProjectId: json.auditProjectId,
      parentId: json.parentId,
      body: json.body,
      attachmentCount: json.attachmentCount,
      createdAt: json.createdAt,
      author: json.author ? { id: json.author.id, fullName: json.author.fullName, email: json.author.email } : null,
      mentionsUser,
      replies: []
    };
  }

  let payload;

  if (!hasParentFilter || where.parentId === null) {
    // Lista de raíces (paginada): cada raíz incluye TODAS sus respuestas anidadas para no cortar hilos
    const rootIds = comments.map(c => c.id);
    if (rootIds.length === 0) {
      payload = [];
    } else {
      const directReplies = await ChecklistItemComment.findAll({
        where: { ...whereBase, parentId: rootIds },
        order: ORDER,
        include: [{ model: User, as: 'author', attributes: ['id', 'fullName', 'email'] }]
      });
      const level1Ids = directReplies.map(c => c.id);
      const level2Replies = level1Ids.length > 0
        ? await ChecklistItemComment.findAll({
            where: { ...whereBase, parentId: level1Ids },
            order: ORDER,
            include: [{ model: User, as: 'author', attributes: ['id', 'fullName', 'email'] }]
          })
        : [];

      const repliesByParent = new Map();
      level2Replies.forEach(c => {
        const pid = c.parentId;
        if (!repliesByParent.has(pid)) repliesByParent.set(pid, []);
        repliesByParent.get(pid).push(toPayload(c));
      });
      const byParent = new Map();
      directReplies.forEach(c => {
        const pid = c.parentId;
        if (!byParent.has(pid)) byParent.set(pid, []);
        const payload1 = toPayload(c);
        payload1.replies = repliesByParent.get(c.id) || [];
        byParent.get(pid).push(payload1);
      });

      payload = comments.map(root => {
        const p = toPayload(root);
        p.replies = (byParent.get(root.id) || []).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt) || a.id - b.id);
        return p;
      });
    }
    return apiResponse(res, req, next)({
      comments: payload,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  }

  // Lista de respuestas de un padre concreto (parentId enviado): se devuelven TODAS, sin paginar, para no cortar el hilo
  payload = comments.map(toPayload);
  return apiResponse(res, req, next)({
    comments: payload,
    pagination: {
      page: 1,
      limit: payload.length,
      total: payload.length,
      totalPages: 1
    }
  });
}

const listRoute = {
  validators,
  default: handler,
  action: 'comments.list',
  entity: 'checklist_item_comment'
};

export default listRoute;

