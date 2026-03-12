# Guía granular — Carpetas del proyecto (árbol + engagement file)

Documento para el **frontend**: cómo está modelado el expediente, qué endpoint usar en cada paso y cómo armar la UI **sin** lógica de documentos (upload/confirm omitido; más adelante se engancha con `nodeId`).

---

## 1. Conceptos (orden de lectura)

| Concepto | Qué es | Dónde vive en API/BD |
|----------|--------|----------------------|
| **Proyecto** | Un encargo de auditoría | `auditProjectId` en casi todas las llamadas |
| **Árbol** | Única jerarquía visual (sidebar) | `audit_tree_nodes` — un nodo = una fila |
| **Raíz expediente** | Primer bloque del encargo (Archivo Permanente) | Nodo `type: engagement_file` (antes `permanent_file` en BD vieja) |
| **Carpeta de sección** | Carpeta que además tiene fila en `engagement_file_sections` | Nodo `type: folder` + `refId` = id de sección |
| **Actividad** | Tarea con estado y asignados | `checklist_items` + nodo `type: checklist_item` + `refId` = id ítem |
| **Carpeta genérica** | Solo árbol, sin sección/ítem | Nodo `type: folder`, `refId: null` (ej. bajo Programas) |

**Regla de oro:** La UI navega por **árbol** (`tree/full`). El **detalle** de lo seleccionado sale de **`tree/node-detail`** (o de `engagement-file/sections|items/*` si editás metadatos).

**Prioridad MVP — pantalla de actividad (ítem):** primer enfoque = **una vista con pestañas** (cabecera + evidencias por `nodeId` + comentarios cuando exista API + notas/campos después). Los Excel/PDF se resuelven por **descarga** (URL firmada) y edición en escritorio. **Visor/edición Excel en web** (OnlyOffice, callback a B2/S3, etc.) queda para **una fase posterior** sin cambiar el modelo del ítem.

---

## 2. Permisos que debe conocer el front

| Acción | Permiso |
|--------|---------|
| Ver proyecto, árbol, node-detail | `projects.view` |
| Crear/mover/borrar nodos **genéricos** (carpeta sin sección) | `projects.tree.manage` |
| Crear/editar/borrar **secciones e ítems** (expediente estructurado) | `projects.engagementFile.manage` |
| Plantilla por organización | `organizations.permanentFileTemplate.manage` (nombre histórico; mismo módulo plantilla) |

Si el usuario no tiene `engagementFile.manage`, mostrar secciones/ítems en solo lectura o ocultar botones crear/editar/borrar.

---

## 3. Flujo de pantalla recomendado

### 3.1 Al abrir el proyecto

1. **Listar proyectos** (si hace falta):  
   `POST /api/v1/projects/list` → obtener `id` del proyecto dummy o seleccionado.

2. **Cargar árbol completo:**  
   `POST /api/v1/projects/tree/full`  
   ```json
   { "data": { "auditProjectId": <id> } }
   ```

3. **Construir árbol en memoria:**  
   - Respuesta: `data.nodes` (array plano).  
   - Cada nodo: `id`, `parentId`, `type`, `name`, `refId`, `order`, `depth`, `isSystemNode`, `status` (solo `checklist_item`). Sin conteo de documentos en el árbol; lista en `node-detail` cuando haga falta.  
   - Armar árbol por `parentId` (raíces tienen `parentId: null`).

### 3.2 Al seleccionar un nodo (click)

1. **Una sola llamada de detalle:**  
   `POST /api/v1/projects/tree/node-detail`  
   ```json
   { "data": { "auditProjectId": <id>, "nodeId": <id del nodo> } }
   ```

2. **Decidir panel según `detailType`:**

   | `detailType` | Significado | Qué mostrar |
   |--------------|-------------|-------------|
   | `section` | Carpeta ligada a `engagement_file_sections` | Nombre, código, descripción si viene; lista de ítems hijos (o hijos en árbol); acciones CRUD sección si tiene permiso |
   | `checklist_item` | Actividad | `item`: código, descripción, `status`, `assignees[]`, `createdBy`; sin lista de documentos hasta que implementen upload |
   | `generic` | Nodo sin sección/ítem (raíz u otra carpeta) | Solo nombre + lista de hijos del árbol; si `type === 'programs'` etc., UI genérica |

3. **No usar** un segundo panel “solo por proyecto sin árbol”: la fuente de verdad del orden es el árbol.

---

## 4. Tipos de nodo (`type`) — qué esperar

| `type` | `refId` | Comportamiento UI |
|--------|---------|-------------------|
| `engagement_file` | null | Raíz del bloque expediente; hijos = carpetas sección o futuras ramas |
| `planning` / `programs` / `findings` / `reports` | null | Raíces hermanas; hijos pueden ser carpetas genéricas (`folder` refId null) |
| `folder` | id sección | Carpeta con metadatos en BD; node-detail devuelve `section` |
| `folder` | null | Carpeta manual; solo árbol |
| `checklist_item` | id ítem | Actividad; node-detail devuelve `item` + assignees |

---

## 5. CRUD expediente estructurado (carpetas con código NIA)

Base path: **`/api/v1/projects/engagement-file/`**  
(Legacy: `/permanent-file/` — mismos handlers.)

### 5.1 Secciones

| Operación | Endpoint | Body mínimo |
|-----------|----------|-------------|
| Listar | `.../engagement-file/sections/list` | `auditProjectId` |
| Ver una | `.../engagement-file/sections/view` | `auditProjectId`, `sectionId` |
| Crear | `.../engagement-file/sections/create` | `auditProjectId`, `code`, `name`; opcional `parentSectionId`, `description` |
| Actualizar | `.../engagement-file/sections/update` | `auditProjectId`, `sectionId` + campos a cambiar |
| Borrar | `.../engagement-file/sections/delete` | `auditProjectId`, `sectionId` — borra subárbol de nodos asociados |

