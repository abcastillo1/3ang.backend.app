# Flujos de plataforma: documentos, jerarquía, IA y réplica de proyectos

Este documento define: (1) que **toda** la carga de documentos sea por **URL directa** al repositorio (B2/S3), sin que el API lea el archivo; (2) el papel de la **IA** como **extra opcional** en los procesos que lo permitan, con flujo principal que funcione sin IA; (3) la **jerarquía tipo árbol** (carpetas/bloques padre-hijo) con una estructura fácil de consultar y que no genere sobrecarga en la base de datos; (4) la **réplica de un proyecto de auditoría** a otro (p. ej. cambio de año) y qué se reutiliza.

---

## 1. Carga de documentos: solo URL directa al repositorio (B2/S3)

### Regla de negocio

- **Todo** el contenido que los usuarios "suben" (evidencias, anexos, papeles de trabajo, informes en borrador, etc.) se maneja desde **Backblaze B2 o S3**.
- El **API no interviene en leer el archivo** ni en hacer de túnel: no se envía el binario al backend. Así se reduce costo operativo y carga en el servidor.
- Flujo estándar ya implementado (ver **docs/technical/file-upload.md**):
  1. Frontend pide **POST /api/v1/files/upload-url** con metadata (nombre, tipo, tamaño, categoría, proyecto/nodo).
  2. API valida permisos y devuelve **uploadUrl** (PUT prefirmada) y **key**.
  3. Frontend hace **PUT** del archivo directamente a esa URL (contra B2/S3).
  4. Tras éxito (200), Frontend llama **POST /api/v1/files/confirm** con el **key** y metadata; el API solo **registra** la referencia (key, nombre, mimeType, tamaño, categoría, proyectoId, folderId si aplica) y opcionalmente dispara análisis IA (que sí leerá el archivo desde una URL de lectura prefirmada, no desde el API).

### Dónde se usa en la plataforma

- **Evidencias de auditoría:** subida a categoría `audit_evidences`; key con `organizationId/category/auditProjectId/...` (y opcionalmente segmento de carpeta/nodo).
- **Documentos adjuntos a ítems del checklist (Archivo Permanente), a procedimientos o a papeles de trabajo:** mismo flujo; en **confirm** se asocia el documento al `auditProjectId` y al `nodeId` o `folderId` o `checklistItemId` según el modelo que adoptemos.
- **Informes (PDF/Word) generados:** se pueden subir a B2/S3 como resultado de "exportar" desde la plataforma (el generador puede subir vía presigned URL desde el backend si es un job, o el usuario "sube" el generado; en ambos casos el almacenamiento final es B2/S3, no el API como almacén).

Ningún flujo de "carga de documentos" debe usar **multipart al API** para el contenido del archivo; el API solo emite URLs y persiste metadata.

---

## 2. IA: solo como extra; flujo principal sin dependencia de IA

### Principio

- La **IA** (p. ej. Claude) es un **recurso opcional** que mejora ciertos pasos.
- El **flujo principal** (archivo permanente, planificación, programas, procedimientos, papeles de trabajo, hallazgos, informes) debe poder completarse **sin IA**. Si la IA no está disponible o la firma no la usa, el proceso sigue igual de forma manual.

### Dónde la IA puede intervenir (como extra)

| Proceso | Sin IA (siempre posible) | Con IA (extra) |
|--------|---------------------------|-----------------|
| **Evidencia subida** | Usuario asocia el documento al ítem/procedimiento y describe manualmente si quiere. | Tras **confirm**, se encola un job que obtiene una **URL de lectura** prefirmada del documento, la IA analiza el contenido y sugiere **hallazgos** o etiquetas (riesgo, NIIF). El usuario revisa y acepta/edita/descarta. |
| **Hallazgos** | El auditor documenta Condición, Criterio, Causa, Efecto y Recomendación manualmente. | IA sugiere redacción de condición/criterio/causa/efecto a partir de la evidencia y del contexto del área; el auditor edita y guarda. |
| **Borrador de informe** | El auditor redacta cada sección (alcance, opinión, párrafos de énfasis) o usa plantilla y rellena a mano. | IA propone párrafos por sección usando hallazgos, evidencia y datos del proyecto; el auditor revisa y ajusta. |
| **Archivo Permanente / control interno** | Respuestas y valoraciones las hace el usuario. | Opcional: IA sugiere valoración de riesgo o preguntas de seguimiento a partir de documentos subidos en el archivo permanente. |

