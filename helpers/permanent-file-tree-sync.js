/**
 * @deprecated Import from ./engagement-file-tree-sync.js
 * Re-export para no romper imports existentes hasta renombrar rutas.
 */
export {
  findEngagementFileRoot,
  findPermanentFileRoot,
  createTreeChild,
  updateTreeNodeName,
  destroyTreeSubtree,
  moveTreeNode,
  sectionDisplayName,
  itemDisplayName,
  TYPE_SECTION_NODE,
  TYPE_CHECKLIST_ITEM_NODE,
  ROOT_TYPE
} from './engagement-file-tree-sync.js';
