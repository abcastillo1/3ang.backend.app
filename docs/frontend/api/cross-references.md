# Referencias cruzadas (documentos ↔ nodos del árbol)

Trazabilidad dentro de un **mismo proyecto de auditoría**: aristas **dirigidas** entre `document` (filas de `audit_documents`) y `tree_node` (filas de `audit_tree_nodes`).

Convenciones generales: [`_overview.md`](_overview.md).

## Permiso

- **`projects.references.manage`** — crear, listar (endpoint dedicado), actualizar y eliminar referencias.
- Migración: `migrations/0035_audit_cross_references.sql` (tabla + permiso + asignación a roles estándar).

La lectura embebida en `node-detail` y `files/list` usa los permisos de esas rutas (`projects.view` y `files.upload` respectivamente), no exige `references.manage` solo para leer el payload enriquecido.

## Modelo mental

- **Origen** → **destino** (`sourceKind` + `sourceId` → `targetKind` + `targetId`).
- Combinaciones válidas: `document`↔`document`, `document`↔`tree_node`, `tree_node`↔`tree_node`.
- **Una sola fila** por mismo par (proyecto + origen + destino); duplicar devuelve conflicto.
- No se puede referenciar un extremo consigo mismo (mismo `kind` + mismo `id`).
- Ambos extremos deben **existir** y pertenecer al **mismo** `auditProjectId` (documentos con ese `audit_project_id`).

## `relationType` permitidos

`related` (default), `supports`, `supersedes`, `see_also`, `contradicts`.

## Endpoints CRUD (siempre POST, body `{ "data": { ... } }`)

Base: `/api/v1/projects`. Alias equivalente: `/api/v1/projects/engagement-file/...` (mismos handlers).

### Crear

`POST .../references/create`

| Campo | Obligatorio | Descripción |
|--------|-------------|-------------|
| `auditProjectId` | Sí | Proyecto |
| `sourceKind` | Sí | `document` \| `tree_node` |
| `sourceId` | Sí | Id numérico |
| `targetKind` | Sí | `document` \| `tree_node` |
| `targetId` | Sí | Id numérico |
| `relationType` | No | Ver lista arriba |
| `note` | No | Texto libre (máx. 4000) |

Respuesta: `data.reference` con campos de la fila (`id`, `sourceKind`, `sourceId`, …).

Errores frecuentes: `references.selfReference`, `references.duplicate` (409), `references.documentNotInProject`, `references.nodeNotInProject`.

### Listar (genérico por entidad)

`POST .../references/list`

| Campo | Obligatorio | Descripción |
|--------|-------------|-------------|
| `auditProjectId` | Sí | Proyecto |
| `kind` | Sí | `document` \| `tree_node` (tipo del **ítem** por el que filtrás) |
| `id` | Sí | Id de ese documento o nodo |
| `direction` | No | `outgoing` \| `incoming` \| `both` (default `both`) |
| `includeDetails` | No | `true` para `sourceDetail` / `targetDetail` (nombre doc / nodo) |

Respuesta: `data.references` (array).

### Actualizar

`POST .../references/update`

| Campo | Obligatorio | Descripción |
|--------|-------------|-------------|
| `auditProjectId` | Sí | Proyecto |
| `id` | Sí | Id de la **fila** `audit_cross_references` |
| `relationType` | Uno de los dos | Al menos uno con `note` |
| `note` | 〃 |  |

### Eliminar

`POST .../references/delete`

| Campo | Obligatorio |
|--------|-------------|
| `auditProjectId` | Sí |
| `id` | Sí (id de la referencia) |

Respuesta: `data.deleted` = id eliminado.

---

## Buscar documentos del proyecto (selector / doc → doc)

No hace falta que el usuario escriba el **id**: usá **`POST /api/v1/files/list`** con:

| Campo | Uso |
|--------|-----|
| `auditProjectId` | **Obligatorio** para acotar al proyecto |
| `page`, `limit` | Paginación |
| `search` | Opcional: filtra por nombre (`originalName`, subcadena) |
| `excludeDocumentId` o `excludeDocumentIds` | Opcional: excluir el documento desde el que se enlaza (evitar autovínculo en el picker) |
| `includeDownloadUrl` | Opcional: `false` para **no** generar URL firmada en cada fila (más rápido en modales que solo eligen id/nombre) |

Sin `nodeId`, el listado incluye **todos** los documentos de ese proyecto (respetando organización). Luego **`references/create`** con `sourceKind` / `targetKind` = `document` y los ids elegidos.

---

## Integración con listados (sin CRUD)

### Detalle de nodo — `POST /api/v1/projects/tree/node-detail`

Opcional: `data.includeCrossReferences: true`.

- `data.crossReferences`: solo referencias **salientes del nodo**: `source_kind = 'tree_node'` y `source_id = nodeId`.
- No incluye aristas **entrantes** al nodo; para eso usar `references/list` con `kind: 'tree_node'`, `direction: 'incoming'` o `both`.

### Listar documentos — `POST /api/v1/files/list`

Opcional: `data.includeCrossReferences: true`.

- Cada elemento de `data.documents` incluye `crossReferences`: referencias donde ese documento es **origen o destino** como `document`.
- Válido con o sin filtro `data.nodeId`.

---

## Actividad (`activity.view`)

Acciones registradas: `reference.created`, `reference.updated`, `reference.deleted` (entidad `cross_reference`). Claves i18n: `activity.reference.created`, etc.

## Documentos borrados (soft delete)

Si se marca `deleted_at` en un documento, las filas de referencia **no se borran**. El front puede omitir o marcar enlaces rotos según resolución de metadatos.
