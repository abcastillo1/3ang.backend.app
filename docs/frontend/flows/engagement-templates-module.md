# Módulo “Plantillas de expediente” — Guía para frontend (firma nueva)

Documento único para implementar **UX + API** con mentalidad de usuario que **recién entra** y no conoce plantillas. El backend ya expone los endpoints; aquí se describe **qué pantalla hacer**, **en qué orden llamar** y **qué mostrar**.

**Permiso de todo el módulo:** `organizations.permanentFileTemplate.manage`  
**Prefijo API (ejemplo):** `POST /api/v1/organizations/engagement-file-template/...` (existe alias `permanent-file-template`).

---

## 1. Idea en una frase

- Hay **una plantilla genérica del producto** (no se guarda en tu BD): el usuario la **ve** y puede **copiarla** a una plantilla **propia de la firma** para editarla.
- La firma puede tener **varias plantillas** en BD; **una** puede estar marcada como **por defecto** (para crear proyectos o aplicar plantilla sin elegir id).

---

## 2. Primera visita (firma sin plantillas propias)

### 2.1 Pantalla principal — rejilla de cards

1. Llamar **`templates/list`** con body `{}`.
2. La respuesta trae `data.templates`: **siempre** incluye primero la entrada del sistema:
   - `id: "system"` (string, no número)
   - `isSystem: true`
   - `nameKey: "permanentFile.systemEngagementTemplateLabel"` → el front traduce con i18n (no hay `name` en string fijo).
   - `sectionCount`, `itemCount`
3. Después, **cero o más** plantillas de la firma (`isSystem: false`, `id` numérico, `name`, `isDefault`, `hasCustomProjectTree`: si la plantilla guarda **raíces propias** del árbol del proyecto vía `projectTreeSnapshot`).

**UX sugerido**

- **Cards** en grid: una card “**Plantilla estándar del sistema**” (badge “Solo lectura” / “Referencia”) y una card por plantilla de la firma (badge “Por defecto” si `isDefault`).
- Estado vacío copado: solo la card del sistema + CTA claro: **“Crear mi primera plantilla”**.
- **Árbol del encargo** (`tree-template` en ajustes de firma): define las raíces por defecto de **todos** los proyectos nuevos. Opcionalmente, **cada plantilla de expediente** puede tener `projectTreeSnapshot` (mismo formato que `tree-template`): al crear un proyecto con esa plantilla (ver §5), esas raíces sustituyen al ajuste global para ese proyecto.

### 2.2 Entrar a la plantilla del sistema (detalle / solo lectura)

Objetivo: que el usuario **entienda la estructura** (árbol del proyecto + KN01… + ítems).

1. **`sections/list`** — body:
   ```json
   { "data": { "engagementFileTemplateId": "system" } }
   ```
   Respuesta: `data.hierarchy` — array de nodos `nodeKind: "project_root"` con `children`. Solo la raíz de expediente (`treeType` `engagement_file` o `permanent_file`) trae `children` con las secciones tipo KN; el resto de fases va con `children: []`.

2. Para ver **ítems** bajo cada sección (opcional en la misma vista o al expandir):
   - **`items/list`** con body:
     ```json
     { "data": { "engagementFileTemplateId": "system" } }
     ```
     Respuesta: `data.hierarchy` análogo, pero cada sección bajo expediente incluye array **`items`** con `nodeKind: "template_item"`.

**UX sugerido**

- Árbol o acordeón: raíz “Archivo permanente” → secciones → ítems.
- **Sin** botones editar/borrar en nodos del sistema. Botón principal: **“Usar como base”** o **“Copiar a nueva plantilla”** (flujo siguiente).

### 2.3 “Quiero mi propia plantilla a partir del estándar”

Dos pasos mínimos:

1. **`templates/create`** — `{ "data": { "name": "Mi plantilla NIA", "setAsDefault": true } }`  
   - La primera plantilla de la firma suele quedar como defecto si es la única (`setAsDefault` opcional; el backend ya fuerza defecto si `count === 0`).
2. **`load-defaults`** — copia el contenido del JS del sistema a **esa** plantilla (debe estar **vacía** de secciones):
   ```json
   { "data": { "engagementFileTemplateId": <id devuelto en create> } }
   ```
   Si la firma solo tiene **una** plantilla y **ninguna** sección en ningún lado, se puede llamar `load-defaults` con `{}` y el backend crea la primera plantilla y rellena (comportamiento legacy).

Luego redirigir al **editor** de esa plantilla (mismas pantallas que abajo, con `engagementFileTemplateId` numérico).

