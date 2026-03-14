import { validateField } from '../../../helpers/validator.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import apiResponse from '../../../helpers/response.js';
import { throwError } from '../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../config/constants.js';
import modelsInstance from '../../../models/index.js';
import { toCommentPayload } from '../../../helpers/comment-serialize.js';

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
  validateField('data.body')
    .notEmpty()
    .withMessage('validators.body.required')
    .isLength({ min: 1, max: 65535 })
    .withMessage('validators.body.invalid'),
  validateField('data.parentId')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('validators.parentId.invalid'),
  validateField('data.mentionsUser')
    .optional()
    .isArray()
    .withMessage('validators.mentionsUser.invalid'),
  validateField('data.mentionsUser.*.id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('validators.mentionsUser.invalid'),
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

  // Si es respuesta (parentId), validar que el padre exista, sea del mismo ítem/proyecto y no supere la profundidad recomendada (máx. 2 niveles)
  if (data.parentId) {
    const parentComment = await ChecklistItemComment.findOne({
      where: {
        id: data.parentId,
        auditProjectId: project.id,
        checklistItemId: item.id
      }
    });
    if (!parentComment) {
      throw throwError(HTTP_STATUS.BAD_REQUEST, 'comments.parentNotFound');
    }
    if (parentComment.parentId != null) {
      const grandparent = await ChecklistItemComment.findByPk(parentComment.parentId);
      if (grandparent && grandparent.parentId != null) {
        throw throwError(HTTP_STATUS.BAD_REQUEST, 'comments.maxDepthReached');
      }
    }
  }

  // mention_user_ids guarda el array de objetos { id, fullName, email } que envía el front; list lo devuelve sin consultar users
  const mentionsUserInput = Array.isArray(data.mentionsUser) ? data.mentionsUser : [];
  const mentionUserIds = mentionsUserInput.length
    ? mentionsUserInput
        .filter(m => m && m.id)
        .map(m => ({ id: Number(m.id), fullName: m.fullName || '', email: m.email || '' }))
    : null;

  const comment = await ChecklistItemComment.create({
    checklistItemId: item.id,
    auditProjectId: project.id,
    parentId: data.parentId || null,
    body: (data.body || '').trim(),
    authorUserId: user.id,
    mentionUserIds,
    attachmentCount: 0
  });

  const author = await User.findByPk(user.id, {
    attributes: ['id', 'fullName', 'email']
  });
  const payload = toCommentPayload(
    { ...comment.toJSON(), author: author || null },
    new Map((comment.mentionUserIds || []).map(m => [m.id, m]))
  );

  req.activityContext = {
    commentId: comment.id,
    auditProjectId: project.id,
    projectName: project.name ?? null,
    checklistItemId: item.id,
    itemCode: item.code ?? null
  };

  return apiResponse(res, req, next)({ comment: payload });
}

const createRoute = {
  validators,
  default: handler,
  action: 'create',
  entity: 'checklist_item_comment',
  activityKey: 'comments.create'
};

export default createRoute;
