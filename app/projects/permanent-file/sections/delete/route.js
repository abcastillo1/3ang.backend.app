import { validateField } from '../../../../../helpers/validator.js';
import validateRequest from '../../../../../middleware/validation.js';
import authenticate from '../../../../../middleware/auth.js';
import { requirePermission } from '../../../../../middleware/permissions.js';
import apiResponse from '../../../../../helpers/response.js';
import { throwError } from '../../../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../../../config/constants.js';
import modelsInstance from '../../../../../models/index.js';
import { destroyTreeSubtree } from '../../../../../helpers/permanent-file-tree-sync.js';

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
  requirePermission('projects.engagementFile.manage')
];

async function deleteSectionCascade(sectionId, auditProjectId, transaction) {
  const { EngagementFileSection, ChecklistItem } = modelsInstance.models;
  const children = await EngagementFileSection.findAll({
    where: { auditProjectId, parentSectionId: sectionId },
    transaction
  });
  for (const child of children) {
    await deleteSectionCascade(child.id, auditProjectId, transaction);
  }
  const section = await EngagementFileSection.findByPk(sectionId, { transaction });
  if (!section) return;
  if (section.treeNodeId) {
    await destroyTreeSubtree(section.treeNodeId, transaction);
  }
  await ChecklistItem.destroy({
    where: { sectionId: section.id },
    transaction
  });
  await section.destroy({ transaction });
}

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { AuditProject, EngagementFileSection } = modelsInstance.models;
  const sequelize = modelsInstance.sequelize;

  const project = await AuditProject.findOne({
    where: { id: data.auditProjectId, organizationId: user.organizationId }
  });
  if (!project) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'projects.notFound');
  }

  const section = await EngagementFileSection.findOne({
    where: { id: data.sectionId, auditProjectId: project.id }
  });
  if (!section) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'permanentFile.sectionNotFound');
  }

  const sectionName = section.name;
  const transaction = await sequelize.transaction();
  try {
    await deleteSectionCascade(section.id, project.id, transaction);
    await transaction.commit();
  } catch (e) {
    await transaction.rollback();
    throw e;
  }

  req.activityContext = {
    sectionId: data.sectionId,
    auditProjectId: project.id,
    sectionName,
    projectName: project.name
  };
  return apiResponse(res, req, next)();
}

const deleteRoute = {
  validators,
  default: handler,
  action: 'permanent-file-section-delete',
  entity: 'projects',
  activityKey: 'projects.permanentFile.section.delete'
};

export default deleteRoute;
