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

## Errores API (confirm/link con `commentId`)

| errorCode | Causa |
|-----------|--------|
| `files.confirm.commentRequiresProject` | `commentId` sin `auditProjectId` |
| `files.commentNotFound` | Comentario inexistente |
| `files.commentProjectMismatch` | Comentario de otro proyecto |
| `files.commentNodeMismatch` | `nodeId` no coincide con el ítem del comentario |

## Borrado lógico

Los comentarios usan **solo borrado lógico** (`deleted_at`, Sequelize `paranoid: true`). Listar hilos con el scope por defecto; recuperar borrados solo con permiso/admin si se expone.

## Migración

`migrations/0032_checklist_item_comments_and_document_comment_id.sql`
