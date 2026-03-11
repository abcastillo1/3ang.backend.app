# Archivo Permanente — Contratos de API

## Una sola jerarquía (árbol)

Las secciones e ítems siguen existiendo en BD como `permanent_file_sections` y `checklist_items`, pero **cada sección/ítem tiene un `treeNodeId`** hacia `audit_tree_nodes`. Al crear o aplicar plantilla, el backend **crea los nodos bajo el nodo raíz `permanent_file`** (el que devuelve `POST /projects/tree/full`). Así el frontend puede **renderizar solo el árbol** (`tree/full` + `tree/create|move|delete|reorder`) sin un segundo panel por `auditProjectId` solo.

- **Listar jerarquía del expediente:** `POST /projects/tree/full` con `data.auditProjectId`.
- **Detalle de ítem** (estado, asignados, etc.): `sections/view`, `items/list`, `items/documents/list` o `tree/node-detail`; la **navegación** es por el árbol.
- **Eliminar sección/ítem:** usar las rutas permanent-file (borran también el subárbol de nodos). Borrar solo el nodo con `tree/delete` deja filas huérfanas en permanent-file.

---

El archivo permanente de un proyecto de auditoría se organiza en **secciones** (con posible jerarquía) y **ítems de checklist** por sección. Cada ítem tiene estado; **todos los documentos** del ítem se anclan con **confirm** usando `nodeId` = id del nodo del ítem (`treeNodeId`); quedan en `audit_documents.node_id` (N filas por ítem). **No hay `documentId` en el ítem** — la lista de evidencias es:
- `POST /projects/tree/node-detail` con `nodeId` del ítem → `data.documents[]`, o
- `POST /projects/permanent-file/items/documents/list` con `itemId` → `data.documents[]`.

Lo mismo aplica a **carpetas/secciones**: cualquier nodo puede tener N documentos por `node_id`; no hay límite en BD.

Todas las rutas son **POST** con parámetros en `body.data`. El proyecto se identifica siempre con `data.auditProjectId` (no hay `:id` en la URL).

---

## Secciones

### Crear sección

```
POST /api/v1/projects/permanent-file/sections/create
Requiere permiso: projects.permanentFile.manage
```

**Request**

