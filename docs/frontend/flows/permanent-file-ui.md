# Archivo permanente — Guía para el frontend

## Modelo mental

| Concepto | En el árbol | En BD | Qué puede tener |
|----------|-------------|--------|------------------|
| **Carpeta / sección** | Nodo `type: folder`, `refId` = id de sección | `permanent_file_sections` | `name`, `code`, `description`, subsecciones, ítems hijos |
| **Actividad / ítem** | Nodo `type: checklist_item`, `refId` = id de ítem | `checklist_items` | `description`, `status`, `isRequired`, `ref`, **encargado** (`assignedUserId`), **documento** (`documentId` + archivos en `node_id`) |
| **Documentos** | Cuelgan del nodo | `audit_documents.node_id` | Varios archivos por carpeta o por ítem |

Todo se gestiona en **jerarquía de árbol** (como carpetas). El panel central muestra el **detalle según el nodo seleccionado**.

---

## 1. Cargar el árbol

```
POST /api/v1/projects/tree/full
{ "data": { "auditProjectId": 5 } }
```

Respuesta `data.nodes`: array en **camelCase**:

- `id`, `parentId`, `type`, `name`, `refId`, `depth`, `order`, `isSystemNode`, `documentsCount`
- **`refId`**: si `type === 'folder'` → id de `permanent_file_sections`; si `type === 'checklist_item'` → id de `checklist_items`
- Construís el árbol en memoria con `parentId`.

---

## 2. Al hacer click en un nodo — un solo endpoint

```
POST /api/v1/projects/tree/node-detail
{ "data": { "auditProjectId": 5, "nodeId": 42 } }
```

Respuesta:

| Campo | Cuándo | Uso en UI |
|-------|--------|-----------|
| `detailType` | `section` \| `checklist_item` \| `generic` | Qué pantalla renderizar |
| `section` | Carpeta con sección vinculada | Lista de ítems, descripción de carpeta, prioridad |
| `item` | Ítem checklist | Descripción, estado, encargado, documento principal, ref NIA |
| `documents` | Siempre | Lista de archivos con `node_id` = este nodo (subidas con confirm + `nodeId`) |

Si el nodo es la raíz `permanent_file` sin `refId`, `detailType` será `generic`: mostrar solo hijos + botón nueva carpeta.

---

## 3. Crear actividades e ítems

- **Nueva carpeta** bajo Archivo Permanente: `tree/create` con `parentId` = id del nodo "Archivo Permanente", **o** `permanent-file/sections/create` (recomendado si querés código NIA y checklist) — crea sección + nodo enlazado.
- **Nuevo ítem** en una sección: `permanent-file/items/create` con `sectionId`, `code`, `description`, opcional `assignedUserId`, `documentId`.

---

## 4. Subir archivos

1. Upload URL con `auditProjectId` y **`nodeId`** = id del nodo (carpeta o ítem).
2. `files/confirm` con el mismo `nodeId` → el documento aparece en `node-detail.documents` y en `documentsCount` del nodo en `tree/full`.

Opcional: vincular un documento como “principal” del ítem con `permanent-file/items/update` (`documentId`).

---

## 5. Campos nuevos / resumen

- **Sección**: `description` (texto largo) en create/update section.
- **Ítem**: `assignedUserId` (usuario de la misma organización) en create/update item.
- **Encargado** en respuestas: objeto `{ id, name, email }` (`name` viene de `fullName`).

---

## 6. Flujo resumido

1. `tree/full` → sidebar.
2. Click nodo → `tree/node-detail` → panel central.
3. Subir → upload-url + confirm con `nodeId`.
4. Asignar encargado / cambiar estado → `items/update`.
5. Plantilla inicial → `permanent-file/apply-template` luego refrescar `tree/full`.
