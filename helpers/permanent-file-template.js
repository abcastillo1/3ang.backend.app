/**
 * Plantilla por defecto del archivo permanente (secciones e ítems estándar NIA).
 * Usado por load-defaults para insertar en la organización y por seed en migración.
 */
export const DEFAULT_PERMANENT_FILE_TEMPLATE = {
  sections: [
    { code: 'A', name: 'Historia del negocio y estructura', priority: 'P1', sortOrder: 0, items: [
      { code: 'A.1', description: 'Estatutos o contrato de compañía vigentes', isRequired: true, ref: 'NIA 315', sortOrder: 0 },
      { code: 'A.2', description: 'Historia y evolución del negocio', isRequired: false, ref: null, sortOrder: 1 },
      { code: 'A.3', description: 'Organigrama actual', isRequired: false, ref: null, sortOrder: 2 }
    ]},
    { code: 'B', name: 'Organización societaria y gobierno', priority: 'P1', sortOrder: 1, items: [
      { code: 'B.1', description: 'Acta de constitución y reformas', isRequired: true, ref: null, sortOrder: 0 },
      { code: 'B.2', description: 'Registro de socios o accionistas', isRequired: true, ref: null, sortOrder: 1 },
      { code: 'B.3', description: 'Poderes y representación legal', isRequired: true, ref: null, sortOrder: 2 }
    ]},
    { code: 'C', name: 'Controles internos y procesos', priority: 'P1', sortOrder: 2, items: [
      { code: 'C.1', description: 'Manual de políticas y procedimientos', isRequired: false, ref: null, sortOrder: 0 },
      { code: 'C.2', description: 'Evaluación de control interno (documentación)', isRequired: false, ref: 'NIA 315', sortOrder: 1 }
    ]},
    { code: 'D', name: 'Información financiera y normativa', priority: 'P2', sortOrder: 3, items: [
      { code: 'D.1', description: 'EEFF anteriores y dictámenes', isRequired: true, ref: null, sortOrder: 0 },
      { code: 'D.2', description: 'Normativa contable aplicable (NIIF/NIF)', isRequired: false, ref: null, sortOrder: 1 }
    ]}
  ]
};

import {
  findPermanentFileRoot,
  createTreeChild,
  sectionDisplayName,
  itemDisplayName,
  TYPE_SECTION_NODE,
  TYPE_CHECKLIST_ITEM_NODE
} from './permanent-file-tree-sync.js';

/**
 * Copia la plantilla de archivo permanente de la organización al proyecto.
 * Crea permanent_file_sections y checklist_items y nodos en audit_tree_nodes bajo
 * el nodo raíz permanent_file para que tree/full sea la única jerarquía en UI.
 * No borra secciones/ítems existentes.
 * @param {number} auditProjectId
 * @param {number} organizationId
 * @param {{ transaction?: import('sequelize').Transaction }} options
 */
export async function applyTemplateToProject(auditProjectId, organizationId, options = {}) {
  const modelsInstance = (await import('../models/index.js')).default;
  const models = modelsInstance.models;
  const sequelize = modelsInstance.sequelize;
  const { PermanentFileTemplateSection, PermanentFileTemplateItem, PermanentFileSection, ChecklistItem } = models;

  const ownTransaction = !options.transaction;
  const transaction = options.transaction || await sequelize.transaction();

  try {
    const templateSections = await PermanentFileTemplateSection.findAll({
      where: { organizationId },
      include: [{ model: PermanentFileTemplateItem, as: 'items', required: false }],
      transaction
    });

    const roots = templateSections.filter(s => !s.parentSectionId).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
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

    const mapTemplateIdToSectionId = {};
    const permanentFileRoot = await findPermanentFileRoot(auditProjectId, transaction);

    for (const tsec of sorted) {
      const parentSectionId = tsec.parentSectionId ? mapTemplateIdToSectionId[tsec.parentSectionId] ?? null : null;
      const section = await PermanentFileSection.create({
        auditProjectId,
        parentSectionId,
        code: tsec.code,
        name: tsec.name,
        priority: tsec.priority,
        sortOrder: tsec.sortOrder
      }, { transaction });
      mapTemplateIdToSectionId[tsec.id] = section.id;

      let parentTreeNode = permanentFileRoot;
      if (parentSectionId) {
        const parentSection = await PermanentFileSection.findByPk(parentSectionId, { transaction });
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

      const items = tsec.items || [];
      items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      const sectionTreeNode = section.treeNodeId
        ? await models.AuditTreeNode.findByPk(section.treeNodeId, { transaction })
        : null;

      for (const titem of items) {
        const item = await ChecklistItem.create({
          sectionId: section.id,
          code: titem.code,
          description: titem.description,
          isRequired: !!titem.isRequired,
          ref: titem.ref,
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

    if (ownTransaction) await transaction.commit();
    return { sectionsCreated: sorted.length };
  } catch (e) {
    if (ownTransaction) await transaction.rollback();
    throw e;
  }
}