```json
{
  "data": {
    "auditProjectId": 5,
    "parentSectionId": null,
    "code": "A",
    "name": "Historia del negocio",
    "priority": "P1",
    "sortOrder": 0
  }
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `auditProjectId` | int | Sí | ID del proyecto |
| `parentSectionId` | int | No | ID de la sección padre. `null` = sección raíz |
| `code` | string | Sí | Código único por proyecto (máx. 20) |
| `name` | string | Sí | Nombre (máx. 255) |
| `priority` | string | No | Ej. P1, P2 (máx. 10) |
| `sortOrder` | int | No | Orden de visualización (default: último) |
| `description` | string | No | Notas o contexto de la carpeta (texto largo) |

**Response (200)**  
`data.section` con id, auditProjectId, parentSectionId, code, name, priority, sortOrder, createdAt, updatedAt.

**Errores:** 404 `projects.notFound`, 400 `permanentFile.sectionCodeExists`, 400 `permanentFile.parentSectionNotFound`.

---

### Listar secciones

```
POST /api/v1/projects/permanent-file/sections/list
Requiere permiso: projects.view
```

**Request**

```json
{
  "data": {
    "auditProjectId": 5,
    "parentSectionId": null
  }
}
```

`parentSectionId` opcional: si se envía, solo se devuelven hijas de esa sección; si es `null` u omitido, se listan las secciones raíz.

**Response (200)**  
`data.sections` array ordenado por sortOrder.

---

### Ver sección (con ítems)

```
POST /api/v1/projects/permanent-file/sections/view
Requiere permiso: projects.view
```

**Request**

```json
{
  "data": {
    "auditProjectId": 5,
    "sectionId": 10
  }
}
```

**Response (200)**  
`data.section` con atributos de la sección y `section.items` (array de ítems del checklist ordenados por sortOrder).

**Errores:** 404 `projects.notFound`, 404 `permanentFile.sectionNotFound`.

---

### Actualizar sección

```
POST /api/v1/projects/permanent-file/sections/update
Requiere permiso: projects.permanentFile.manage
```

**Request**

```json
{
  "data": {
    "auditProjectId": 5,
    "sectionId": 10,
    "code": "A",
    "name": "Historia del negocio (actualizado)",
    "parentSectionId": null,
    "priority": "P1",
    "sortOrder": 1
  }
}
```

Todos los campos excepto `auditProjectId` y `sectionId` son opcionales; solo se actualizan los enviados.

**Errores:** 404 `projects.notFound`, 404 `permanentFile.sectionNotFound`, 400 `permanentFile.sectionCodeExists`, 400 `permanentFile.sectionCannotBeParentOfItself`, 400 `permanentFile.parentSectionNotFound`.

---

### Eliminar sección

```
POST /api/v1/projects/permanent-file/sections/delete
Requiere permiso: projects.permanentFile.manage
```

**Request**

```json
{
  "data": {
    "auditProjectId": 5,
    "sectionId": 10
  }
}
```

Elimina la sección y todos sus ítems (CASCADE).

**Errores:** 404 `projects.notFound`, 404 `permanentFile.sectionNotFound`.

---

## Ítems del checklist

### Crear ítem

```
POST /api/v1/projects/permanent-file/items/create
Requiere permiso: projects.permanentFile.manage
```

**Request**

```json
{
  "data": {
    "auditProjectId": 5,
    "sectionId": 10,
    "code": "A.1",
    "description": "Estatutos vigentes",
    "isRequired": true,
    "ref": "NIA 315",
    "status": "pending",
    "sortOrder": 0
  }
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `auditProjectId` | int | Sí | ID del proyecto |
| `sectionId` | int | Sí | ID de la sección |
| `code` | string | Sí | Código único dentro de la sección (máx. 30) |
| `description` | string | No | Descripción (máx. 500) |
| `isRequired` | bool | No | Default false |
| `ref` | string | No | Referencia a norma o papel de trabajo (máx. 100) |
| `status` | string | No | pending, in_review, compliant, not_applicable (default: pending) |
| `assignedUserId` | int | No | Un solo responsable (compat); preferir `assignedUserIds` |
| `assignedUserIds` | int[] | No | Varios responsables; reemplaza la lista actual si se envía en update |
| `sortOrder` | int | No | Orden (default: último) |

**Response (200)**  
`data.item` + `data.assignees` (array: `user`, `assignedBy`, `assignedAt`). `createdByUserId` queda en el ítem.

**Errores:** 404 `projects.notFound`, 404 `permanentFile.sectionNotFound`, 400 `permanentFile.itemCodeExists`.

---

### Listar ítems de una sección

```
POST /api/v1/projects/permanent-file/items/list
Requiere permiso: projects.view
```

**Request**

```json
{
  "data": {
    "auditProjectId": 5,
    "sectionId": 10
  }
}
```

**Response (200)**  
`data.items` con `assignees`; documentos del ítem: `items/documents/list` o `node-detail` con `nodeId` = `treeNodeId`.

**Errores:** 404 `projects.notFound`, 404 `permanentFile.sectionNotFound`.

---

### Actualizar ítem

```
POST /api/v1/projects/permanent-file/items/update
Requiere permiso: projects.permanentFile.manage
```

**Request**

```json
{
  "data": {
    "auditProjectId": 5,
    "itemId": 20,
    "code": "A.1",
    "description": "Estatutos vigentes",
    "isRequired": true,
    "ref": "NIA 315",
    "status": "compliant",
    "sortOrder": 0
  }
}
```

Todos los campos excepto `auditProjectId` y `itemId` son opcionales. Si se envía `status`, el backend actualiza también `lastReviewedAt`. Se puede enviar `assignedUserIds: [1,2,3]` para reemplazar todos los asignados (quien llama queda como `assignedBy` en cada fila nueva). `assignedUserIds: []` deja el ítem sin asignados. `assignedUserId` sigue aceptado como atajo de un solo usuario.

**Response (200)**  
`data.item` con el ítem actualizado.

**Errores:** 404 `projects.notFound`, 404 `permanentFile.itemNotFound`, 400 `permanentFile.itemCodeExists`.

---

### Eliminar ítem

```
POST /api/v1/projects/permanent-file/items/delete
Requiere permiso: projects.permanentFile.manage
```

**Request**

```json
{
  "data": {
    "auditProjectId": 5,
    "itemId": 20
  }
}
```

**Errores:** 404 `projects.notFound`, 404 `permanentFile.itemNotFound`.

---

## Plantilla por organización

Cada organización tiene una **plantilla** de archivo permanente (secciones e ítems estándar). Esa plantilla se gestiona en Configuración y se puede **aplicar** a cualquier proyecto, creando en él las secciones e ítems definidos (con estado `pending` y sin documento).

Todas las rutas de plantilla son **POST** bajo `/api/v1/organizations/`. No llevan `auditProjectId`; la organización se toma del usuario autenticado. Requieren permiso `organizations.permanentFileTemplate.manage`.

### Listar secciones de la plantilla

```
POST /api/v1/organizations/permanent-file-template/sections/list
```

**Request:** `{ "data": {} }` o `{ "data": { "parentSectionId": null } }` para raíz; `{ "data": { "parentSectionId": 5 } }` para hijas de la sección 5.

**Response (200):** `data.sections` (array ordenado por sortOrder).

### Crear / ver / actualizar / eliminar sección de plantilla

- **create:** `data: { code, name, parentSectionId?, priority?, sortOrder? }`
- **view:** `data: { sectionId }` → `data.section` con `section.items`
- **update:** `data: { sectionId, code?, name?, parentSectionId?, priority?, sortOrder? }`
- **delete:** `data: { sectionId }`

Mismos códigos de error que las secciones de proyecto (`permanentFile.sectionNotFound`, `permanentFile.sectionCodeExists`, etc.).

### Listar / crear / actualizar / eliminar ítems de plantilla

- **items/list:** `data: { sectionId }` → `data.items`
- **items/create:** `data: { sectionId, code, description?, isRequired?, ref?, sortOrder? }` (sin status; documentos vía confirm + `nodeId`)
- **items/update:** `data: { itemId, code?, description?, isRequired?, ref?, sortOrder? }`
- **items/delete:** `data: { itemId }`

### Cargar plantilla por defecto

```
POST /api/v1/organizations/permanent-file-template/load-defaults
```

Inserta la plantilla estándar (secciones A–D con ítems NIA) en la organización. Solo permitido si la plantilla está **vacía**. Request: `{ "data": {} }`.

**Errores:** 400 `permanentFile.templateAlreadyHasSections` si ya hay secciones.

---

## Aplicar plantilla al proyecto

```
POST /api/v1/projects/permanent-file/apply-template
Requiere permiso: projects.permanentFile.manage
```

**Request**

```json
{
  "data": {
    "auditProjectId": 5
  }
}
```

Copia todas las secciones e ítems de la plantilla de la organización al proyecto (nuevas secciones e ítems con estado `pending`). No elimina ni reemplaza secciones/ítems existentes.

**Response (200):** `data: { sectionsCreated: N, message: "permanentFile.templateApplied" }`

**Errores:** 404 `projects.notFound`, 400 `permanentFile.templateEmpty` (la organización no tiene secciones en la plantilla).

---

## Actividad

Todas las acciones que crean, actualizan o eliminan secciones e ítems **de proyecto** registran una entrada en el historial de actividad (`POST /audit/activity/list`). Las claves de descripción están en `activity.permanentFile.section.*` y `activity.permanentFile.item.*` (traducciones en backend, según locale). La gestión de la **plantilla** (org) y **aplicar plantilla** no generan actividad por sección/ítem individual.

---

## Resumen de códigos de error

| errorCode | Descripción |
|-----------|-------------|
| `projects.notFound` | Proyecto no encontrado o no pertenece a la organización |
| `permanentFile.templateEmpty` | La plantilla de la organización está vacía |
| `permanentFile.templateAlreadyHasSections` | La plantilla ya tiene secciones (load-defaults no permitido) |
| `permanentFile.sectionNotFound` | Sección no encontrada |
| `permanentFile.sectionCodeExists` | Ya existe una sección con ese código en el proyecto/plantilla |
| `permanentFile.parentSectionNotFound` | La sección padre no existe o no pertenece al proyecto/plantilla |
| `permanentFile.sectionCannotBeParentOfItself` | Una sección no puede ser padre de sí misma |
| `permanentFile.itemNotFound` | Ítem del checklist no encontrado |
| `permanentFile.itemCodeExists` | Ya existe un ítem con ese código en la sección |
| `permanentFile.documentNotFound` | El documento no existe o no pertenece al proyecto |
| `permanentFile.assigneeNotFound` | El usuario asignado no existe o no pertenece a la organización |
