import modelsInstance from '../models/index.js';

export const SETTING_KEY = 'project_tree_template';

export const DEFAULT_TREE_TEMPLATE = [
  { type: 'permanent_file', name: 'Archivo Permanente' },
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

export async function createDefaultTreeStructure(auditProjectId, organizationId, options = {}) {
  const { AuditTreeNode } = modelsInstance.models;
  const transaction = options.transaction || null;

  const template = await getTemplate(organizationId);

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