Tras crear/editar/borrar sección, **refrescar** `tree/full` (o invalidar cache del árbol).

### 5.2 Ítems (actividades)

| Operación | Endpoint | Body mínimo |
|-----------|----------|-------------|
| Listar por sección | `.../engagement-file/items/list` | `auditProjectId`, `sectionId` |
| Crear | `.../engagement-file/items/create` | `auditProjectId`, `sectionId`, `code`, `description`; opcional `assignedUserIds[]`, `status` |
| Actualizar | `.../engagement-file/items/update` | `auditProjectId`, `itemId` + campos |
| Borrar | `.../engagement-file/items/delete` | `auditProjectId`, `itemId` |

**Estados** habituales: `pending`, `in_review`, `compliant`, `not_applicable`.

### 5.3 Aplicar plantilla

`POST .../engagement-file/apply-template` con `auditProjectId` — copia plantilla de la org al proyecto y crea nodos bajo la raíz `engagement_file`. Útil al crear proyecto nuevo.

---

## 6. Árbol genérico (sin sección)

Si el usuario crea **solo carpeta** bajo Programas (sin pasar por engagement-file):

- `POST .../projects/tree/create`  
  `data`: `auditProjectId`, `parentId` (id nodo Programas), `type: "folder"`, `name`.

Esa carpeta **no** tendrá `refId`; `node-detail` será `generic`. Para tener checklist ahí, habría que crear sección + ítems vía engagement-file bajo la raíz engagement, no bajo programs (diseño actual).

---

## 7.1 Hijo mixto bajo un mismo padre

Bajo **un solo nodo** `folder` (sección) pueden colgar a la vez:

- Más nodos **`folder`** (subsecciones con `refId`).
- Nodos **`checklist_item`** (`refId` = ítem) — **hermanos** de las carpetas, mismo `parentId`.
- Carpetas **`folder`** sin `refId` (solo árbol).

El front debe **ordenar hijos por `order`** (`sort_order`) y pintar icono según `type` / `refId`.  
Migración **0030** deja DUMMY-A con subcarpetas A1, A2 e ítems A.1, A.2 al mismo nivel para probarlo.

---

## 7.2 Colaboradores — dónde y cuándo cargar

| Dato | Dónde vive | Cómo cargar (eficiente) |
|------|------------|-------------------------|
| Quiénes están en el **proyecto** | `project_assignments` | **Una** llamada al abrir proyecto: `POST .../projects/assignments/list` con `auditProjectId`. |
| Quiénes están en un **ítem** | `checklist_item_assignees` | Solo al abrir detalle del ítem: `node-detail` devuelve `assignees[]` o `items/list` con include. |
| Árbol completo | `audit_tree_nodes` | `tree/full` — **sin** join a assignees (evitar N+1 y payload enorme). |

No conviene enriquecer cada nodo del árbol con usuarios; el panel de detalle o un drawer por ítem es el lugar adecuado.

---

## 7. Dummy completo en BD (sin documentos)

Migración **`0029_dummy_project_complete.sql`** (después de **0028**), luego **`0030_dummy_mixed_children_and_collaborators.sql`** para hijos mixtos y colaboradores:

- Proyecto **"Proyecto Dummy - Prueba plataforma"**.
- 5 raíces de árbol; primera `engagement_file`.
- **DUMMY-A** → subcarpeta **DUMMY-A1** → 3 ítems (`pending`, `in_review`, `not_applicable`) con nodos sync.
- **DUMMY-B** → ítem **B.1** `compliant`.
- Carpeta manual **101 — Bancos** bajo Programas.

Cómo probar en front:

1. `projects/list` → encontrar el proyecto dummy → `auditProjectId`.
2. `tree/full` → expandir Archivo Permanente → DUMMY-A → DUMMY-A1 → ver 3 ítems.
3. Click en cada ítem → `node-detail` → ver `detailType: checklist_item` y `assignees` donde aplica.

---

## 8. Checklist de implementación front

- [ ] Pantalla proyecto: cargar `tree/full` al entrar.
- [ ] Sidebar: árbol por `parentId`; icono por `type`; bloquear drag/delete en `isSystemNode`.
- [ ] Click nodo → `node-detail` → switch por `detailType`.
- [ ] Sección: botones crear ítem / editar sección si `engagementFile.manage`.
- [ ] Ítem: mostrar estado con badge; lista assignees; editar vía `items/update`.
- [ ] Tras mutación sección/ítem: refrescar árbol.
- [ ] (Futuro) Documentos: upload con `nodeId`; listar con `node-detail` o `items/documents/list` (opcional volver a exponer conteo en `tree/full` si se necesita badge).

---

## 9. Referencias API detalladas

- Árbol: `docs/frontend/api/tree.md` (actualizar tipos `engagement_file` si aún dice `permanent_file`).
- Engagement file: `docs/frontend/api/permanent-file.md` — sustituir mentalmente base path por `engagement-file` donde corresponda.
- Mapa esquema: `docs/technical/mapa-arbol-expediente-centralizado.md`
- Notas migración: `docs/technical/engagement-file-migration-notes.md`

---

## 10. Resumen una línea

**Un proyecto = un árbol; las carpetas con checklist son nodos `folder`/`checklist_item` con `refId`; todo el detalle sale de `node-detail`; sin documentos hasta que conecten upload con `nodeId`.**