Implementación recomendada: los jobs de IA (análisis de documento, sugerencia de hallazgos, redacción de informe) se ejecutan en **segundo plano**; si fallan o no están configurados, la UI sigue mostrando formularios y listas para que el usuario complete todo manualmente. No hay "paso obligatorio" que espere respuesta de la IA.

---

## 3. Jerarquía tipo árbol (carpetas / bloques): estructura fácil de consulta y sin sobrecarga en BD

### Necesidad

- Los "bloques" del proyecto (secciones del archivo permanente, programas por área, procedimientos, ítems de checklist, y eventualmente "carpetas" de documentos) se comportan como **padre–hijo**.
- Se debe poder: listar hijos de un nodo, armar breadcrumb, y en el futuro mover/copiar ramas sin generar consultas recursivas costosas ni N+1.

### Enfoque recomendado: lista de adyacencia + path materializado + profundidad

- **Una tabla de nodos** (p. ej. `audit_tree_node`) que representa cualquier nivel de la jerarquía dentro de un proyecto:
  - `id`, `audit_project_id`, `parent_id` (FK a la misma tabla, nullable para la raíz), `path`, `depth`, `type`, `name`, `order`, `ref_id` (opcional), timestamps.
  - **path**: cadena que representa la ruta desde la raíz hasta el nodo, ej. `"/1/5/12"` (raíz 1, hijo 5, nieto 12). Sin incluir el propio id al final si se prefiere, o incluyéndolo para simplificar "subárbol": subárbol de 5 = `path LIKE '/1/5/%'`.
  - **depth**: 0 = raíz, 1 = primer nivel, etc. Límite razonable (ej. 5–6) para evitar árboles demasiado profundos.
  - **type**: ej. `root`, `permanent_file`, `section`, `checklist_item`, `planning`, `schedule`, `program`, `procedure`, `folder`, `findings`, `reports`. Así se pueden filtrar "solo carpetas" o "solo secciones".
  - **ref_id** + tipo de entidad (o tabla separada de "contenido" por tipo): para enlazar a filas en tablas específicas (ChecklistItem, Procedure, etc.) si se desea mantener el detalle en tablas propias y el árbol solo como estructura.

- **Ventajas**:
  - **Hijos directos:** `WHERE parent_id = :id ORDER BY order`.
  - **Subárbol completo:** `WHERE path LIKE :pathPrefix + '%'` (con índice sobre `(audit_project_id, path)`).
  - **Breadcrumb:** partir `path` y obtener los id (y nombres si se cachean o se guardan en path), o consultar por esos id; una sola consulta por nivel si se quiere.
  - **Inserción:** al crear un nodo, `parent_id` = padre; `depth` = padre.depth + 1; `path` = padre.path + '/' + nuevo_id (o concatener después de insert).
  - **Mover nodo:** actualizar `parent_id`, `path` y `depth` del nodo y de **todos sus descendientes** (una actualización en lote por path: todos los que tengan path como prefijo). Se puede hacer en un job o transacción para no bloquear.

- **Límites:** profundidad máxima (ej. 6); ancho por nivel razonable. Así se evitan paths enormes y actualizaciones masivas desmedidas.

### Alternativa: jerarquía "implícita" por FKs

- Si se prefiere **no** tener una tabla de árbol genérica:
  - **Archivo Permanente:** `PermanentFileSection` (parent_section_id nullable); `ChecklistItem` (section_id). Hijos = por FK.
  - **Programas:** `AuditProgram` (project_id); `Procedure` (program_id). Hijos = por FK.
  - **Carpetas:** tabla `Folder` (project_id, parent_folder_id, name, order). Documentos con `folder_id`.

  Consultas: "hijos de X" son directas. "Todo el subárbol" requiere recursión (WITH RECURSIVE en MySQL 8+) o varias consultas en aplicación. Para profundidad baja (2–4 niveles) suele ser aceptable. Si se espera mucho anidamiento o muchas "carpetas" anidadas, el path materializado escala mejor.

