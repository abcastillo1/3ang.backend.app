# Comentarios en ítem de checklist + adjuntos en `audit_documents`

## Modelo de datos

| Entidad | Tabla | Notas |
|--------|--------|--------|
| Comentario | `checklist_item_comments` | Texto, autor, hilo (`parent_id`), menciones en JSON, contador de adjuntos |
| Adjunto de comentario | `audit_documents` | `node_id` = nodo del ítem; `comment_id` = comentario al que pertenece |
| Evidencia formal | `audit_documents` | Mismo `node_id`, **`comment_id` NULL** |

## Listados de “evidencia” (sin adjuntos de chat)

Cualquier listado que represente **evidencia del ítem** debe filtrar:

```sql
node_id = :treeNodeId AND comment_id IS NULL
```

Ya aplicado en:

- `tree/node-detail` → `documents` y `documentsCount`
- `permanent-file/items/documents-list`
- `files/list` con `data.nodeId` (por defecto excluye comentarios; ver abajo)
- `tree/list` → `documentsCount` por nodo

### `files/list` con `nodeId`

- Por defecto: **solo** documentos con `comment_id IS NULL` (evidencia).
- Para incluir también adjuntos de comentarios: `data.includeCommentAttachments: true`.

## Listar comentarios del ítem (paginado)

Cuando hay muchos mensajes, el listado debe ser **paginado** para no cargar todos de una vez. Endpoint a implementar (ej. `POST .../comments/list` o `POST .../items/:itemId/comments/list`).

### Request

