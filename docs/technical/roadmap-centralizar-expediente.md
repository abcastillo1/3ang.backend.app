# Hoja de ruta: centralizar expediente estructurado (molde + instancia)

Objetivo: un **solo núcleo** reutilizable (plantilla por org → secciones/ítems por proyecto → árbol → documentos), con nombres **neutros** que no obliguen a clonar el esquema por cada fase (planificación, análisis, etc.). Así el esquema queda **claro** y listo para reportería y `scope` futuro.

**Estado actual:** tablas y rutas bajo `permanent_file_*` / `permanent-file` / permiso `projects.permanentFile.manage`. El **comportamiento** ya es el correcto; el cambio es **nombrado + una vía única** en API/BD.

---

## Fase 0 — Decisión de nombres (antes de tocar código)

Elegir **un prefijo** para BD y otro para API (pueden coincidir).

| Ámbito | Opción A | Opción B | Opción C |
|--------|----------|----------|----------|
| Tablas instancia | `engagement_file_sections` | `expediente_sections` | `audit_file_sections` |
| Tablas plantilla | `engagement_file_template_sections` | `expediente_template_sections` | `audit_file_template_sections` |
| Rutas API | `/projects/engagement-file/...` | `/projects/expediente/...` | `/projects/audit-file/...` |
| Permiso | `projects.engagementFile.manage` | `projects.expediente.manage` | `projects.auditFile.manage` |

**Recomendación:** `engagement_file_*` + `/projects/engagement-file/` — en inglés consistente con el resto del código; “expediente” puede ir solo en UI/i18n.

**Checklist Fase 0**

- [ ] Nombre de tablas definitivo
- [ ] Nombre de rutas definitivo (¿mantener alias `/permanent-file/*` un tiempo? recomendado sí, 1 versión)
- [ ] Nombre del permiso nuevo + si se depreca el viejo o se migra en BD

---

## Fase 1 — Base de datos

### 1.1 Si podés recrear la BD desde cero

- **Opción preferida:** nueva migración única que **reemplaza** la creación de tablas (o carpeta `migrations/` ordenada) con los **nombres nuevos** desde el principio, y ajustar todas las migraciones posteriores que referencien `permanent_file_sections` (FKs en `checklist_items`, etc.).
- Alternativa: **squash** de migraciones 0019–0027 en una sola `00XX_engagement_file_core.sql` para instalaciones nuevas; entornos ya migrados pasan por 1.2.

### 1.2 Si ya tenés datos que conservar

Una migración que, en orden:

1. `RENAME TABLE permanent_file_sections TO engagement_file_sections;` (nombre elegido)
2. Idem `permanent_file_template_sections` → `engagement_file_template_sections`
3. Idem `permanent_file_template_items` → `engagement_file_template_items`
4. Actualizar **FKs** que apunten a esas tablas (MySQL a veces mantiene el constraint; verificar `information_schema`).
5. `checklist_items.section_id` sigue igual (columna); solo cambia la tabla referenciada por el FK — tras RENAME el FK sigue válido si el engine lo resuelve; si no, `DROP FK` + `ADD FK` a la tabla renombrada.

**Nota:** `checklist_items` puede **quedarse** como está (nombre ya neutro). Si algún día querés `engagement_checklist_items`, es otro paso (más costoso).

**Checklist Fase 1**

- [ ] Migración rename + verificación de FKs
- [ ] Seed/dummy (0026, etc.) actualizado a nombres de tabla nuevos
- [ ] `0014` / permisos: nuevo código de permiso o rename en `permissions`

---

## Fase 2 — Modelos Sequelize

Renombrar **archivos** y **define name**; actualizar `tableName` a la tabla nueva.

| Archivo actual | Acción |
|----------------|--------|
| `models/audit/permanentFileSection.js` | → `engagementFileSection.js` (o nombre acordado); `tableName: 'engagement_file_sections'` |
| `models/organizations/permanentFileTemplateSection.js` | → `engagementFileTemplateSection.js` |
| `models/organizations/permanentFileTemplateItem.js` | → `engagementFileTemplateItem.js` |

- `models/index.js`: imports y `this.models.PermanentFileSection` → `EngagementFileSection` (o el nombre de clase elegido).
- `models/audit/auditProject.js`: `hasMany(PermanentFileSection)` → nuevo modelo.
- `models/organizations/organization.js`: `hasMany(PermanentFileTemplateSection)` → nuevo modelo.
- `models/audit/checklistItem.js`: `belongsTo(PermanentFileSection)` → nuevo modelo (misma FK `section_id`).

**Checklist Fase 2**

- [ ] Tres modelos renombrados + asociaciones
- [ ] Grep en `models/` sin referencias a `PermanentFile*`

---

## Fase 3 — Helpers

| Archivo | Acción |
|---------|--------|
| `helpers/permanent-file-tree-sync.js` | Renombrar a `engagement-file-tree-sync.js` (o similar); constantes `TYPE_SECTION_NODE` sin cambio lógico |
| `helpers/permanent-file-template.js` | Renombrar; usa modelos de plantilla/sección |
| `helpers/tree-seed.js` | Referencias a tipo `permanent_file` en árbol: decidir si el **type** del nodo raíz sigue siendo `permanent_file` (semántica) o pasa a `engagement_file` — si cambia, migración de datos o compat en `node-detail` |
| `helpers/record-activity.js` / `activity-mapping.js` | Códigos de actividad que digan `permanentFile` → nuevos códigos o alias |

**Checklist Fase 3**

- [ ] Helpers renombrados + imports actualizados en rutas
- [ ] `tree-seed` y `node-detail` coherentes con `type` de nodo raíz

