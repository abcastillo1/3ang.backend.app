import { validateField } from '../../../../../helpers/validator.js';
import validateRequest from '../../../../../middleware/validation.js';
import authenticate from '../../../../../middleware/auth.js';
import { requirePermission } from '../../../../../middleware/permissions.js';
import apiResponse from '../../../../../helpers/response.js';
import { throwError } from '../../../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../../../config/constants.js';
import modelsInstance from '../../../../../models/index.js';
import { loadAssigneesForItems } from '../../../../../helpers/checklist-item-assignees.js';

const validators = [
  validateField('data.auditProjectId')
    .notEmpty()
    .withMessage('validators.auditProjectId.required')
    .isInt({ min: 1 })
    .withMessage('validators.auditProjectId.invalid'),
  validateField('data.sectionId')
    .notEmpty()
    .withMessage('validators.sectionId.required')
    .isInt({ min: 1 })
    .withMessage('validators.sectionId.invalid'),
  validateRequest,
  authenticate,
  requirePermission('projects.view')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { AuditProject, PermanentFileSection, ChecklistItem, User } = modelsInstance.models;

  const project = await AuditProject.findOne({
    where: { id: data.auditProjectId, organizationId: user.organizationId }
  });
  if (!project) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'projects.notFound');
  }

  const section = await PermanentFileSection.findOne({
    where: { id: data.sectionId, auditProjectId: project.id }
  });
  if (!section) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'permanentFile.sectionNotFound');
  }

  const items = await ChecklistItem.findAll({
    where: { sectionId: section.id },
    include: [
      { model: User, as: 'assignedUser', attributes: ['id', 'fullName', 'email'], required: false },
      { model: User, as: 'createdBy', attributes: ['id', 'fullName', 'email'], required: false }
    ],
    order: [['sortOrder', 'ASC'], ['id', 'ASC']]
  });

  const assigneesMap = await loadAssigneesForItems(items.map(i => i.id), null);
  const payload = items.map(it => {
    const plain = it.toJSON ? it.toJSON() : it;
    plain.assignees = assigneesMap.get(it.id) || [];
    return plain;
  });

  return apiResponse(res, req, next)({ items: payload });
}

const listRoute = {
  validators,
  default: handler,
  action: 'permanent-file-items-list',
  entity: 'projects'
};

export default listRoute;
