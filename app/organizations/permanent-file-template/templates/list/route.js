import validateRequest from '../../../../../middleware/validation.js';
import authenticate from '../../../../../middleware/auth.js';
import { requirePermission } from '../../../../../middleware/permissions.js';
import apiResponse from '../../../../../helpers/response.js';
import modelsInstance from '../../../../../models/index.js';
import { SYSTEM_ENGAGEMENT_FILE_TEMPLATE_KEY } from '../../../../../helpers/engagement-file-template-org.js';
import { DEFAULT_ENGAGEMENT_FILE_TEMPLATE } from '../../../../../helpers/permanent-file-template.js';
import { QueryTypes } from 'sequelize';
import { rootsFromStoredSnapshot } from '../../../../../helpers/project-tree-snapshot.js';

const validators = [
  validateRequest,
  authenticate,
  requirePermission('organizations.permanentFileTemplate.manage')
];

async function handler(req, res, next) {
  const { user } = req;
  const { EngagementFileTemplate } = modelsInstance.models;
  const sequelize = modelsInstance.sequelize;
  const organizationId = user.organizationId;

  const orgTemplates = await EngagementFileTemplate.findAll({
    where: { organizationId },
    order: [['isDefault', 'DESC'], ['id', 'ASC']]
  });

  const sectionRows = await sequelize.query(
    `SELECT template_id AS templateId, COUNT(*) AS sectionCount
     FROM engagement_file_template_sections
     WHERE organization_id = :orgId AND deleted_at IS NULL
     GROUP BY template_id`,
    { replacements: { orgId: organizationId }, type: QueryTypes.SELECT }
  );
  const sectionCountByTemplateId = Object.fromEntries(
    sectionRows.map(r => [r.templateId, Number(r.sectionCount)])
  );

  const itemRows = await sequelize.query(
    `SELECT s.template_id AS templateId, COUNT(i.id) AS itemCount
     FROM engagement_file_template_items i
     INNER JOIN engagement_file_template_sections s ON s.id = i.template_section_id AND s.deleted_at IS NULL
     WHERE s.organization_id = :orgId AND i.deleted_at IS NULL
     GROUP BY s.template_id`,
    { replacements: { orgId: organizationId }, type: QueryTypes.SELECT }
  );
  const itemCountByTemplateId = Object.fromEntries(
    itemRows.map(r => [r.templateId, Number(r.itemCount)])
  );

  const systemSections = DEFAULT_ENGAGEMENT_FILE_TEMPLATE.sections;
  const systemSectionCount = systemSections.length;
  const systemItemCount = systemSections.reduce((n, s) => n + (s.items?.length ?? 0), 0);

  const templates = [
    {
      id: SYSTEM_ENGAGEMENT_FILE_TEMPLATE_KEY,
      isSystem: true,
      isDefault: false,
      nameKey: 'permanentFile.systemEngagementTemplateLabel',
      sectionCount: systemSectionCount,
      itemCount: systemItemCount
    },
    ...orgTemplates.map(t => ({
      id: t.id,
      isSystem: false,
      isDefault: !!t.isDefault,
      name: t.name,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      sectionCount: sectionCountByTemplateId[t.id] ?? 0,
      itemCount: itemCountByTemplateId[t.id] ?? 0,
      hasCustomProjectTree: rootsFromStoredSnapshot(t.projectTreeSnapshot) != null
    }))
  ];

  return apiResponse(res, req, next)({ templates });
}

const listRoute = {
  validators,
  default: handler,
  action: 'engagement-file-template-templates-list',
  entity: 'organizations'
};

export default listRoute;
