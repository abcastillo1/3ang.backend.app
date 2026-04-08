# Plantilla de expediente: ámbito P / C (`retentionScope`)

**Flujo UX firma nueva (módulo completo para el front):** [`../flows/engagement-templates-module.md`](../flows/engagement-templates-module.md).

Flujo general de plantillas (árbol, BD, apply): [`technical/engagement-templates.md`](../../technical/engagement-templates.md).

### Varias plantillas por firma y plantilla del sistema

- `POST .../organizations/engagement-file-template/templates/list` — catálogo de plantillas para la UI:
  - Siempre incluye primero **`id: "system"`** (`isSystem: true`, `nameKey` i18n `permanentFile.systemEngagementTemplateLabel`). Esa plantilla **no tiene fila en BD**; trae `sectionCount` / `itemCount` calculados desde el JS del producto.
  - Luego las filas de **`engagement_file_templates`** de la org (`name`, `isDefault`, `createdAt`, `updatedAt`, `sectionCount`, `itemCount`). Si la tabla está vacía, solo verás la entrada `system` (normal tras migración si aún no creaste plantilla ni cargaste defaults).
  - **Por qué no ves filas en BD:** hace falta migración `0040_engagement_file_templates.sql`. Además, filas en `engagement_file_templates` aparecen si la migración encontró secciones ya existentes, o si llamás `templates/create`, o si `load-defaults` crea la primera plantilla.
  - Detalle del árbol de una plantilla de firma: `sections/list` + `sections/view` con `engagementFileTemplateId` (no hay `templates/view` separado).
- `POST .../organizations/engagement-file-template/templates/create` — `data.name`, opcional `data.setAsDefault`. La primera plantilla de la org queda como defecto automáticamente.
  - En **sections/list** y **sections/create** se puede enviar opcional `data.engagementFileTemplateId`: número, **`"system"`**, u omitir (= plantilla por defecto). **sections/create** con `"system"` responde 400 `permanentFile.cannotMutateSystemEngagementTemplate`.
  - **sections/list** (`parentSectionId` omitido o null): una sola clave **`hierarchy`**: array de nodos `nodeKind: "project_root"` con `treeType`, `name`, `order` y **`children`**. Solo la raíz de expediente (`engagement_file` / `permanent_file`) tiene `children` con las secciones de plantilla (`nodeKind: "template_section"`); el resto `children: []`. Con **`parentSectionId`** (drill-down): solo **`sections`** (lista plana de hijos), sin `hierarchy`.
  - **items/list**: sin `sectionId`/`sectionCode`, solo **`hierarchy`** (misma forma; bajo cada sección del expediente van **`items`** con `nodeKind: "template_item"`). Con `sectionId` o `sectionCode`, solo **`items`**.
- `POST .../engagement-file/apply-template` — opcional `data.engagementFileTemplateId`: `"system"` | id numérico | omitir (= plantilla por defecto de la firma).
- `POST .../projects/create` — opcional `data.applyEngagementFileTemplate`: `"system"` o id numérico; requiere también permiso `projects.engagementFile.manage`.

### Dónde mostrarlo en la app (configuración)

**No** está ligado a un menú concreto en código; es decisión de producto/UI. Recomendación:

| Ámbito | Dónde en el front | Permiso |
|--------|-------------------|---------|
| Gestionar plantillas de expediente de la firma | **Configuración de la organización** (o “Firma”), sección tipo **“Expediente”** / **“Archivo permanente”** → pantalla **“Plantillas de expediente”**: listar (`templates/list`), crear plantilla (`templates/create`), elegir plantilla activa en un desplegable y debajo el editor de secciones/ítems (`sections/*`, `items/*`, `load-defaults`). | `organizations.permanentFileTemplate.manage` |
| Árbol genérico del proyecto (5 raíces, etc.) | Es **otra** cosa: `organizations/tree-template/*`. No mezclar con plantillas de expediente. | distinto |

Así el usuario sabe **dónde** ver y editar moldes; crear proyecto y `apply-template` pueden reutilizar la misma lista de opciones (`templates/list` + `system`).

En **negocio** a veces se distingue:

- **P** — Contenido **base / estructural** que aplica aunque pasen los años (misma firma, mismo cliente).
- **C** — Contenido que **cambia con el año o período auditado** y se archiva o renueva por ejercicio.

En la API puede definirse en **carpeta (sección)** y en **cada ítem del checklist** (donde va la evidencia). Lo habitual para listas tipo “☐ tarea (P)” y “☐ tarea (C)” en el mismo capítulo es usar **`retentionScope` por ítem** en plantilla y en el proyecto.

---

## Valores técnicos

| Valor API | Significado negocio típico |
|-----------|----------------------------|
| `structural` | **P** — multi-año / base estructural |
| `per_period` | **C** — específico del período auditado |

Default si no se envía: **`structural`**.

---

## Plantilla: secciones

Opcional por carpeta de plantilla:

- `POST /api/v1/organizations/.../engagement-file-template/sections/create`
- `POST /api/v1/organizations/.../engagement-file-template/sections/update`

Permiso: `organizations.permanentFileTemplate.manage`.

---

## Plantilla: ítems (recomendado para P/C por tarea)

- `POST /api/v1/organizations/.../engagement-file-template/items/create`
- `POST /api/v1/organizations/.../engagement-file-template/items/update`

Campo opcional `retentionScope`. Al **aplicar plantilla** al proyecto, cada **`checklist_item`** copia el `retentionScope` del ítem de plantilla.

---

## Proyecto: ítems manuales

- `POST /api/v1/projects/.../permanent-file/items/create` — opcional `retentionScope`
- `POST /api/v1/projects/.../permanent-file/items/update` — opcional `retentionScope`

Permiso: `projects.engagementFile.manage`.

---

## Secciones del proyecto (carpetas)

- `POST /api/v1/projects/permanent-file/sections/create` — opcional `retentionScope`
- `POST /api/v1/projects/permanent-file/sections/update` — opcional `retentionScope`

---

## Aplicar plantilla

`POST /api/v1/projects/permanent-file/apply-template` (o `.../engagement-file/apply-template`):

- Copia `retentionScope` de cada **sección** de plantilla → sección del proyecto.
- Copia `retentionScope` de cada **ítem** de plantilla → ítem del proyecto.

---

## Lectura en UI

- `tree/node-detail`: `section.retentionScope`, y en cada ítem `retentionScope`.
- Listados de secciones / ítems del proyecto incluyen el campo cuando el modelo lo selecciona.

---

## Plantilla por defecto en código

El archivo `helpers/default-engagement-file-template-sections.js` define las secciones **KN01–KN10** (conocimiento del negocio) e ítems con P/C por fila. `load-defaults` inserta esa estructura cuando la plantilla de la organización está vacía.

---

## Validación

Si el valor no es `structural` ni `per_period`: `validators.retentionScope.invalid`.

---

## Migraciones

- `0038_engagement_section_retention_scope.sql` — `retention_scope` en secciones (plantilla y proyecto).
- `0039_engagement_template_item_retention_scope.sql` — `retention_scope` en ítems de plantilla y en `checklist_items`.

---

## Notas

- **`priority`** (P1, P2) en sección es **prioridad de trabajo**, no P/C de retención.
- La plataforma **no ejecuta** sola políticas de archivo por año; los campos sirven para etiquetar, filtrar y reglas futuras (roll-over, reportes).