Recomendación: si "carpetas" y "bloques" deben comportarse igual (arrastrar, expandir, listar hijos) y puede haber varios niveles, usar **audit_tree_node** con path materializado. Si la jerarquía es fija y poco profunda (proyecto → sección → ítem; proyecto → programa → procedimiento), se puede mantener solo FKs y, si hace falta, una vista o una tabla derivada con path para reportes.

### Dónde se guardan los documentos en la jerarquía

- Cada documento (registro en `audit_document` o equivalente) tiene: `storage_key`, `audit_project_id`, y opcionalmente **node_id** (FK a `audit_tree_node`) o **folder_id**.
- Así "todos los documentos de este nodo/carpeta" = `WHERE node_id = :id` (o `WHERE folder_id = :id`). La ruta de almacenamiento en B2/S3 puede incluir el path del nodo para organización (ej. `org/project/nodePath/fileName`), pero la **consulta** en la app es por `node_id` o `folder_id`.

---

## 4. Réplica de un proyecto de auditoría a otro (cambio de año / reutilizar)

### Objetivo

- Poder **copiar** un proyecto de auditoría a otro nuevo (p. ej. mismo cliente, nuevo ejercicio) reutilizando estructura y, donde aplique, información que no cambia, sin duplicar innecesariamente archivos ni estados ya cumplidos del año anterior.

### Factibilidad y criterios

- **Sí es factible.** Lo que suele reutilizarse entre un año y otro:
  - **Estructura del archivo permanente:** secciones e ítems del checklist (descripción, obligatorio, ref); no los estados ni los documentos adjuntos del año anterior.
  - **Estructura de planificación:** actividades del cronograma (nombre, orden); no las fechas ni los responsables asignados (o se copian como "sugerencia" y se dejan vacíos).
  - **Cuestionarios de control interno:** preguntas y estructura; las respuestas del nuevo proyecto van vacías o se copian como referencia no vinculante.
  - **Programas de auditoría:** áreas, procedimientos (descripción, aseveración); no "hecho por", "revisado por", ni fechas ni papeles de trabajo.
  - **Opcional:** referencias a documentos del proyecto origen (solo referencia, no copia de archivos) para ítems que "no cambian" (ej. escritura de constitución); eso se puede implementar en una fase posterior.

### Qué se copia, qué se resetea, qué no se copia

| Elemento | Acción en la réplica |
|----------|------------------------|
| Proyecto (nuevo) | Crear nuevo registro: mismo cliente, nuevo período (ej. año), estado "borrador" o "planificación". Opcional: campo `source_audit_project_id` para trazabilidad. |
| Archivo Permanente: secciones e ítems | Copiar estructura (secciones, ítems con descripción, obligatorio, ref). **Resetear:** estado a "Pendiente" (o "No aplica" donde corresponda); no copiar documentos adjuntos (o copiar solo referencia "documento del proyecto origen" si se implementa). |
| Planificación: cronograma | Copiar actividades (nombre, orden). **Resetear:** fechas (vacías o por defecto); responsables/revisores vacíos o opcionalmente copiados como sugerencia. |
| Cuestionarios | Copiar preguntas y estructura. **Resetear:** respuestas y evaluación. |
| Programas y procedimientos | Copiar programas por área y lista de procedimientos (descripción, aseveración). **Resetear:** hecho por, revisado por, fecha, observaciones; no copiar papeles de trabajo. |
| Hallazgos | **No copiar** (son del período anterior). Opcional: tabla "hallazgos de referencia" o comentario que indique "ver proyecto 20XX" para consulta humana. |
| Documentos (evidencias, anexos) | **No copiar** archivos por defecto (cada año tiene su propia evidencia). Opción avanzada: permitir "vincular" un documento del proyecto origen a un ítem del nuevo (solo referencia; el archivo sigue en B2/S3 una sola vez). |
| Informes | **No copiar**; el nuevo proyecto generará sus propios informes. |

### Flujo de réplica (alto nivel)

