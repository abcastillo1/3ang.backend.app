# De la carpeta del encargo (ej. MENHURSA) a la plataforma

La carpeta `docs/91° MENHURSA S.A/` es un **ejemplo real** de cómo hoy organizan el expediente. El objetivo es **reemplazar ese árbol de carpetas en disco** por el **mismo orden lógico dentro de la plataforma** (proyecto = árbol + documentos en B2).

Este documento no migra archivos automáticamente; sirve para **configurar plantillas y nodos** de forma que la UI refleje lo que ya conocen.

---

## Cómo se ve hoy (referencia MENHURSA)

| Carpeta en disco | Rol en la auditoría | En la plataforma |
|------------------|---------------------|------------------|
| **0. PERMANENTE** | Archivo permanente, índices, A-/C-, ICT, EEFF periodo anterior | Nodo raíz **Archivo Permanente** → secciones/carpetas por bloque (01 Control Interno, 03 Control Contable…) → ítems por código (A-03, C-10…) → documentos en cada ítem o carpeta |
| **2. ANÁLISIS** | Trabajo por rubro/cuenta (101 Bancos, 102 CxC, 201 CxP…) | Nodo **Programas de Auditoría** (o **Planificación**) → carpeta por área/rubro → ítems o carpetas con modelos Excel/PDF como evidencia |
| **4. TRIBUTARIO** | Form 101/104, ATS, facturas electrónicas, talones | Puede ser **subárbol bajo Permanente** (bloque tributario) o **carpeta hermana** bajo el mismo proyecto, según cómo quieran verlo en el árbol |
| **PROGRAMAS_DE_AUDITORIA …xlsx** | Programa general del encargo | Documento en nodo Planificación o en raíz del proyecto; o metadato fuera del árbol |

Los códigos **A-01, A-03, C-06, C-10** encajan como **código de sección/ítem** (`code` en `permanent_file_sections` / `checklist_items`) y el **nombre de carpeta** como `name` / `description`.

---

## Principios para que la plataforma “quede bien”

1. **Un proyecto = un encargo** (ej. MENHURSA 2023). Todo lo que hoy está bajo `91° MENHURSA S.A\` vive bajo ese `auditProjectId`.

2. **No hace falta copiar cada subcarpeta 1:1** al principio: basta con **plantilla por organización** que replique los bloques que siempre usan (0. PERMANENTE con A/B/C o 01/03…) y **apply-template** al crear el proyecto.

3. **Documentos**: al subir, **`nodeId`** = el nodo de la carpeta o del ítem que reemplaza esa ruta. Así `node-detail` devuelve la misma lista que hoy verían en esa carpeta.

4. **Varios responsables por actividad**: ya contemplado con `assignedUserIds` + `assignees[]` (quién asignó, cuándo).

5. **Quién creó el ítem**: `createdBy` para trazabilidad (sustituye el “quién armó esta carpeta” en el file share).

---

## Orden sugerido al migrar un encargo como MENHURSA

1. Crear **cliente** y **proyecto** (periodo, tipo).
2. **Aplicar plantilla** de archivo permanente alineada a su 0. PERMANENTE (o crear secciones manualmente con los mismos códigos).
3. Bajo **Programas**, crear carpetas por rubro (101, 102, …) como nodos `folder`.
4. Subir los archivos críticos primero (índices, programas, dictámenes) con el `nodeId` correcto.
5. El resto se puede ir subiendo por fases sin perder la jerarquía.

---

## Dónde está la verdad técnica

- Árbol y detalle: `docs/frontend/flows/permanent-file-ui.md` y `docs/frontend/api/tree.md`
- Subida: `docs/frontend/flows/file-upload.md`
- API secciones/ítems: `docs/frontend/api/permanent-file.md`

Cuando dejen de usar la carpeta en `docs/`, este archivo sigue siendo la **guía de equivalencia** para no perder el criterio de orden que ya tienen con MENHURSA y encargos similares.
