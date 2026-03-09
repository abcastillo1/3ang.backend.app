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
| `permanent_file` | Sección de Archivo Permanente (creado automáticamente) |
| `planning` | Sección de Planificación (creado automáticamente) |
| `programs` | Sección de Programas (creado automáticamente) |
| `findings` | Sección de Hallazgos (creado automáticamente) |
| `reports` | Sección de Informes (creado automáticamente) |
| `section` | Subsección dentro de una sección |
| `folder` | Carpeta genérica |
| `program` | Programa de auditoría por área |
| `procedure` | Procedimiento dentro de un programa |
| `checklist_item` | Ítem de checklist |

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

Cada nodo incluye `childrenCount` (cantidad de hijos directos) y `documentsCount` (cantidad de documentos asociados). Calculados con subqueries en una sola consulta SQL (sin N+1).

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
      { "id": 1, "parentId": null, "depth": 0, "type": "permanent_file", "name": "Archivo Permanente", "order": 1, "isSystemNode": true, "documentsCount": 0, "path": "/1/" },
      { "id": 2, "parentId": null, "depth": 0, "type": "planning", "name": "Planificación", "order": 2, "isSystemNode": true, "documentsCount": 0, "path": "/2/" },
      { "id": 6, "parentId": 1, "depth": 1, "type": "section", "name": "Historia del negocio", "order": 1, "isSystemNode": false, "documentsCount": 3, "path": "/1/6/" },
      { "id": 7, "parentId": 1, "depth": 1, "type": "section", "name": "Organización societaria", "order": 2, "isSystemNode": false, "documentsCount": 1, "path": "/1/7/" }
    ]
  }
}
```

Retorna **todos** los nodos del proyecto en un array plano, ordenados por `depth` y luego `order`. El frontend construye el árbol en memoria usando `parentId`.

**Cuándo usar:** Para cargar el árbol completo de una vez (sidebar, vista general del proyecto). Con 200-400 nodos típicos de una auditoría, es una sola query y pesa pocos KB.

**`tree/list` vs `tree/full`:**
- `tree/full` — una query, todo el árbol, ideal para la vista principal
- `tree/list` — un nivel a la vez, útil si se necesita lazy-load en un caso específico

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