1. Usuario elige "Replicar proyecto" desde el proyecto origen (ej. auditoría 2024).
2. Backend crea **AuditProject** nuevo (mismo client_id, nuevo período, `source_audit_project_id` = origen).
3. Para cada sección/ítem del archivo permanente del origen: crear nodos/secciones/ítems en el nuevo proyecto con mismos atributos de estructura; estado = Pendiente; sin documentos.
4. Para cronograma: copiar actividades; fechas y asignaciones vacías (o por defecto).
5. Para cuestionarios: copiar estructura; respuestas vacías.
6. Para cada programa y procedimiento del origen: crear programa y procedimientos en el nuevo proyecto; sin "hecho por", "revisado por", ni papeles de trabajo.
7. (Opcional) Si existe tabla de árbol: copiar estructura de `audit_tree_node` duplicando nodos con nuevos id y nuevo `audit_project_id`; `ref_id` apuntando a las nuevas filas de ChecklistItem/Procedure, etc.

Con esto el flujo de réplica queda definido y alineado con "reutilizar lo estructural, resetear lo ejecutado y no duplicar archivos".

---

## 5. Resumen: cómo encaja todo

- **Documentos:** toda carga vía **URL directa** a B2/S3 (upload-url + PUT + confirm). El API no lee el archivo; solo emite URLs y persiste metadata. Ver **technical/file-upload.md**.
- **IA:** **opcional** en análisis de evidencia, sugerencia de hallazgos y redacción de informes. El flujo principal (archivo permanente, planificación, programas, procedimientos, hallazgos manuales, informes manuales) funciona **sin IA**.
- **Jerarquía:** **árbol** con tabla de nodos (lista de adyacencia + path materializado + depth) para consultas baratas (hijos directos, subárbol, breadcrumb) y sin recursión costosa; documentos asociados a `node_id` o `folder_id`.
- **Réplica de proyecto:** **factible**; se copia estructura (secciones, ítems, cronograma, cuestionarios, programas/procedimientos) y se resetean estados, asignaciones y fechas; no se copian hallazgos ni informes; documentos no se duplican (opcionalmente solo referencia al proyecto origen).

Estos criterios deben tenerse en cuenta al diseñar modelos, APIs y flujos de la plataforma (ver también **design/business-logic.md**, **design/audit-project-structure-and-assignments.md** y **technical/file-upload.md**).

---

## 6. Cómo empezar (orden sugerido de implementación)

1. **Documentos:** Dejar como único flujo de carga el de **URL directa** (upload-url → PUT a B2/S3 → confirm). Retirar o deprecar cualquier endpoint que reciba el archivo por multipart en el API. En confirm, persistir metadata y opcionalmente `audit_project_id` y `node_id`/`folder_id` cuando existan esas entidades.
2. **Entidades base del proyecto:** Implementar **Client**, **AuditProject**, **ProjectAssignment** (quién está en el equipo). Validar al crear proyecto `allowed_audit_types` y `max_audit_projects` desde OrganizationSetting.
3. **Jerarquía (árbol):** Si se quieren "carpetas" y bloques reutilizables, crear tabla **audit_tree_node** (parent_id, path, depth, type, name, order, audit_project_id, ref_id). Implementar creación de nodos, listado de hijos y, si aplica, breadcrumb. Asociar documentos a `node_id`.
4. **Archivo Permanente y Planificación:** Modelos para secciones, ítems de checklist, cronograma (actividades con asignación) y cuestionarios. Pueden vivir como tablas propias con FKs a proyecto (y opcionalmente a audit_tree_node si se unifica todo en el árbol).
5. **Programas y procedimientos:** AuditProgram (por área), Procedure (con doneBy, reviewedBy), WorkingPaper. Vincular documentos a procedimientos o a nodos.
6. **Hallazgos e informes:** Finding (PCI); ReportDraft/Report con plantilla. IA como jobs opcionales en segundo plano.
7. **Réplica de proyecto:** Endpoint o job "replicar proyecto" que ejecute la lógica del apartado 4 (copiar estructura, resetear estados y no copiar archivos/hallazgos/informes).
8. **IA:** Integrar análisis de evidencia y sugerencia de hallazgos/redacción como procesos asíncronos que se invocan tras confirm de documento o desde la UI "sugerir con IA"; sin bloquear el flujo principal.
