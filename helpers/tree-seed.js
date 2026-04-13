import modelsInstance from '../models/index.js';
import { rootsFromStoredSnapshot } from './project-tree-snapshot.js';

export const SETTING_KEY = 'project_tree_template';

/** Top-level areas for every project (created on project create). See docs/technical/engagement-templates.md */
export const DEFAULT_TREE_TEMPLATE = [
  { type: 'engagement_file', name: 'Archivo Permanente' },
  { type: 'planning', name: 'Planificación' },
  { type: 'programs', name: 'Programas de Auditoría' },
  { type: 'findings', name: 'Hallazgos' },
  { type: 'reports', name: 'Informes' }
];

async function getTemplate(organizationId) {
  const { OrganizationSetting } = modelsInstance.models;

  const setting = await OrganizationSetting.findOne({
    where: { organizationId, settingKey: SETTING_KEY }
  });

  if (!setting) return DEFAULT_TREE_TEMPLATE;

  try {
    const parsed = JSON.parse(setting.settingValue);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch { /* ignore parse errors */ }

  return DEFAULT_TREE_TEMPLATE;
}

async function resolveRootsForOrganization(organizationId, options = {}) {
  const rawId = options.engagementFileTemplateId;
  if (rawId != null && rawId !== '' && rawId !== 'system') {
    const tid = typeof rawId === 'string' ? parseInt(rawId, 10) : rawId;
    if (typeof tid === 'number' && !Number.isNaN(tid) && tid >= 1) {
      const { EngagementFileTemplate } = modelsInstance.models;
      const tpl = await EngagementFileTemplate.findOne({
        where: { id: tid, organizationId },
        attributes: ['id', 'projectTreeSnapshot']
      });
      if (tpl) {
        const roots = rootsFromStoredSnapshot(tpl.projectTreeSnapshot);
        if (roots?.length) return roots;
      }
    }
  }
  return getTemplate(organizationId);
}

/**
 * Raíces del árbol de proyecto (alineado con createDefaultTreeStructure).
 * @param {number} organizationId
 * @param {{ engagementFileTemplateId?: string|number|null }} [options] — si es id de plantilla de expediente y tiene `project_tree_snapshot`, se usan esas raíces; si no, ajuste global de la firma.
 */
export async function getProjectTreeRootDefinition(organizationId, options = {}) {
  return resolveRootsForOrganization(organizationId, options);
}

export async function createDefaultTreeStructure(auditProjectId, organizationId, options = {}) {
  const { AuditTreeNode } = modelsInstance.models;
  const transaction = options.transaction || null;

  const template = await resolveRootsForOrganization(organizationId, options);

  const nodes = [];
  for (let i = 0; i < template.length; i++) {
    const item = template[i];
    const node = await AuditTreeNode.create({
      auditProjectId,
      parentId: null,
      path: '/',
      depth: 0,
      type: item.type || 'section',
      name: item.name,
      order: i + 1,
      isSystemNode: true
    }, { transaction });

    await node.update({ path: `/${node.id}/` }, { transaction });
    nodes.push(node);
  }

  return nodes;
}
