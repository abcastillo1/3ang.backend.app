import { validateField } from '../../../../../helpers/validator.js';
import validateRequest from '../../../../../middleware/validation.js';
import authenticate from '../../../../../middleware/auth.js';
import { requirePermission } from '../../../../../middleware/permissions.js';
import apiResponse from '../../../../../helpers/response.js';
import { throwError } from '../../../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../../../config/constants.js';
import modelsInstance from '../../../../../models/index.js';
import { isSystemEngagementTemplateRef, resolveOrgTemplateId } from '../../../../../helpers/engagement-file-template-org.js';
import { validateOptionalEngagementFileTemplateId } from '../../../../../helpers/engagement-file-template-request.js';
import { DEFAULT_ENGAGEMENT_FILE_TEMPLATE } from '../../../../../helpers/permanent-file-template.js';
import { sortDbTemplateSectionsFlat } from '../../../../../helpers/engagement-file-template.js';
import { getProjectTreeRootDefinition } from '../../../../../helpers/tree-seed.js';
import { mapProjectRootsWithEngagementBranch } from '../../../../../helpers/engagement-file-template-hierarchy.js';

function mapSystemItems(items) {
  return [...(items || [])]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map(it => ({
      nodeKind: 'template_item',
      id: null,
      isSystemTemplatePreview: true,
      code: it.code,
      description: it.description ?? null,
      isRequired: !!it.isRequired,
      ref: it.ref ?? null,
      retentionScope: it.retentionScope === 'per_period' ? 'per_period' : 'structural',
      sortOrder: it.sortOrder ?? 0
    }));
}

function buildSystemEngagementSectionsWithItems() {
  return [...DEFAULT_ENGAGEMENT_FILE_TEMPLATE.sections]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map(sec => ({
      nodeKind: 'template_section',
      id: null,
      code: sec.code,
      name: sec.name,
      priority: sec.priority ?? null,
      retentionScope: sec.retentionScope === 'per_period' ? 'per_period' : 'structural',
      sortOrder: sec.sortOrder ?? 0,
      parentSectionId: null,
      isSystemTemplatePreview: true,
      items: mapSystemItems(sec.items)
    }));
}

const validators = [
  validateOptionalEngagementFileTemplateId(),
  validateField('data.sectionId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('validators.sectionId.invalid'),
  validateField('data.sectionCode')
    .optional()
    .isLength({ min: 1, max: 20 })
    .withMessage('validators.code.invalid'),
  validateRequest,
  authenticate,
  requirePermission('organizations.permanentFileTemplate.manage')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { EngagementFileTemplateSection, EngagementFileTemplateItem } = modelsInstance.models;
  const organizationId = user.organizationId;

  if (isSystemEngagementTemplateRef(data?.engagementFileTemplateId)) {
    const code = data?.sectionCode?.trim();
    if (code) {
      const sec = DEFAULT_ENGAGEMENT_FILE_TEMPLATE.sections.find(s => s.code === code);
      if (!sec) {
        throw throwError(HTTP_STATUS.NOT_FOUND, 'permanentFile.sectionNotFound');
      }
      return apiResponse(res, req, next)({
        items: mapSystemItems(sec.items),
        isSystemTemplatePreview: true
      });
    }
    const engagementSections = buildSystemEngagementSectionsWithItems();
    const rootDefs = await getProjectTreeRootDefinition(organizationId);
    const hierarchy = mapProjectRootsWithEngagementBranch(rootDefs, () => ({
      children: engagementSections
    }));
    return apiResponse(res, req, next)({
      hierarchy,
      isSystemTemplatePreview: true
    });
  }

  const templateId = await resolveOrgTemplateId(
    modelsInstance.models,
    organizationId,
    data?.engagementFileTemplateId,
    null
  );

  const sid = parseInt(data?.sectionId, 10);
  if (!Number.isNaN(sid) && sid >= 1) {
    const section = await EngagementFileTemplateSection.findOne({
      where: { id: sid, organizationId, templateId }
    });
    if (!section) {
      throw throwError(HTTP_STATUS.NOT_FOUND, 'permanentFile.sectionNotFound');
    }

    const itemRows = await EngagementFileTemplateItem.findAll({
      where: { templateSectionId: section.id },
      order: [['sortOrder', 'ASC'], ['id', 'ASC']]
    });
    const items = itemRows.map(it => ({ ...it.toJSON(), nodeKind: 'template_item' }));

    return apiResponse(res, req, next)({ items });
  }

  const templateSections = await EngagementFileTemplateSection.findAll({
    where: { organizationId, templateId },
    include: [{ model: EngagementFileTemplateItem, as: 'items', required: false }],
    order: [['sortOrder', 'ASC'], ['id', 'ASC']]
  });

  const sorted = sortDbTemplateSectionsFlat(templateSections);
  const engagementSections = sorted.map(sec => {
    const rawItems = [...(sec.items || [])]
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map(it => ({ ...it.toJSON(), nodeKind: 'template_item' }));
    return {
      nodeKind: 'template_section',
      id: sec.id,
      code: sec.code,
      name: sec.name,
      priority: sec.priority,
      retentionScope: sec.retentionScope,
      sortOrder: sec.sortOrder,
      parentSectionId: sec.parentSectionId,
      templateId: sec.templateId,
      items: rawItems
    };
  });

  const rootDefs = await getProjectTreeRootDefinition(organizationId);
  const hierarchy = mapProjectRootsWithEngagementBranch(rootDefs, () => ({
    children: engagementSections
  }));

  return apiResponse(res, req, next)({ hierarchy });
}

const listRoute = {
  validators,
  default: handler,
  action: 'permanent-file-template-items-list',
  entity: 'organizations'
};

export default listRoute;
