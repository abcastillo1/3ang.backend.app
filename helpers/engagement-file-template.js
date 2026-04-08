import {
  findEngagementFileRoot,
  createTreeChild,
  sectionDisplayName,
  itemDisplayName,
  TYPE_SECTION_NODE,
  TYPE_CHECKLIST_ITEM_NODE
} from './engagement-file-tree-sync.js';
import { DEFAULT_ENGAGEMENT_FILE_TEMPLATE_SECTIONS } from './default-engagement-file-template-sections.js';
import { isSystemEngagementTemplateRef, SYSTEM_ENGAGEMENT_FILE_TEMPLATE_KEY } from './engagement-file-template-org.js';
import { throwError } from './errors.js';
import { HTTP_STATUS } from '../config/constants.js';

export { SYSTEM_ENGAGEMENT_FILE_TEMPLATE_KEY };

/**
 * Default engagement file template (sections + checklist items).
 * Used by load-defaults and seeds. Item retentionScope: structural = P, per_period = C.
 */
export const DEFAULT_ENGAGEMENT_FILE_TEMPLATE = {
  sections: DEFAULT_ENGAGEMENT_FILE_TEMPLATE_SECTIONS
};

/** @deprecated use DEFAULT_ENGAGEMENT_FILE_TEMPLATE */
export const DEFAULT_PERMANENT_FILE_TEMPLATE = DEFAULT_ENGAGEMENT_FILE_TEMPLATE;

/** Orden jerárquico (padre → hijos) para secciones de plantilla en BD. */
export function sortDbTemplateSectionsFlat(templateSections) {
  const byParent = new Map();
  for (const s of templateSections) {
    const pid = s.parentSectionId ?? 0;
    if (!byParent.has(pid)) byParent.set(pid, []);
    byParent.get(pid).push(s);
  }
  for (const arr of byParent.values()) arr.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const sorted = [];
  function addLevel(parentId) {
    const children = byParent.get(parentId) || [];
    for (const s of children) {
      sorted.push(s);
      addLevel(s.id);
    }
  }
  addLevel(0);
  return sorted;
}

function plainSeedSectionsToNormalizedRows(plainSections) {
  return plainSections.map(sec => ({
    templateKey: sec.code,
    parentKey: null,
    code: sec.code,
    name: sec.name,
    priority: sec.priority ?? null,
    retentionScope: sec.retentionScope === 'per_period' ? 'per_period' : 'structural',
    sortOrder: sec.sortOrder ?? 0,
    items: (sec.items || []).map(it => ({
      code: it.code,
      description: it.description ?? null,
      isRequired: !!it.isRequired,
      ref: it.ref ?? null,
      retentionScope: it.retentionScope === 'per_period' ? 'per_period' : 'structural',
      sortOrder: it.sortOrder ?? 0
    }))
  }));
}

