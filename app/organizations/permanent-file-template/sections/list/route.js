import { validateField } from '../../../../../helpers/validator.js';
import validateRequest from '../../../../../middleware/validation.js';
import authenticate from '../../../../../middleware/auth.js';
import { requirePermission } from '../../../../../middleware/permissions.js';
import apiResponse from '../../../../../helpers/response.js';
import { resolveOrgTemplateId, isSystemEngagementTemplateRef } from '../../../../../helpers/engagement-file-template-org.js';
import { validateOptionalEngagementFileTemplateId } from '../../../../../helpers/engagement-file-template-request.js';
import { DEFAULT_ENGAGEMENT_FILE_TEMPLATE } from '../../../../../helpers/permanent-file-template.js';
import { getProjectTreeRootDefinition } from '../../../../../helpers/tree-seed.js';
import { mapProjectRootsWithEngagementBranch } from '../../../../../helpers/engagement-file-template-hierarchy.js';

const validators = [
  validateOptionalEngagementFileTemplateId(),
  validateField('data.parentSectionId')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('validators.parentSectionId.invalid'),
  validateRequest,
  authenticate,
  requirePermission('organizations.permanentFileTemplate.manage')
];

function mapSystemEngagementSections() {
  return [...DEFAULT_ENGAGEMENT_FILE_TEMPLATE.sections]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map(sec => ({
      nodeKind: 'template_section',
      id: null,
      isSystemTemplatePreview: true,
      code: sec.code,
      name: sec.name,
      priority: sec.priority ?? null,
      retentionScope: sec.retentionScope === 'per_period' ? 'per_period' : 'structural',
      sortOrder: sec.sortOrder ?? 0,
      parentSectionId: null,
      itemCount: sec.items?.length ?? 0
    }));
}

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { EngagementFileTemplateSection } = req.models;
  const organizationId = user.organizationId;

  if (data?.parentSectionId != null) {
    if (isSystemEngagementTemplateRef(data?.engagementFileTemplateId)) {
      return apiResponse(res, req, next)({ sections: [], isSystemTemplatePreview: true });
    }

    const templateId = await resolveOrgTemplateId(
      req.models,
      organizationId,
      data?.engagementFileTemplateId,
      null
    );

    const sections = await EngagementFileTemplateSection.findAll({
      where: {
        organizationId,
        templateId,
        parentSectionId: data.parentSectionId
      },
      order: [['sortOrder', 'ASC'], ['id', 'ASC']]
    });

    return apiResponse(res, req, next)({ sections });
  }

  if (isSystemEngagementTemplateRef(data?.engagementFileTemplateId)) {
    const rootDefs = await getProjectTreeRootDefinition(organizationId);
    const engagementSections = mapSystemEngagementSections();
    const hierarchy = mapProjectRootsWithEngagementBranch(rootDefs, () => ({
      children: engagementSections
    }));
    return apiResponse(res, req, next)({
      hierarchy,
      isSystemTemplatePreview: true
    });
  }

  const templateId = await resolveOrgTemplateId(
    req.models,
    organizationId,
    data?.engagementFileTemplateId,
    null
  );

  const engagementSectionsRaw = await EngagementFileTemplateSection.findAll({
    where: { organizationId, templateId, parentSectionId: null },
    order: [['sortOrder', 'ASC'], ['id', 'ASC']]
  });
  const engagementSections = engagementSectionsRaw.map(sec => ({
    ...sec.toJSON(),
    nodeKind: 'template_section'
  }));

  const rootDefs = await getProjectTreeRootDefinition(organizationId, {
    engagementFileTemplateId: templateId
  });
  const hierarchy = mapProjectRootsWithEngagementBranch(rootDefs, () => ({
    children: engagementSections
  }));

  return apiResponse(res, req, next)({ hierarchy });
}

const listRoute = {
  validators,
  default: handler,
  action: 'permanent-file-template-sections-list',
  entity: 'organizations'
};

export default listRoute;
