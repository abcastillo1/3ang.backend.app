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

## Listar comentarios del ítem (paginado, sin cortar hilos)

**POST /api/v1/comments/list**

Requiere permiso `projects.view`. Orden: **`createdAt` ASC, `id` ASC**. Sin `parentId` se paginan solo raíces y cada una trae **todas** sus respuestas en `replies`; con `parentId` se devuelven todas las respuestas de ese comentario (no se parte ningún hilo). Default: 10 raíces por página.

### Request

```json
{
  "data": {
    "auditProjectId": 5,
    "checklistItemId": 42,
    "page": 1,
    "limit": 10
  }
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|--------------|
| auditProjectId | int | Sí | Proyecto (el ítem debe pertenecer a este proyecto). |
| checklistItemId | int | Sí | Ítem del cual listar comentarios. |
| page | int | No (default 1) | Página de raíces (solo sin `parentId`). |
| limit | int | No (default 10, max 100) | Raíces por página (sin `parentId`); con `parentId` se traen todas las respuestas. |
| parentId | int \| null | No | Sin envío: raíces con `replies` completos (paginado). Con valor: todas las respuestas de ese comentario. |

### Response exitosa (200)

Cuando **no** se envía `parentId`, cada ítem de `comments` es una raíz con **`replies`** anidados (hasta 2 niveles):

```json
{
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
        "author": { "id": 7, "fullName": "Ana García", "email": "ana@firma.com" },
        "mentionsUser": [{ "id": 3, "fullName": "Luis Pérez", "email": "luis@firma.com" }],
        "replies": [
          {
            "id": 2,
            "parentId": 1,
            "body": "Sí, lo reviso.",
            "attachmentCount": 0,
            "createdAt": "2026-03-12T11:00:00.000Z",
            "author": { "id": 3, "fullName": "Luis Pérez", "email": "luis@firma.com" },
            "mentionsUser": [],
            "replies": [
              {
                "id": 4,
                "parentId": 2,
                "body": "Listo.",
                "author": { ... },
                "mentionsUser": [],
                "replies": []
              }
            ]
          }
        ]
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 47, "totalPages": 5 }
  }
}
```

- **comments:** raíces de la página actual; cada una trae **`replies`** con todas sus respuestas (y las respuestas de esas), orden **`createdAt` ASC, `id` ASC**, sin cortar hilos.
- **pagination:** aplica al número de **raíces**; `total` = total de raíces del ítem.

### Validaciones

- Proyecto existe y el usuario tiene acceso.
- El ítem existe y pertenece al proyecto.
- `page` ≥ 1, `limit` entre 1 y 100.

## Crear comentario

**POST /api/v1/comments/create**

### Request

Los usuarios mencionados se envían como **array de objetos** con `id`, nombre (`fullName`) y correo (`email`). El backend usa el `id` para persistir en `mention_user_ids` y devuelve esos mismos datos en `mentionsUser` en la respuesta.

```json
{
  "data": {
    "auditProjectId": 5,
    "checklistItemId": 42,
    "body": "¿Podés revisar el Excel adjunto?",
    "parentId": null,
    "mentionsUser": [
      { "id": 3, "fullName": "Luis Pérez", "email": "luis@firma.com" }
    ]
  }
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| auditProjectId | int | Sí | Proyecto (el ítem debe pertenecer a este proyecto). |
| checklistItemId | int | Sí | Ítem donde se crea el comentario. |
| body | string | Sí | Texto del comentario (máx. 65535 caracteres). |
| parentId | int | No | Si se envía, el comentario es **respuesta** a ese comentario (el padre debe existir y pertenecer al mismo ítem/proyecto); si no, es de primer nivel. |
| mentionsUser | object[] | No | Usuarios mencionados en el comentario. Cada elemento: **`id`** (int, user_id), **`fullName`** (string, nombre), **`email`** (string, correo). El backend guarda los ids en `mention_user_ids` y devuelve estos objetos en `mentionsUser` en la respuesta. |

**Responder a un comentario:** enviar el mismo body que para un comentario nuevo pero con **`parentId`** = id del comentario al que se responde. El backend valida que ese comentario exista y sea del mismo ítem; si no, devuelve `comments.parentNotFound`.

### Response (200)

`data.comment` con el mismo contrato (id, checklistItemId, auditProjectId, parentId, body, attachmentCount, createdAt, **author**, **mentionsUser**). No se devuelve `authorUserId` ni `mentionUserIds`.

---

## Subir / vincular archivo a un comentario

1. Crear comentario (endpoint anterior) → `id`.
2. `files/confirm` o `files/link` con:
   - `auditProjectId`, `nodeId` = `item.treeNodeId`
   - **`commentId`** = id del comentario  
   El backend valida que el comentario sea del mismo proyecto y del ítem con ese `tree_node_id`.
3. Se incrementa `attachment_count` en el comentario (evita `COUNT(*)` por comentario en listados).

Al borrar el documento (`files/delete`), se decrementa `attachment_count`.

## Diseño ligero (sin subconsultas pesadas)

- **`audit_project_id`** en el comentario: listar hilos por proyecto sin join a `checklist_items` → `engagement_file_sections`.
- **`attachment_count`** denormalizado: la UI puede mostrar “paperclip x3” sin agregar `COUNT` por fila.
- **`mention_user_ids`** JSON: el backend guarda el array **`mentionsUser`** tal como lo envía el front (`{ id, fullName, email }`). Al **listar**, se devuelve ese mismo JSON; no se consulta la tabla de usuarios. Para notificaciones se usan los `id` de cada objeto (`.map(m => m.id)`).

## @menciones — lógica recomendada

1. **Formato en texto**  
   Convención única, por ejemplo:
   - `@userId:123` (estable, sin ambigüedad), o
   - `@email` / `@fullName` resuelto en el cliente con autocomplete y guardado como ids.

2. **Al crear/actualizar comentario**  
   - El front envía **`mentionsUser`** en el body: array de objetos con **`id`** (user_id), **`fullName`** (nombre) y **`email`** (correo) de cada usuario mencionado. El backend persiste los ids en **`mention_user_ids`** y devuelve esos mismos objetos en `mentionsUser` en la respuesta.

3. **Notificaciones**  
   - Job/cola: para cada id en `mention_user_ids` (extraídos de los objetos `mentionsUser` del request), crear notificación “Te mencionaron en ítem X”.  
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

   - **Implementación:** `User` del autor → `author`. Los mencionados: en create/update el front envía **`mentionsUser`** (array de objetos `{ id, fullName, email }`); el backend guarda los `id` en `mention_user_ids`. En list/get el backend puede devolver esos mismos objetos (o reconsultar por ids). En el **response** no se exponen `authorUserId` ni `mentionUserIds`.

5. **Sin path en comentarios (v1)**  
   Hilo con `parent_id` + `created_at` ordenado es suficiente; path materializado solo si los hilos son muy profundos y necesitás prefijos como en el árbol.

6. **Profundidad del hilo: 2 niveles = máximo 3 mensajes encadenados**  
   - **Raíz** (1.º mensaje) → **respuesta** (2.º) → **respuesta a la respuesta** (3.º). Ahí termina.  
   - No se permite un 4.º mensaje respondiendo al 3.º; el backend rechaza con `comments.maxDepthReached`.  
   - Así el hilo se mantiene legible en contexto de auditoría (raíz + 2 respuestas = 3 mensajes).

## Cómo se edita un comentario

**POST /api/v1/comments/update**

Solo el usuario que **escribió ese comentario** puede editarlo (se compara `comment.author_user_id` con el usuario actual).

### Request

- **Identificación:** `commentId` (en path o en `data.id`). Obligatorio también `auditProjectId` (y opcionalmente `itemId` o `checklistItemId`) para validar que el comentario pertenece al proyecto/ítem.
- **Body editable:** **`body`** (texto del comentario). Opcionalmente **`mentionsUser`** (array de objetos con `id`, `fullName`, `email`); si se envía, el backend actualiza **`mention_user_ids`** con los ids y devuelve esos objetos en `mentionsUser`.
- No se cambia autor, ítem ni `parent_id`.

Ejemplo de body:

```json
{
  "data": {
    "id": 123,
    "auditProjectId": 5,
    "body": "Texto actualizado con @userId:3 para revisar.",
    "mentionsUser": [
      { "id": 3, "fullName": "Luis Pérez", "email": "luis@firma.com" }
    ]
  }
}
```

### Quién puede editar

- **Solo quien escribió ese comentario:** se valida `comment.author_user_id === req.user.id`. Cualquier otro usuario recibe 403 (`comments.forbiddenUpdate`).

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
| `comments.parentNotFound` | Al crear respuesta: el comentario padre no existe o no pertenece al mismo ítem |
| `comments.forbiddenUpdate` | Solo quien escribió ese comentario puede editarlo |
| `comments.projectMismatch` | El comentario no pertenece al proyecto indicado |

---

## Cómo se elimina un comentario

**POST /api/v1/comments/delete**

Solo el usuario que **escribió ese comentario** puede eliminarlo. Borrado lógico (soft delete).

**Restricción:** no se puede eliminar un comentario que tenga **respuestas** (hijos). Primero hay que eliminar las respuestas; si no, el backend devuelve 400 `comments.hasReplies`.

### Request

```json
{
  "data": {
    "id": 123,
    "auditProjectId": 5
  }
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| id | int | Sí | ID del comentario. |
| auditProjectId | int | Sí | Proyecto (para validar que el comentario pertenece al proyecto). |

### Response (200)

Sin cuerpo de datos; el comentario queda con `deleted_at` y deja de aparecer en listados (paranoid).

### Errores

| errorCode | Causa |
|-----------|--------|
| `comments.notFound` | Comentario inexistente o borrado |
| `comments.forbiddenDelete` | Solo quien escribió ese comentario puede eliminarlo |
| `comments.hasReplies` | El comentario tiene respuestas; hay que eliminarlas antes |

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
