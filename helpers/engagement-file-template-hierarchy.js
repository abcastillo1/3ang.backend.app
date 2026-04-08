/**
 * Envuelve el contenido del expediente estructurado bajo las raíces del árbol del proyecto
 * (Archivo permanente, Planificación, …), alineado con tree-seed / createDefaultTreeStructure.
 */

const ENGAGEMENT_ROOT_TYPE = 'engagement_file';

function isEngagementTreeRootType(treeType) {
  return treeType === ENGAGEMENT_ROOT_TYPE || treeType === 'permanent_file';
}

/**
 * @param {Array<{ type?: string, name: string }>} rootDefs
 * @param {() => { children: unknown[] }} buildEngagementBranch - solo para raíz expediente (`engagement_file` / `permanent_file`)
 */
export function mapProjectRootsWithEngagementBranch(rootDefs, buildEngagementBranch) {
  return rootDefs.map((root, index) => {
    const treeType = root.type || 'section';
    const base = {
      nodeKind: 'project_root',
      treeType,
      name: root.name,
      order: index + 1
    };
    if (isEngagementTreeRootType(treeType)) {
      const { children } = buildEngagementBranch();
      return { ...base, children: children ?? [] };
    }
    return { ...base, children: [] };
  });
}