function dbTemplateSectionsToNormalizedRows(sortedDbSections) {
  return sortedDbSections.map(tsec => ({
    templateKey: tsec.id,
    parentKey: tsec.parentSectionId ?? null,
    code: tsec.code,
    name: tsec.name,
    priority: tsec.priority ?? null,
    retentionScope: tsec.retentionScope === 'per_period' ? 'per_period' : 'structural',
    sortOrder: tsec.sortOrder ?? 0,
    items: [...(tsec.items || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  }));
}

/**
 * @param {Array<{ templateKey: string|number, parentKey: string|number|null, code, name, priority, retentionScope, sortOrder, items }>} rows
 */
async function applyNormalizedTemplateRows(auditProjectId, rows, transaction) {
  const modelsInstance = (await import('../models/index.js')).default;
  const models = modelsInstance.models;
  const { EngagementFileSection, ChecklistItem } = models;

  const mapKeyToSectionId = {};
  const engagementFileRoot = await findEngagementFileRoot(auditProjectId, transaction);

  for (const tsec of rows) {
    const parentSectionId = tsec.parentKey != null ? mapKeyToSectionId[tsec.parentKey] ?? null : null;
    const section = await EngagementFileSection.create({
      auditProjectId,
      parentSectionId,
      code: tsec.code,
      name: tsec.name,
      priority: tsec.priority,
      retentionScope: tsec.retentionScope || 'structural',
      sortOrder: tsec.sortOrder
    }, { transaction });
    mapKeyToSectionId[tsec.templateKey] = section.id;

    let parentTreeNode = engagementFileRoot;
    if (parentSectionId) {
      const parentSection = await EngagementFileSection.findByPk(parentSectionId, { transaction });
      if (parentSection && parentSection.treeNodeId) {
        parentTreeNode = await models.AuditTreeNode.findByPk(parentSection.treeNodeId, { transaction });
      }
    }

    if (parentTreeNode) {
      const sectionNode = await createTreeChild(
        auditProjectId,
        parentTreeNode,
        TYPE_SECTION_NODE,
        sectionDisplayName(section),
        section.id,
        section.sortOrder,
        transaction
      );
      await section.update({ treeNodeId: sectionNode.id }, { transaction });
    }

    const sectionTreeNode = section.treeNodeId
      ? await models.AuditTreeNode.findByPk(section.treeNodeId, { transaction })
      : null;

    for (const titem of tsec.items || []) {
      const itemScope = titem.retentionScope === 'per_period' ? 'per_period' : 'structural';
      const item = await ChecklistItem.create({
        sectionId: section.id,
        code: titem.code,
        description: titem.description,
        isRequired: !!titem.isRequired,
        ref: titem.ref,
        retentionScope: itemScope,
        status: 'pending',
        sortOrder: titem.sortOrder
      }, { transaction });

      if (sectionTreeNode) {
        const itemNode = await createTreeChild(
          auditProjectId,
          sectionTreeNode,
          TYPE_CHECKLIST_ITEM_NODE,
          itemDisplayName(item),
          item.id,
          item.sortOrder,
          transaction
        );
        await item.update({ treeNodeId: itemNode.id }, { transaction });
      }
    }
  }

  return { sectionsCreated: rows.length };
}

/**
 * Copia una plantilla al proyecto (secciones, ítems y nodos bajo la raíz engagement_file).
 *
 * @param {number} auditProjectId
 * @param {number} organizationId
 * @param {object} [options]
 * @param {import('sequelize').Transaction} [options.transaction]
 * @param {string|number|undefined} [options.engagementFileTemplateId] — `'system'` = plantilla del producto (JS); número = id en `engagement_file_templates`; omitido = plantilla por defecto de la firma.
 */
export async function applyTemplateToProject(auditProjectId, organizationId, options = {}) {
  const modelsInstance = (await import('../models/index.js')).default;
  const models = modelsInstance.models;
  const sequelize = modelsInstance.sequelize;
  const { EngagementFileTemplate, EngagementFileTemplateSection, EngagementFileTemplateItem } = models;

  const ownTransaction = !options.transaction;
  const transaction = options.transaction || await sequelize.transaction();
  const source = options.engagementFileTemplateId;

  try {
    let rows;
    if (isSystemEngagementTemplateRef(source)) {
      const plain = plainSeedSectionsToNormalizedRows(DEFAULT_ENGAGEMENT_FILE_TEMPLATE.sections);
      rows = plain;
    } else {
      let templateId = source;
      if (templateId == null || templateId === '') {
        const def = await EngagementFileTemplate.findOne({
          where: { organizationId, isDefault: true },
          transaction
        });
        if (!def) {
          throw throwError(HTTP_STATUS.BAD_REQUEST, 'permanentFile.noDefaultEngagementTemplate');
        }
        templateId = def.id;
      } else {
        const tpl = await EngagementFileTemplate.findOne({
          where: { id: templateId, organizationId },
          transaction
        });
        if (!tpl) {
          throw throwError(HTTP_STATUS.BAD_REQUEST, 'permanentFile.engagementTemplateNotFound');
        }
      }

      const templateSections = await EngagementFileTemplateSection.findAll({
        where: { organizationId, templateId },
        include: [{ model: EngagementFileTemplateItem, as: 'items', required: false }],
        transaction
      });
      if (templateSections.length === 0) {
        throw throwError(HTTP_STATUS.BAD_REQUEST, 'permanentFile.orgEngagementTemplateNoSections');
      }
      const sorted = sortDbTemplateSectionsFlat(templateSections);
      rows = dbTemplateSectionsToNormalizedRows(sorted);
    }

    const result = await applyNormalizedTemplateRows(auditProjectId, rows, transaction);
    if (ownTransaction) await transaction.commit();
    return result;
  } catch (e) {
    if (ownTransaction) await transaction.rollback();
    throw e;
  }
}
