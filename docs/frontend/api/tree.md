# Árbol del Proyecto — Contratos de API

Cada proyecto de auditoría tiene una estructura jerárquica (árbol) que organiza sus secciones: Archivo Permanente, Planificación, Programas, Hallazgos, Informes. Dentro de cada sección se pueden crear carpetas y nodos adicionales.

Al crear un proyecto, se generan automáticamente 5 nodos raíz (sistema) que no se pueden eliminar ni mover.

---

## Crear nodo

```
POST /api/v1/projects/tree/create
Authorization: Bearer <token>
Requiere permiso: projects.tree.manage
```

### Request

```json
{
  "data": {
    "auditProjectId": 5,
    "parentId": 10,
    "type": "folder",
    "name": "Cuentas por Cobrar"
  }
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `auditProjectId` | int | Sí | ID del proyecto |
| `parentId` | int | No | ID del nodo padre. `null` = nodo raíz |
| `type` | string | Sí | Tipo de nodo (ver tabla abajo) |
| `name` | string | Sí | Nombre del nodo (1–255 caracteres) |

### Tipos de nodo

| Tipo | Uso |
|------|-----|
| `engagement_file` | Raíz del expediente estructurado / Archivo Permanente (creado automáticamente; en BD antigua puede figurar como `permanent_file`) |
| `planning` | Sección de Planificación (creado automáticamente) |
| `programs` | Sección de Programas (creado automáticamente) |
| `findings` | Sección de Hallazgos (creado automáticamente) |
| `reports` | Sección de Informes (creado automáticamente) |
| `section` | Subsección dentro de una sección |
| `folder` | Carpeta genérica |
| `program` | Programa de auditoría por área |
| `procedure` | Procedimiento dentro de un programa |
| `checklist_item` | Ítem de checklist (hoja: no puede tener hijos en el árbol; la actividad se desarrolla en pantalla con documentos/evidencias, no con subcarpetas) |

### Response (200)

```json
{
  "data": {
    "node": {
      "id": 15,
      "auditProjectId": 5,
      "parentId": 10,
      "path": "/3/10/15/",
      "depth": 2,
      "type": "folder",
      "name": "Cuentas por Cobrar",
      "order": 1,
      "refId": null,
      "isSystemNode": false,
      "createdAt": "2026-03-02T..."
    }
  }
}
```

### Errores posibles

| Código | errorCode | Causa |
|--------|-----------|-------|
| 404 | `projects.notFound` | Proyecto no encontrado o no pertenece a la organización |
| 400 | `projects.tree.parentNotFound` | Nodo padre no encontrado en el proyecto |
| 400 | `projects.tree.cannotCreateUnderChecklistItem` | No se pueden crear nodos bajo un ítem de checklist (el ítem es hoja) |

---

## Listar hijos de un nodo

```
POST /api/v1/projects/tree/list
Authorization: Bearer <token>
Requiere permiso: projects.view
```

### Request

```json
{
  "data": {
    "auditProjectId": 5,
    "parentId": null
  }
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `auditProjectId` | int | Sí | ID del proyecto |
| `parentId` | int | No | ID del nodo padre. `null` = nodos raíz |

### Response (200)

```json
{
  "data": {
    "nodes": [
      {
        "id": 1,
        "auditProjectId": 5,
        "parentId": null,
        "path": "/1/",
        "depth": 0,
        "type": "permanent_file",
        "name": "Archivo Permanente",
        "order": 1,
        "isSystemNode": true,
        "childrenCount": 3,
        "documentsCount": 5
      },
      {
        "id": 2,
        "auditProjectId": 5,
        "parentId": null,
        "path": "/2/",
        "depth": 0,
        "type": "planning",
        "name": "Planificación",
        "order": 2,
        "isSystemNode": true,
        "childrenCount": 0,
        "documentsCount": 0
      }
    ]
  }
}
```

`tree/full` **no** incluye conteo de documentos por nodo (se omitió para aligerar la consulta). La lista de archivos sigue en `node-detail` / `items/documents/list` cuando haga falta.

Ordenados por `order` ascendente.

---

## Breadcrumb (ruta de un nodo a la raíz)

```
POST /api/v1/projects/tree/breadcrumb
Authorization: Bearer <token>
Requiere permiso: projects.view
```

### Request

```json
{
  "data": {
    "nodeId": 15
  }
}
```

### Response (200)

```json
{
  "data": {
    "breadcrumb": [
      { "id": 3, "name": "Programas de Auditoría", "type": "programs", "depth": 0, "parentId": null },
      { "id": 10, "name": "Bancos", "type": "program", "depth": 1, "parentId": 3 },
      { "id": 15, "name": "Cuentas por Cobrar", "type": "folder", "depth": 2, "parentId": 10 }
    ]
  }
}
```

Ordenado desde la raíz hasta el nodo actual (por `depth` ascendente).

---

## Mover nodo

```
POST /api/v1/projects/tree/move
Authorization: Bearer <token>
Requiere permiso: projects.tree.manage
```

### Request

```json
{
  "data": {
    "nodeId": 15,
    "newParentId": 8
  }
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `nodeId` | int | Sí | ID del nodo a mover |
| `newParentId` | int | No | ID del nuevo padre. `null` = mover a raíz |

Mueve el nodo y todos sus descendientes. Actualiza `path`, `depth` y `order` automáticamente.

### Errores posibles

| Código | errorCode | Causa |
|--------|-----------|-------|
| 404 | `projects.tree.nodeNotFound` | Nodo no encontrado |
| 400 | `projects.tree.cannotMoveSystemNode` | No se pueden mover nodos del sistema |
| 400 | `projects.tree.cannotMoveToSelf` | No se puede mover un nodo dentro de sí mismo |
| 400 | `projects.tree.cannotMoveToDescendant` | No se puede mover un nodo dentro de uno de sus descendientes |
| 400 | `projects.tree.cannotMoveUnderChecklistItem` | No se puede colocar un nodo bajo un ítem de checklist (el ítem es hoja) |

---

## Reordenar nodos

```
POST /api/v1/projects/tree/reorder
Authorization: Bearer <token>
Requiere permiso: projects.tree.manage
```

### Request

```json
{
  "data": {
    "auditProjectId": 5,
    "parentId": null,
    "orderedIds": [2, 1, 3, 5, 4]
  }
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `auditProjectId` | int | Sí | ID del proyecto |
| `parentId` | int | No | ID del padre cuyos hijos se reordenan. `null` = nodos raíz |
| `orderedIds` | int[] | Sí | IDs de **todos** los hijos en el nuevo orden deseado |

`orderedIds` debe contener exactamente los mismos IDs que los hijos actuales del padre (ni más, ni menos).

### Response (200)

```json
{
  "data": {
    "nodes": [
      { "id": 2, "name": "Planificación", "order": 1, "..." : "..." },
      { "id": 1, "name": "Archivo Permanente", "order": 2, "..." : "..." },
      { "id": 3, "name": "Programas de Auditoría", "order": 3, "..." : "..." },
      { "id": 5, "name": "Informes", "order": 4, "..." : "..." },
      { "id": 4, "name": "Hallazgos", "order": 5, "..." : "..." }
    ]
  }
}
```

### Errores posibles

| Código | errorCode | Causa |
|--------|-----------|-------|
| 400 | `projects.tree.reorderIdsMismatch` | Los IDs no coinciden con los hijos actuales del padre |

---

## Eliminar nodo

```
POST /api/v1/projects/tree/delete
Authorization: Bearer <token>
Requiere permiso: projects.tree.manage
```

### Request

```json
{
  "data": {
    "nodeId": 15
  }
}
```

Elimina el nodo y **todo su subárbol** (hijos, nietos, etc.). Los documentos asociados a los nodos eliminados se desvinculan (`nodeId` → `null`) pero no se borran.

### Response (200)

```json
{
  "data": {
    "deleted": 4
  }
}
```

`deleted` indica cuántos nodos se eliminaron en total (el nodo + sus descendientes).

### Errores posibles

| Código | errorCode | Causa |
|--------|-----------|-------|
| 404 | `projects.tree.nodeNotFound` | Nodo no encontrado |
| 400 | `projects.tree.cannotDeleteSystemNode` | No se pueden eliminar nodos del sistema (auto-creados) |

---

## Árbol completo (1 query)

```
POST /api/v1/projects/tree/full
Authorization: Bearer <token>
Requiere permiso: projects.view
```

### Request

```json
{
  "data": {
    "auditProjectId": 5
  }
}
```

### Response (200)

```json
{
  "data": {
    "nodes": [
      { "id": 1, "parentId": null, "depth": 0, "type": "engagement_file", "name": "Archivo Permanente", "order": 1, "isSystemNode": true, "path": "/1/", "status": null },
      { "id": 2, "parentId": null, "depth": 0, "type": "planning", "name": "Planificación", "order": 2, "isSystemNode": true, "path": "/2/", "status": null },
      { "id": 10, "parentId": 9, "depth": 3, "type": "checklist_item", "name": "A1.1 — Revisar procedimiento", "order": 1, "isSystemNode": false, "path": "/1/8/9/10/", "refId": 3, "status": "pending" }
    ]
  }
}
```

Retorna **todos** los nodos del proyecto en un array plano, ordenados por `depth` y luego `order`. El frontend construye el árbol en memoria usando `parentId`.

**Cuándo usar:** Para cargar el árbol completo de una vez (sidebar, vista general del proyecto). Con 200-400 nodos típicos de una auditoría, es una sola query y pesa pocos KB.

**`tree/list` vs `tree/full`:**
- `tree/full` — una query, todo el árbol, ideal para la vista principal
- `tree/list` — un nivel a la vez, útil si se necesita lazy-load en un caso específico

**Campos en cada nodo (camelCase):** `id`, `auditProjectId`, `parentId`, `path`, `depth`, `type`, `name`, `order`, **`refId`**, `isSystemNode`, **`status`** (solo ítems), `createdAt`, `updatedAt`.  
**No** se devuelve `documentsCount` en `tree/full` (por rendimiento); usar `node-detail` para listar documentos.

- **`status`**: solo para `type === 'checklist_item'` — valor de `checklist_items.status` (`pending` | `in_review` | `compliant` | `not_applicable`). En el resto de nodos es `null`. Sirve para badge en el árbol sin llamar a `node-detail` por cada ítem.
- Si el nodo viene del expediente sincronizado: `type === 'folder'` y `refId` = id de sección; `type === 'checklist_item'` y `refId` = id de ítem.

---

## Detalle de nodo (panel central)

Al seleccionar un nodo en el árbol, el frontend puede cargar **un solo payload** para pintar el panel:

```
POST /api/v1/projects/tree/node-detail
Requiere permiso: projects.view
```

**Request:** `{ "data": { "auditProjectId": 5, "nodeId": 42 } }`

**Response:** `detailType` = `section` | `checklist_item` | `generic`, más:
- `section` — datos de carpeta + lista de ítems (con encargado si aplica)
- `item` — actividad con descripción, estado, documento vinculado, encargado
- `documents` — archivos con `node_id` = este nodo

Ver flujo completo: [`flows/permanent-file-ui.md`](../flows/permanent-file-ui.md).

---

## Estructura automática al crear proyecto

Al crear un proyecto (`POST /projects/create`), se generan automáticamente nodos raíz según la **plantilla de la organización**. Si la organización no tiene plantilla personalizada, se usa la estructura por defecto:

| Orden | Tipo | Nombre |
|-------|------|--------|
| 1 | `permanent_file` | Archivo Permanente |
| 2 | `planning` | Planificación |
| 3 | `programs` | Programas de Auditoría |
| 4 | `findings` | Hallazgos |
| 5 | `reports` | Informes |

Estos nodos tienen `isSystemNode: true` y no se pueden eliminar ni mover.

**La plantilla es 100% configurable por organización** — se pueden agregar secciones, quitar las que no apliquen, cambiar nombres y tipos. Ver endpoints en `organizations.md`.

---

## Plantilla del árbol (configuración por organización)

Cada organización puede personalizar qué nodos raíz se crean automáticamente en proyectos nuevos.

### Ver plantilla actual

```
POST /api/v1/organizations/tree-template/view
Authorization: Bearer <token>
```

```json
{ "data": {} }
```

#### Response (200)

```json
{
  "data": {
    "template": [
      { "type": "permanent_file", "name": "Archivo Permanente" },
      { "type": "planning", "name": "Planificación" },
      { "type": "programs", "name": "Programas de Auditoría" },
      { "type": "findings", "name": "Hallazgos" },
      { "type": "reports", "name": "Informes" }
    ],
    "isCustom": false,
    "defaultTemplate": [ "..." ]
  }
}
```

`isCustom: false` indica que se está usando la plantilla por defecto. `defaultTemplate` siempre retorna la plantilla estándar para referencia.

---

### Actualizar plantilla

```
POST /api/v1/organizations/tree-template/update
Authorization: Bearer <token>
Solo el owner de la organización puede modificar la plantilla.
```

```json
{
  "data": {
    "template": [
      { "type": "permanent_file", "name": "Expediente del Cliente" },
      { "type": "planning", "name": "Plan de Auditoría" },
      { "type": "programs", "name": "Ejecución" },
      { "type": "findings", "name": "Hallazgos PCI" },
      { "type": "reports", "name": "Informes" },
      { "type": "section", "name": "Anexos" }
    ]
  }
}
```

Cada ítem necesita `type` (string) y `name` (string, 1-255 chars). Se puede poner cualquier tipo y nombre. Los proyectos creados a partir de ese momento usarán esta plantilla. Los proyectos existentes no se ven afectados.

---

### Restaurar plantilla por defecto

```
POST /api/v1/organizations/tree-template/reset
Authorization: Bearer <token>
Solo el owner de la organización.
```

```json
{ "data": {} }
```

Elimina la plantilla personalizada. Los proyectos nuevos volverán a usar la estructura estándar.