---

## 3. Plantillas de la firma — listar, renombrar, defecto

| Acción | Endpoint | Body mínimo |
|--------|----------|-------------|
| Listar | `templates/list` | `{}` |
| Crear vacía | `templates/create` | `data.name`, opc. `data.setAsDefault`, opc. `data.projectTreeSnapshot` (array `{ type, name }`; debe incluir al menos una raíz `engagement_file` o `permanent_file`) |
| Renombrar / marcar defecto / árbol por plantilla | `templates/update` | `data.templateId`, y `data.name`, `data.setAsDefault: true` y/o `data.projectTreeSnapshot` (o `null` para volver al árbol global de la firma) |

**UX:** menú “⋯” en card: Renombrar, Establecer como predeterminada (confirmación si ya hay otra).

---

## 4. Editor de una plantilla de la firma (contenido)

Siempre enviar **`data.engagementFileTemplateId`** = id numérico de la plantilla cuando la firma tenga **más de una** (si no, el backend usa la por defecto).

| Vista | Endpoint | Notas |
|-------|----------|--------|
| Árbol + secciones raíz | `sections/list` | Sin `parentSectionId` → `data.hierarchy`. Drill-down: `data.parentSectionId` + mismo `engagementFileTemplateId` → solo `data.sections`. |
| Una sección con ítems | `sections/view` | `data.sectionId` |
| Ítems de una sección | `items/list` | `data.sectionId` + `engagementFileTemplateId` |
| Árbol completo con ítems | `items/list` | Solo `engagementFileTemplateId` → `data.hierarchy` |

CRUD: `sections/create|update|delete`, `items/create|update|delete` (misma plantilla en cabecera lógica vía sección existente; en **create** de sección incluir `engagementFileTemplateId` si hay varias plantillas).

**UX:** tabla o árbol lateral + panel de detalle; mantener visible **en qué plantilla** está editando (selector arriba).

---

## 5. Crear proyecto de auditoría (resumen)

- Opcional: **`data.applyEngagementFileTemplate`**: `"system"` **o** id numérico de plantilla de la firma.
- Requiere además permiso **`projects.engagementFile.manage`**; si no, no ofrecer el control o mostrar mensaje de permiso.
- **Raíces del árbol al crear:** por defecto se usan el ajuste global `tree-template` de la firma (o el default del producto). Si **`applyEngagementFileTemplate`** es un **id numérico** y esa plantilla tiene `projectTreeSnapshot`, el árbol del proyecto nuevo usa **esas** raíces. Para forzar el árbol de una plantilla **sin** aplicar su expediente (p. ej. `applyEngagementFileTemplate: "system"`), enviar **`data.projectTreeFromEngagementTemplateId`** = id de plantilla con snapshot (debe existir en la firma).
- Si no envían `applyEngagementFileTemplate`: el proyecto nace con las raíces globales (o las de `projectTreeFromEngagementTemplateId` si se envía); el usuario puede aplicar expediente después con **`projects/.../engagement-file/apply-template`**.

---

## 6. Constantes que el front debe respetar

- Id plantilla sistema: **solo** el string **`"system"`** (comparación estricta).
- Raíz de expediente en árbol de preview: `treeType` puede ser `engagement_file` o `permanent_file` según configuración de la firma (`tree-template`).

---

## 7. Errores frecuentes (mensajes útiles en UI)

| Situación | errorCode típico |
|-----------|------------------|
| Aplicar plantilla de firma vacía / sin defecto | `permanentFile.noDefaultEngagementTemplate`, `permanentFile.orgEngagementTemplateNoSections` |
| Editar plantilla sistema | `permanentFile.cannotMutateSystemEngagementTemplate` |
| `load-defaults` sin indicar plantilla cuando ya hay varias o ya hay secciones | `permanentFile.specifyEngagementTemplateForDefaults` |

---

## 8. Documentación relacionada

- Detalle técnico / tablas: [`technical/engagement-templates.md`](../../technical/engagement-templates.md)  
- P/C `retentionScope`: [`api/engagement-template-retention-scope.md`](../api/engagement-template-retention-scope.md)  
- Tabla de endpoints: [`api/_overview.md`](../api/_overview.md)

---

## 9. Qué **no** hace falta complicar en front

- No duplicar en estado local la jerarquía del sistema si ya la mostraste con `hierarchy`; una sola fuente por respuesta.
- No tratar `id: "system"` como número.
- El módulo es **configuración de firma**: usuarios sin permiso no ven el menú o ven pantalla de “sin acceso”.
