# Pantalla de actividad (ítem de checklist) — Guía para frontend

Documento **único** que describe qué es cada parte de la pantalla de trabajo por **actividad** (ítem), cómo funciona la **evidencia**, las **pestañas**, campos monetarios y el flujo end-to-end. Complementa `ENGAGEMENT-FILE-FRONTEND-GUIDE.md` y `api/checklist-item-comments.md`.

---

## 1. Qué es esta pantalla

- **Actividad** = un **ítem de checklist** del expediente: tiene código, descripción, **estado**, **asignados** y vive en el árbol como nodo `type: checklist_item` (hoja: **no** tiene hijos).
- **Una sola pantalla por ítem** concentra todo lo necesario para ejecutar y cerrar esa tarea: evidencia formal, conversación, notas y (cuando exista) campos estructurados.
- **Misma carcasa** para todas las fases (Permanente, Análisis, Tributario, etc.); lo que puede cambiar es qué pestañas o campos muestra la **plantilla**, no otra app.

---

## 2. Cómo se llega

1. El usuario navega el **árbol** (`tree/full`) y hace clic en un nodo `checklist_item`.
2. La app abre la ruta de actividad con **`nodeId`** (y `auditProjectId`).
3. Con **`node-detail`** (`data.nodeId` + `data.auditProjectId`) se obtiene `detailType === 'checklist_item'` y el objeto **`item`** (código, descripción, `status`, `assignees`, `treeNodeId`, etc.).
4. La **evidencia** se lista con el **mismo `treeNodeId`** como `nodeId` en la API de documentos (ver §4).

---

## 3. Cabecera del ítem (siempre visible)

| Elemento | Origen API | Notas |
|----------|------------|--------|
| Código + nombre | `item.code` + descripción / nombre en árbol | Identidad del ítem |
| **Estado** | `item.status` | `pending`, `in_review`, `compliant`, `not_applicable` — dropdown o stepper según permiso |
| Asignados | `item.assignees` (+ `assignedUser` legacy) | Avatares / lista |
| Requerido | `item.isRequired` | Badge si aplica |
| Última revisión | `item.lastReviewedAt` | Opcional |
| Editar ítem | Solo con `projects.engagementFile.manage` | CRUD ítem en endpoints engagement-file |

---

## 4. Evidencia — qué es y cómo funciona

### 4.1 Definición

- **Evidencia formal del ítem** = archivos cuyo registro en `audit_documents` tiene:
  - **`node_id`** = `item.treeNodeId` (nodo del ítem en el árbol)
  - **`comment_id`** = **NULL**  
  Así se separa del **chat**: los adjuntos de comentarios llevan `comment_id` apuntando al comentario.

### 4.2 Listar evidencia

- **Opción A:** `permanent-file/items/documents-list` con `itemId` (+ `auditProjectId`) → devuelve solo docs con `comment_id` null para ese ítem.
- **Opción B:** `files/list` con `data.nodeId` = `treeNodeId` → por defecto **excluye** adjuntos de comentario (`includeCommentAttachments` solo si quieren todo mezclado).
- **Opción C:** ampliar `tree/node-detail` cuando el nodo es ítem — hoy puede traer documentos; deben filtrarse igual por `comment_id` null para la pestaña “Evidencias”.

### 4.3 Subir evidencia

1. `upload-url` (o flujo que ya tengan) → cliente sube a B2/S3.
2. **`confirm`** con `auditProjectId`, **`nodeId`** = `treeNodeId`, **sin** `commentId` → el documento queda como evidencia del ítem.
3. Opcional: **`link`** para enlazar docs ya subidos al proyecto, con el mismo `nodeId` y sin `commentId`.

### 4.4 Borrar evidencia

- **`files/delete`** por id del documento → borrado lógico (`deleted_at`); el archivo puede quedar en storage para job de limpieza posterior.

### 4.5 Resumen

| Concepto | Regla |
|----------|--------|
| Evidencia del ítem | `node_id` = `treeNodeId` y `comment_id` IS NULL |
| Adjunto de comentario | mismo `node_id` pero `comment_id` = id del comentario |
| Listado “solo workpapers” | siempre filtrar `comment_id` null |

