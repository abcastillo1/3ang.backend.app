# Evidencia textual en ítems de checklist (`evidenceText`)

Evidencia en **texto enriquecido** (HTML del editor) asociada al ítem del expediente, **independiente** de la evidencia documental (`audit_documents` vía `nodeId` / archivos).

Complementa:

- [`ACTIVITY-ITEM-SCREEN.md`](../ACTIVITY-ITEM-SCREEN.md) — pestaña Evidencias (archivos) vs comentarios vs notas.
- [`checklist-item-comments.md`](checklist-item-comments.md) — hilo de comentarios (no es lo mismo que `evidenceText`).

---

## Modelo de datos

| Dónde | Campo | Notas |
|-------|--------|--------|
| Tabla `checklist_items` | `evidence_text` | `TEXT` nullable; contenido HTML ya **sanitizado** en backend |
| API JSON | `evidenceText` | camelCase en request/response del ítem |

**No hay versionado de HTML:** solo el valor actual. El historial de “alguien editó el ítem” queda en `activity_logs` (metadata con `changedFields`, puede incluir `evidenceText`).

---

## Permisos

| Acción | Permiso |
|--------|---------|
| Crear ítem con `evidenceText` o actualizarlo | `projects.engagementFile.manage` |
| Leer ítem / `node-detail` | `projects.view` |

---

## Guardar el texto

### Opción A — Al crear el ítem

```
POST /api/v1/projects/permanent-file/items/create
Authorization: Bearer <token>
```

`data.evidenceText` es **opcional**. Va junto con los campos obligatorios del create (`auditProjectId`, `sectionId`, `code`, etc.).

### Opción B — Actualizar solo evidencia (u otros campos del ítem)

```
POST /api/v1/projects/permanent-file/items/update
Authorization: Bearer <token>
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `auditProjectId` | int | Sí | Proyecto |
| `itemId` | int | Sí | ID del ítem |
| `evidenceText` | string \| null | No | HTML del editor. Máx. **65535** caracteres. Vacío real → suele persistirse `null` tras sanitizar |

### Ejemplo (update)

```json
{
  "data": {
    "auditProjectId": 5,
    "itemId": 42,
    "evidenceText": "<p>Conclusión del procedimiento</p><ul><li><p>Punto 1</p></li></ul>"
  }
}
```

### Validación

- Si el formato no es válido: `validators.evidenceText.invalid` (i18n).

### Comportamiento del backend

- **Sanitización:** se eliminan scripts, iframes, estilos inline peligrosos, eventos `on*`, etc. El cliente puede sanitizar también por UX; la **fuente de verdad segura** es el servidor.
- **Contenido vacío:** si solo quedan etiquetas vacías o espacios, puede guardarse `null`.

---

## Leer el texto guardado

### Tras create/update

La respuesta incluye `item` con `evidenceText` (valor ya persistido/sanitizado).

### Detalle del nodo (pantalla de actividad)

```
POST /api/v1/projects/tree/node-detail
```

Request típico: `data.auditProjectId`, `data.nodeId` (nodo `checklist_item`).

Cuando `detailType === "checklist_item"`, usar **`data.item.evidenceText`** para inicializar el editor.

### Listado por sección

```
POST /api/v1/projects/permanent-file/items/list
```

Los ítems devueltos incluyen `evidenceText` si el modelo lo expone en la consulta (misma forma que otros campos del ítem).

---

## Diferencia con comentarios

| Concepto | Dónde |
|----------|--------|
| Evidencia textual formal del ítem | `evidenceText` en checklist item (este documento) |
| Conversación / @menciones | [`checklist-item-comments.md`](checklist-item-comments.md) — `comments/create`, etc. |

No mezclar adjuntos de comentario con evidencia formal: los archivos del ítem siguen la regla `node_id` + `comment_id` null (ver `ACTIVITY-ITEM-SCREEN.md` §4).

---

## Migración de base de datos

Debe existir la columna `evidence_text` en `checklist_items` (migración backend, p. ej. `0036_checklist_items_evidence_text.sql`). Sin aplicar la migración, el guardado fallará.

---

## UX sugerido (frontend)

- Guardar explícito o autosave con debounce al editar rich text.
- Opcional: comparar `updatedAt` del ítem al guardar para detectar ediciones concurrentes (si el equipo de producto lo requiere).
