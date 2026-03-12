# Borrado lógico (soft delete)

## Migraciones

| Migración | Tablas |
|-----------|--------|
| `0033_soft_delete_audit_documents_and_tree_nodes.sql` | `audit_documents`, `audit_tree_nodes` → `deleted_at` |
| `0034_soft_delete_project_assignments_and_item_assignees.sql` | `project_assignments`, `checklist_item_assignees` → `deleted_at`; se elimina UNIQUE (project,user) y (item,user) para permitir historial y reactivación |

## Comportamiento

- **Documentos:** `files/delete` solo marca `deleted_at`; no borra el objeto en B2/S3 (limpieza puede ser job posterior).
- **Árbol:** `tree/delete` y `destroyTreeSubtree` hacen soft delete en cascada sobre los nodos; **no** se pone `node_id` en null en documentos: la evidencia sigue asociada al nodo (soft-borrado) para trazabilidad.
- **Asignaciones:** Quitar del proyecto = `destroy()` en `ProjectAssignment`; volver a agregar restaura la fila si existía soft-borrada.
- **Ítem assignees:** `syncItemAssignees` ya no hace `destroy` masivo; soft delete los que sobran y `restore` + update los que vuelven.

## Consultas raw

Donde haya SQL literal sobre `audit_documents` o `audit_tree_nodes`, incluir `deleted_at IS NULL` cuando el listado deba reflejar solo árbol/evidencia “viva”. Los docs ligados a nodos soft-borrados siguen teniendo `node_id` set.

## Excepciones

- **Sesiones** (`user_sessions`) y resets técnicos pueden seguir con borrado físico si no son “registros de negocio”.
