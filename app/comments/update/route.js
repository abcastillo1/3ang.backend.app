import { validateField } from '../../../helpers/validator.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import apiResponse from '../../../helpers/response.js';
import { throwError } from '../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../config/constants.js';
import modelsInstance from '../../../models/index.js';
import { toCommentPayload } from '../../../helpers/comment-serialize.js';

const validators = [
  validateField('data.id')
    .notEmpty()
    .withMessage('validators.id.required')
    .isInt({ min: 1 })
    .withMessage('validators.id.invalid'),
  validateField('data.auditProjectId')
    .notEmpty()
    .withMessage('validators.auditProjectId.required')
    .isInt({ min: 1 })
    .withMessage('validators.auditProjectId.invalid'),
  validateField('data.body')
    .notEmpty()
    .withMessage('validators.body.required')
    .isLength({ min: 1, max: 65535 })
    .withMessage('validators.body.invalid'),
  validateField('data.mentionsUser')
    .optional()
    .isArray()
    .withMessage('validators.mentionsUser.invalid'),
  validateField('data.mentionsUser.*.id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('validators.mentionsUser.invalid'),
  validateRequest,
  authenticate
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

  const comment = await ChecklistItemComment.findOne({
    where: { id: data.id, auditProjectId: project.id },
    include: [{ model: User, as: 'author', attributes: ['id', 'fullName', 'email'] }]
  });
  if (!comment) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'comments.notFound');
  }

  if (comment.authorUserId !== user.id) {
    throw throwError(HTTP_STATUS.FORBIDDEN, 'comments.forbiddenUpdate');
  }

  // mention_user_ids: array de objetos { id, fullName, email }; si no se envía mentionsUser, se mantienen los actuales
  const mentionsUserInput = Array.isArray(data.mentionsUser) ? data.mentionsUser : null;
  const mentionUserIds = mentionsUserInput !== null
    ? mentionsUserInput
        .filter(m => m && m.id)
        .map(m => ({ id: Number(m.id), fullName: m.fullName || '', email: m.email || '' }))
    : undefined;

  const updatePayload = { body: (data.body || '').trim() };
  if (mentionUserIds !== undefined) updatePayload.mentionUserIds = mentionUserIds.length ? mentionUserIds : null;

  await comment.update(updatePayload);

  const item = await ChecklistItem.findByPk(comment.checklistItemId, {
    include: [{ model: EngagementFileSection, as: 'section' }],
    attributes: ['id', 'code']
  });

  const updated = await ChecklistItemComment.findByPk(comment.id, {
    include: [{ model: User, as: 'author', attributes: ['id', 'fullName', 'email'] }]
  });
  const stored = updated.mentionUserIds || [];
  const mentionUsersMap = new Map(
    Array.isArray(stored) && stored[0] && typeof stored[0] === 'object'
      ? stored.map(m => [m.id, m])
      : []
  );
  const payload = toCommentPayload(updated, mentionUsersMap);

  req.activityContext = {
    commentId: comment.id,
    auditProjectId: project.id,
    projectName: project.name ?? null,
    checklistItemId: comment.checklistItemId,
    itemCode: item?.code ?? null
  };

  return apiResponse(res, req, next)({ comment: payload });
}

const updateRoute = {
  validators,
  default: handler,
  action: 'update',
  entity: 'checklist_item_comment',
  activityKey: 'comments.update'
};

export default updateRoute;
