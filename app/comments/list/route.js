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

  const page = parseInt(data.page, 10) || 1;
  const limit = parseInt(data.limit, 10) || 20;
  const offset = (page - 1) * limit;

  const where = {
    auditProjectId: project.id,
    checklistItemId: item.id
  };

  if (Object.prototype.hasOwnProperty.call(data, 'parentId')) {
    where.parentId = data.parentId === null ? null : data.parentId;
  }

  const total = await ChecklistItemComment.count({ where });

  const comments = await ChecklistItemComment.findAll({
    where,
    limit,
    offset,
    order: [['createdAt', 'ASC'], ['id', 'ASC']],
    include: [
      { model: User, as: 'author', attributes: ['id', 'fullName', 'email'] }
    ]
  });

  const authorIds = Array.from(
    new Set(
      comments
        .map(c => c.mentionUserIds || [])
        .flat()
    )
  );

  let mentionUsersMap = new Map();

  if (authorIds.length > 0) {
    const mentionUsers = await User.findAll({
      where: {
        id: authorIds,
        organizationId: user.organizationId
      },
      attributes: ['id', 'fullName', 'email']
    });

    mentionUsersMap = new Map(mentionUsers.map(u => [u.id, u]));
  }

  const payload = comments.map(comment => {
    const json = comment.toJSON();
    const mentionsUser = (json.mentionUserIds || [])
      .map(id => mentionUsersMap.get(id))
      .filter(Boolean);

    return {
      id: json.id,
      checklistItemId: json.checklistItemId,
      auditProjectId: json.auditProjectId,
      parentId: json.parentId,
      body: json.body,
      attachmentCount: json.attachmentCount,
      createdAt: json.createdAt,
      author: json.author
        ? {
            id: json.author.id,
            fullName: json.author.fullName,
            email: json.author.email
          }
        : null,
      mentionsUser
    };
  });

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

const listRoute = {
  validators,
  default: handler,
  action: 'comments.list',
  entity: 'checklist_item_comment'
};

export default listRoute;