---

## Fase 4 — Rutas y carpetas

### 4.1 Proyectos

- Carpeta `app/projects/permanent-file/` → `app/projects/engagement-file/` (o nombre elegido).
- `routes/projects.js`: registrar `/engagement-file/...` y, si querés, **duplicar** registro con `/permanent-file/...` apuntando al mismo handler (deprecación).
- Dentro de cada `route.js`: `requirePermission('projects.permanentFile.manage')` → nuevo permiso.

### 4.2 Organización (plantilla)

- Carpeta `app/organizations/permanent-file-template/` → `app/organizations/engagement-file-template/`.
- `routes/organizations.js`: mismos paths nuevos + alias opcional.

**Checklist Fase 4**

- [ ] Todas las rutas bajo el nuevo path
- [ ] Permisos actualizados en cada handler
- [ ] Alias antiguo documentado en `docs/frontend/api/_overview.md` con “deprecated”

---

## Fase 5 — Permisos

- Migración: `INSERT` nuevo permiso `projects.engagementFile.manage` (o el código elegido); `role_permissions` igual que hoy para los mismos roles.
- Decisión: ¿eliminar `projects.permanentFile.manage` o dejarlo como alias en código (dos códigos aceptados en `requirePermission`)? Lo más limpio: **migrar** filas en `role_permissions` al nuevo `permission_id` y borrar el permiso viejo, o dejar ambos en BD y en middleware aceptar cualquiera hasta quitar el alias.

**Checklist Fase 5**

- [ ] Nuevo permiso en BD + seeds
- [ ] Frontend/docs con código nuevo

---

## Fase 6 — i18n y errores

- `assets/translations/es.json` / `en.json`: claves que digan `permanentFile` → nuevas claves; mantener alias si el frontend aún envía códigos viejos.
- `throwError(..., 'permanentFile.sectionNotFound')` etc.: renombrar a `engagementFile.*` o `expediente.*` según convención de códigos de error del proyecto; actualizar **todos** los usos y traducciones.

**Checklist Fase 6**

- [ ] Grep `permanentFile` en `app/` y `helpers/`
- [ ] Traducciones alineadas

---

## Fase 7 — Documentación

- `docs/frontend/api/permanent-file.md` → renombrar/duplicar como `engagement-file.md` con paths nuevos.
- `docs/frontend/flows/permanent-file-ui.md` → actualizar.
- `docs/ROADMAP.md`, `PLATFORM-CONTEXT.md`, `_overview.md`, `tree.md`: referencias a permanent-file.
- **ADR corto** en `docs/technical/` explicando: core = árbol + secciones + ítems + docs; nombre neutro para no multiplicar esquemas por fase.

**Checklist Fase 7**

- [ ] API docs con base path nuevo
- [ ] ADR “Engagement file as core”

---

## Fase 8 — Opcional: `scope` para reportería futura

Cuando quieras separar “solo permanente” vs “planificación” **en el mismo modelo**:

- `engagement_file_sections` (+ plantilla): columna `scope` VARCHAR nullable, default `'permanent'` (o el valor que represente el uso actual).
- Índice `(audit_project_id, scope)` si filtrás reportes por ámbito.

Sin esto, el diseño ya sirve; esto solo **anticipa** reportería sin mezclar áreas.

**Checklist Fase 8**

- [ ] Migración `ADD COLUMN scope`
- [ ] apply-template y CRUD que seteen `scope` si aplica

---

## Orden sugerido de ejecución

1. Fase 0 (nombres)
2. Fase 1 (BD) — con BD recreable, primero
3. Fase 2 (modelos)
4. Fase 3 (helpers) + Fase 4 (rutas) en bloque (mismo PR o rama)
5. Fase 5 (permisos)
6. Fase 6 (i18n/errores)
7. Fase 7 (docs)
8. Fase 8 cuando haga falta

---

## Archivos que hoy contienen `permanent_file` / `permanent-file` / `permanentFile`

Referencia rápida (grep); tras el refactor debería quedar solo en comentarios históricos o en alias deprecados:

- **Migraciones:** `0019`, `0020`, `0021`, `0022`, `0023`, `0024`, `0026`, `0014`, `0015` (según grep)
- **Modelos:** `permanentFileSection.js`, `permanentFileTemplateSection.js`, `permanentFileTemplateItem.js`, `auditProject.js`, `organization.js`, `checklistItem.js`, `index.js`
- **Rutas:** `routes/projects.js`, `routes/organizations.js`, todo bajo `app/projects/permanent-file/` y `app/organizations/permanent-file-template/`
- **Helpers:** `permanent-file-template.js`, `permanent-file-tree-sync.js`, `tree-seed.js`, `record-activity.js`, `activity-mapping.js`, `checklist-item-assignees.js`
- **Docs:** `permanent-file.md`, `permanent-file-ui.md`, `tree.md`, `_overview.md`, `ROADMAP.md`, `PLATFORM-CONTEXT.md`, diseños varios
- **Otros:** `app/projects/tree/node-detail`, `tree/full`, traducciones

---

## Criterio de “listo”

- Una sola familia de tablas para secciones/ítems del expediente con nombre neutro.
- Una sola familia de rutas (más alias deprecado si hace falta).
- Un permiso claro para “gestionar estructura del expediente”.
- Documentación que describa el esquema **sin** atarlo solo al “archivo permanente” (el término puede seguir en UI como área dentro del expediente).

Cuando termines Fase 1–7, el esquema mental queda: **org → plantilla → proyecto → secciones → ítems → nodos → documentos**, todo con un solo prefijo técnico.