```json
{
  "data": {
    "auditProjectId": 5,
    "checklistItemId": 42,
    "page": 1,
    "limit": 20
  }
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|--------------|
| auditProjectId | int | Sí | Proyecto (el ítem debe pertenecer a este proyecto). |
| checklistItemId | int | Sí | Ítem del cual listar comentarios. |
| page | int | No (default 1) | Página. |
| limit | int | No (default 20, max 100) | Comentarios por página. |

Opcional: **parentId** — si se envía, solo se devuelven respuestas (replies) de ese comentario; si no se envía o es `null`, se listan los comentarios de primer nivel (raíz del hilo). Así el front puede paginar por nivel (raíz vs respuestas de un comentario).

### Response exitosa (200)

```json
{
  "statusCode": 200,
  "message": "Operación exitosa",
  "data": {
    "comments": [
      {
        "id": 1,
        "checklistItemId": 42,
        "auditProjectId": 5,
        "parentId": null,
        "body": "¿Podés revisar el Excel adjunto?",
        "attachmentCount": 1,
        "createdAt": "2026-03-12T10:00:00.000Z",
        "author": {
          "id": 7,
          "fullName": "Ana García",
          "email": "ana@firma.com"
        },
        "mentionsUser": [
          { "id": 3, "fullName": "Luis Pérez", "email": "luis@firma.com" }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 47,
      "totalPages": 3
    }
  }
}
```

- **comments:** array de comentarios con el mismo contrato (sin `authorUserId` ni `mentionUserIds`; con `author` y `mentionsUser`).
- **pagination:** `page` (página actual), `limit` (tamaño de página), `total` (total de comentarios que cumplen el filtro), `totalPages` (techo de total/limit).

Orden recomendado: **`createdAt` ASC** (más antiguos primero) para leer el hilo en orden cronológico; o permitir `data.sort: 'asc' | 'desc'` y aplicar a `createdAt`.

### Validaciones

- Proyecto existe y el usuario tiene acceso.
- El ítem existe y pertenece al proyecto.
- `page` ≥ 1, `limit` entre 1 y 100.

## Subir / vincular archivo a un comentario

1. Crear comentario (endpoint CRUD cuando exista) → `id`.
2. `files/confirm` o `files/link` con:
   - `auditProjectId`, `nodeId` = `item.treeNodeId`
   - **`commentId`** = id del comentario  
   El backend valida que el comentario sea del mismo proyecto y del ítem con ese `tree_node_id`.
3. Se incrementa `attachment_count` en el comentario (evita `COUNT(*)` por comentario en listados).

Al borrar el documento (`files/delete`), se decrementa `attachment_count`.

## Diseño ligero (sin subconsultas pesadas)

- **`audit_project_id`** en el comentario: listar hilos por proyecto sin join a `checklist_items` → `engagement_file_sections`.
- **`attachment_count`** denormalizado: la UI puede mostrar “paperclip x3” sin agregar `COUNT` por fila.
- **`mention_user_ids`** JSON: al guardar el comentario, el back (o el front con ayuda de un endpoint de búsqueda de usuarios) resuelve `@usuario` → ids y guarda `[1,2,3]`. Las notificaciones leen solo esa columna.

## @menciones — lógica recomendada

1. **Formato en texto**  
   Convención única, por ejemplo:
   - `@userId:123` (estable, sin ambigüedad), o
   - `@email` / `@fullName` resuelto en el cliente con autocomplete y guardado como ids.

2. **Al crear/actualizar comentario**  
   - Parsear el cuerpo (regex o tokens que el front inserte al elegir mención).  
   - Resolver a `user_id` (misma org, opcionalmente solo asignados al ítem).  
   - Guardar **`mention_user_ids`** = array único de ids.

3. **Notificaciones**  
   - Job/cola: para cada id en `mention_user_ids`, crear notificación “Te mencionaron en ítem X”.  
   - No hace falta tabla `comment_mentions` si solo necesitás “quién notificar”; si necesitás “leído por usuario”, ahí sí tabla aparte.

4. **Response — qué incluir y qué no**  
   **Regla:** en ningún response de comentarios (list/get/create) se devuelve `authorUserId` ni `mentionUserIds`.  
   El front **no** los usa: el autor va solo en **`author`** (con `id` dentro) y los mencionados solo en **`mentionsUser`** (array de `{ id, fullName, email }`).  
   En BD siguen existiendo `author_user_id` y `mention_user_ids` para persistencia y notificaciones; al serializar **omitirlos** del JSON de salida.

   Contrato de response — **solo esto para usuarios**:

   ```json
   {
     "id": 1,
     "checklistItemId": 42,
     "auditProjectId": 5,
     "parentId": null,
     "body": "@userId:3 ¿Podés revisar el Excel adjunto?",
     "attachmentCount": 1,
     "createdAt": "...",
     "author": {
       "id": 7,
       "fullName": "Ana García",
       "email": "ana@firma.com"
     },
     "mentionsUser": [
       { "id": 3, "fullName": "Luis Pérez", "email": "luis@firma.com" }
     ]
   }
   ```

   - **Implementación:** `User` del autor → `author`; `User.findAll` por `mention_user_ids` → `mentionsUser`. No exponer `authorUserId` / `mentionUserIds` en el payload.

5. **Sin path en comentarios (v1)**  
   Hilo con `parent_id` + `created_at` ordenado es suficiente; path materializado solo si los hilos son muy profundos y necesitás prefijos como en el árbol.

## Cómo se edita un comentario

Endpoint a implementar (ej. `PATCH /projects/:auditProjectId/items/:itemId/comments/:commentId` o `POST .../comments/update` con `id` en el body). Contrato recomendado:

### Request

- **Identificación:** `commentId` (en path o en `data.id`). Obligatorio también `auditProjectId` (y opcionalmente `itemId` o `checklistItemId`) para validar que el comentario pertenece al proyecto/ítem.
- **Body editable:** solo **`body`** (texto del comentario). No se cambia autor, ítem ni `parent_id`.
- **Menciones:** al actualizar `body`, el backend (o el front antes de enviar) debe reextraer los @ y actualizar **`mention_user_ids`** en BD con el array de ids correspondiente, igual que en crear.

Ejemplo de body:

```json
{
  "data": {
    "id": 123,
    "auditProjectId": 5,
    "body": "Texto actualizado con @userId:3 para revisar."
  }
}
```

### Quién puede editar

- **Solo el autor:** `comment.author_user_id === req.user.id`. Quien no sea el autor recibe 403 (ej. `comments.forbiddenUpdate`).
- Opcional: permitir también a usuarios con permiso tipo `projects.engagementFile.manage` (criterio de producto).

### Validaciones

- Comentario existe y no está borrado (`deleted_at` null).
- Comentario pertenece al `auditProjectId` del request (y al ítem si se envía).
- Usuario autorizado (autor o permiso de gestión).
- `body` no vacío, longitud máxima coherente con la columna (TEXT).

### Response

- **200:** el comentario actualizado con el mismo contrato que en list/create: `id`, `checklistItemId`, `auditProjectId`, `parentId`, `body`, `attachmentCount`, `createdAt`, **`author`** (objeto), **`mentionsUser`** (array). No exponer `authorUserId` ni `mentionUserIds`.
- **Historial:** en la ruta, exportar `activityKey: 'comments.update'` y asignar `req.activityContext` con `commentId`, `auditProjectId`, `projectName`, `itemCode` (ver sección Historial de actividad).

### Errores sugeridos

| errorCode | Causa |
|-----------|--------|
| `comments.notFound` | Comentario inexistente o borrado |
| `comments.forbiddenUpdate` | No es el autor y no tiene permiso de gestión |
| `comments.projectMismatch` | El comentario no pertenece al proyecto indicado |

---

## Errores API (confirm/link con `commentId`)

| errorCode | Causa |
|-----------|--------|
| `files.confirm.commentRequiresProject` | `commentId` sin `auditProjectId` |
| `files.commentNotFound` | Comentario inexistente |
| `files.commentProjectMismatch` | Comentario de otro proyecto |
| `files.commentNodeMismatch` | `nodeId` no coincide con el ítem del comentario |

## Borrado lógico

Los comentarios usan **solo borrado lógico** (`deleted_at`, Sequelize `paranoid: true`). Listar hilos con el scope por defecto; recuperar borrados solo con permiso/admin si se expone.

## Historial de actividad (comentarios)

Las acciones **crear**, **editar** y **eliminar** comentario se registran en el historial de actividad (`activity_logs`). No hace falta ninguna tabla extra: se usa el mismo sistema que proyectos, documentos e ítems.

### Cómo se registra

- **Entidad:** `checklist_item_comment`
- **Acciones:** `comment.created`, `comment.updated`, `comment.deleted`
- **Claves de descripción (i18n):** `activity.comment.created`, `activity.comment.updated`, `activity.comment.deleted`  
  Parámetros de interpolación: `projectName`, `itemCode` (opcional).

En las rutas de comentarios (create / update / delete), después de ejecutar la acción exitosamente:

1. Asignar **`activityKey`** en el export del módulo: `'comments.create'`, `'comments.update'` o `'comments.delete'`.
2. Asignar **`req.activityContext`** con al menos:
   - `commentId`: id del comentario (para `entityId` en el log).
   - `auditProjectId`: id del proyecto.
   - `projectName`: nombre del proyecto (para la descripción traducida).
   - `itemCode`: código del ítem (opcional; mejora la descripción, ej. “Añadió un comentario en el ítem 1.2.3”).

El `controller-wrapper` se encarga de llamar a `getActivityPayload(activityKey, req.activityContext)` y de grabar la fila en `activity_logs`.

### Cómo consultar el historial

- **Endpoint:** `POST /audit/activity/list` (permiso `activity.view`).
- **Filtrar por proyecto:** `data.auditProjectId` → toda la actividad del proyecto, incluidos comentarios.
- **Filtrar solo comentarios:** `data.entity: 'checklist_item_comment'`.
- **Filtrar por un comentario concreto:** `data.entity: 'checklist_item_comment'` y `data.entityId: commentId` (si en el futuro el endpoint acepta `entityId`; hoy el listado no expone filtro por `entityId`, pero los registros ya llevan `entityId` para uso futuro).

En la pantalla de actividad del ítem se puede:
- Mostrar una pestaña **Historial** que llame a `/audit/activity/list` con `auditProjectId` y `entity: 'checklist_item_comment'`, y opcionalmente filtrar en cliente por ítem (usando `metadata.itemCode` o un futuro filtro por `checklistItemId`/nodo).
- O integrar las entradas de comentarios dentro de la pestaña Comentarios como “Registro” (ver `ACTIVITY-ITEM-SCREEN.md` §5.5).

### Resumen

| Acción en comentario | activityKey        | activityContext (mínimo)                                    |
|----------------------|--------------------|-------------------------------------------------------------|
| Crear                | `'comments.create'`  | `commentId`, `auditProjectId`, `projectName`, `itemCode`?   |
| Actualizar           | `'comments.update'` | `commentId`, `auditProjectId`, `projectName`, `itemCode`?  |
| Borrar (soft)        | `'comments.delete'` | `commentId`, `auditProjectId`, `projectName`, `itemCode`? |

## Migración

`migrations/0032_checklist_item_comments_and_document_comment_id.sql`
