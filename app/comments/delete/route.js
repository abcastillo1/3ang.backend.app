import { validateField } from '../../../helpers/validator.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import apiResponse from '../../../helpers/response.js';
import { throwError } from '../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../config/constants.js';
import modelsInstance from '../../../models/index.js';

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
  validateRequest,
  authenticate
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { AuditProject, ChecklistItemComment, EngagementFileSection, ChecklistItem } = modelsInstance.models;

  const project = await AuditProject.findOne({
    where: { id: data.auditProjectId, organizationId: user.organizationId }
  });
  if (!project) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'projects.notFound');
  }

  const comment = await ChecklistItemComment.findOne({
    where: { id: data.id, auditProjectId: project.id }
  });
  if (!comment) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'comments.notFound');
  }

  if (comment.authorUserId !== user.id) {
    throw throwError(HTTP_STATUS.FORBIDDEN, 'comments.forbiddenDelete');
  }

  const repliesCount = await ChecklistItemComment.count({
    where: { parentId: comment.id }
  });
  if (repliesCount > 0) {
    throw throwError(HTTP_STATUS.BAD_REQUEST, 'comments.hasReplies');
  }

  const item = await ChecklistItem.findByPk(comment.checklistItemId, {
    include: [{ model: EngagementFileSection, as: 'section' }],
    attributes: ['id', 'code']
  });

  await comment.destroy();

  req.activityContext = {
    commentId: comment.id,
    auditProjectId: project.id,
    projectName: project.name ?? null,
    checklistItemId: comment.checklistItemId,
    itemCode: item?.code ?? null
  };

  return apiResponse(res, req, next)();
}

const deleteRoute = {
  validators,
  default: handler,
  action: 'delete',
  entity: 'checklist_item_comment',
  activityKey: 'comments.delete'
};

export default deleteRoute;