---

## 5. Pestañas (contenido y responsabilidad)

### 5.1 Evidencias

- **Qué muestra:** lista de archivos de la §4 (nombre, tipo, tamaño, quién subió, fecha, descarga).
- **Acciones:** Subir, vincular, borrar (según permiso).
- **Vacío:** CTA “Subir primera evidencia”.
- **Excel/PDF:** MVP = **descarga** y edición en escritorio. Visor en web = fase posterior (OnlyOffice/callback, etc.).

### 5.2 Comentarios

- **Qué es:** hilo de conversación del ítem (preguntas, @menciones, cierre informal).
- **Adjuntos en comentario:** archivos con `comment_id` set; **no** entran en la lista de evidencia formal.
- **Response API:** ver `api/checklist-item-comments.md` — **`author`** (objeto) y **`mentionsUser`** (array de usuarios); **no** devolver `authorUserId` ni `mentionUserIds` en el JSON.
- **Crear comentario:** cuando exista endpoint → body + parseo de @ → guardar `mention_user_ids` en BD; subir archivos después con `confirm`/`link` + `commentId`.

### 5.3 Notas / Working paper

- **Qué es:** texto libre (o markdown) asociado al ítem: conclusión, procedimiento realizado, referencia NIA, etc.
- **Backend:** cuando exista — columna `notes` o `metadata` en ítem, o tabla de notas; un PATCH o endpoint dedicado.
- **UI:** textarea o editor simple + Guardar / autosave.

### 5.4 Campos (montos, fechas, “lo monetario”, etc.)

- **Qué es:** datos estructurados que no son solo archivos: montos, moneda, porcentajes, fechas, Sí/No.
- **Dónde viven:** idealmente **`metadata`** JSON en el ítem (valores) + **plantilla** o config (definición de campos por código de ítem).
- **UI:** formulario dinámico según esquema; si no hay esquema, la pestaña puede ocultarse.
- **Montarios:** típicamente campos numéricos con formato moneda en front; validación y redondeo según norma de la firma; el back guarda número + código de moneda en `metadata` si hace falta.

### 5.5 Historial / Actividad (opcional)

- Bitácora del ítem o del proyecto filtrada por contexto — si exponen `activity_logs` o eventos por `entity`/`entityId`, se puede mostrar en otra pestaña o dentro de Comentarios como “Registro”.

---

## 6. Permisos resumidos

| Acción | Permiso típico |
|--------|----------------|
| Ver ítem, árbol, lista evidencia | `projects.view` |
| Subir/vincular/borrar archivos | `files.upload` + pertenencia al proyecto |
| Editar ítem, estado, secciones | `projects.engagementFile.manage` |
| Solo lectura | Ocultar o deshabilitar acciones según `role.permissions` |

---

## 7. Qué no va en esta pantalla

- **Subcarpetas bajo el ítem:** el árbol no permite hijos bajo `checklist_item`; todo el trabajo es dentro de estas pestañas.
- **Mezclar evidencia formal con adjuntos de chat** en un solo listado sin filtro — rompe criterio de expediente vs conversación.

---

## 8. Orden de implementación sugerido

1. Cabecera desde `node-detail` + lista evidencia (`documents-list` o `files/list` por `nodeId`).
2. Subida con `confirm` + `nodeId` sin `commentId`.
3. Cambio de estado del ítem (endpoint update ítem).
4. Comentarios (CRUD + `mentionsUser` + adjuntos con `commentId`).
5. Notas / metadata.
6. Campos dinámicos / monetarios según plantilla.
7. Más adelante: visor Excel en web y callback a storage.

---

## 9. Referencias en este repo

| Tema | Documento |
|------|-----------|
| Árbol, node-detail, permisos | `ENGAGEMENT-FILE-FRONTEND-GUIDE.md` |
| Comentarios, menciones, adjuntos | `api/checklist-item-comments.md` |
| Árbol API | `api/tree.md` |
| Borrado lógico documentos/nodos | `technical/soft-delete.md` |

---

*Última alineación con backend: evidencia = `node_id` + `comment_id` null; ítem hoja; MVP sin visor Excel en web.*
