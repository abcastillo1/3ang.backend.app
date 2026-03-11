# Roadmap de la plataforma de auditoría contable

Estado de avance de todas las tareas necesarias para completar la plataforma. Actualizar conforme se implemente cada ítem.

**Leyenda:**
- [x] Completado
- [-] Parcialmente completado
- [ ] Pendiente

---

## FASE 0 — Infraestructura y base del sistema `100%`

Todo lo necesario para que el backend funcione: servidor, BD, auth, usuarios, roles, permisos, organizaciones.

- [x] Servidor Express con middlewares globales (helmet, bodyParser, i18n, body-validator)
- [x] Conexión a MySQL con Sequelize (models/index.js, models/database.js)
- [x] Sistema de logging a archivos locales (helpers/logger.js)
- [x] Internacionalización (assets/translations/, middleware i18n)
- [x] Manejo centralizado de errores (helpers/controller-wrapper.js)
- [x] Helper de respuestas estandarizadas (helpers/response.js)
- [x] Helper de validación (helpers/validator.js, middleware/validation.js)
- [x] Configuración de entorno (config/environment.js, config/constants.js)
- [x] Modelo Organization (con website, defaultCurrency, timezone, locale, registrationNumber)
- [x] Modelo OrganizationSetting (clave-valor por organización)
- [x] Modelo User (con documentType, softDelete)
- [x] Modelo UserSession
- [x] Modelo Role y RolePermission
- [x] Modelo Permission
- [x] Modelo AuditLog (request-level: método, ruta, IP, body sanitizado)
- [x] Modelo ActivityLog (organizationId, userId, auditProjectId, action, entity, entityId, descriptionKey, metadata)
- [x] Migraciones ActivityLog (0017 activity_logs + 0018 permiso activity.view)
- [x] Helper de actividad (helpers/record-activity.js + helpers/activity-mapping.js)
- [x] Integración centralizada en controller-wrapper (activityKey + activityContext por ruta, flush automático solo en respuestas 2xx/3xx)
- [x] API POST /audit/activity/list — historial de actividad por organización/proyecto/usuario, paginado
- [x] Traducciones de actividad en assets/translations/es.json y en.json (sección `activity`)
- [x] Autenticación JWT (login, logout, refresh)
- [x] Middleware de permisos (requirePermission, bypass del propietario)
- [x] APIs de auth: login, logout, refresh
- [x] APIs de users: create, list, update, profile, organization
- [x] APIs de roles: create, list, update, delete, assignPermissions
- [x] APIs de permissions: list
- [x] APIs de organizations: create, list, view, update
- [x] API de audit log: myActivity
- [x] API de health check: system/health
- [x] Documentación organizada (docs/README.md con categorías)
- [x] .cursorrules con reglas del proyecto

---

## FASE 1 — Carga de archivos y almacenamiento `100%`

Carga directa a B2/S3 vía URLs prefirmadas; el API nunca recibe el archivo. Aplica a todo: documentos de auditoría, imágenes de perfil, logos, etc.

- [x] Helper de storage (helpers/storage.js) — S3 client, generateUploadUrl, generateDownloadUrl, deleteObject
- [x] Endpoint POST /files/upload-url (genera URL prefirmada para cualquier categoría)
- [x] Endpoint POST /files/confirm — solo categorías de auditoría (audit_evidences, fiscal_reports, company_docs) → crea registro en audit_documents
- [x] Endpoint POST /files/link — vincular documentos huérfanos a un proyecto después de crearlo
- [x] Endpoint POST /files/download-url — obtener URL de descarga para cualquier archivo (profiles, URLs expiradas, etc.)
- [x] Modelo AuditDocument (storageKey, originalName, mimeType, size, category, auditProjectId, nodeId)
- [x] Migración SQL para tabla audit_documents
- [x] Validación de que el key pertenece a la organización del usuario
- [x] Soporte para auditProjectId y nodeId opcionales en confirm
- [x] Retirado endpoint legacy de upload multipart (ya no existe /files/upload)
- [x] Documentación del flujo con 3 escenarios (docs/technical/file-upload.md)
- [x] API POST /files/list — listar documentos (filtros por proyecto, categoría, nodo, paginación)
- [x] API POST /files/delete — eliminar documento (destroy + deleteObject en B2)

---

## FASE 2 — Entidades base del dominio de auditoría `100%`

Clientes, proyectos de auditoría y asignaciones de equipo.

### 2.1 Clientes (Client) `100%`

- [x] Modelo Client (name, legalName, ruc, email, phone, address, isActive)
- [x] Asociaciones (Organization hasMany Client; Client hasMany AuditProject)
- [x] Migración SQL para tabla clients
- [x] API POST /clients/create — crear cliente (validar unicidad ruc por organización)
- [x] API POST /clients/list — listar clientes de la organización (paginación, búsqueda por nombre/legalName/ruc)
- [x] API POST /clients/view — ver detalle de un cliente (incluye proyectos asociados)
- [x] API POST /clients/update — actualizar cliente (validar unicidad ruc)
- [x] API POST /clients/delete — soft delete (bloquear si tiene proyectos activos)
- [x] Router routes/clients.js y registro en routes/index.js
- [x] Permisos: clients.create, clients.view, clients.update, clients.delete (migración 0010)

### 2.2 Proyectos de auditoría (AuditProject) `100%`

- [x] Modelo AuditProject (name, auditType, periodStart, periodEnd, status, sourceAuditProjectId)
- [x] Asociaciones (Organization, Client, ProjectAssignment, AuditDocument)
- [x] Migración SQL para tabla audit_projects
- [x] API POST /projects/create — crear proyecto (valida allowed_audit_types y max_audit_projects desde OrganizationSetting; acepta documentIds)
- [x] API POST /projects/list — listar proyectos (filtros: clientId, status, search, paginación)
- [x] API POST /projects/view — ver detalle con asignaciones, cliente y documentos
- [x] API POST /projects/update — actualizar proyecto (nombre, tipo, período, status con transición validada)
- [x] API POST /projects/delete — soft delete (solo si status = draft)
- [x] Router routes/projects.js y registro en routes/index.js
- [x] Permisos: projects.create, projects.view, projects.update, projects.delete (migración 0011)
- [x] Lógica de transición de estados (draft → planning → in_progress → review → closed)

### 2.3 Asignaciones al proyecto (ProjectAssignment) `100%`

- [x] Modelo ProjectAssignment (auditProjectId, userId, role: partner/manager/member)
- [x] Migración SQL para tabla project_assignments
- [x] API POST /projects/assignments/add — asignar usuario al proyecto (valida misma organización y usuario activo)
- [x] API POST /projects/assignments/remove — quitar asignación
- [x] API POST /projects/assignments/list — listar miembros del proyecto
- [x] Validación: usuario pertenece a la misma organización
- [x] Permisos: projects.assignments.manage (migración 0011)

---

## FASE 3 — Jerarquía del proyecto (árbol de nodos) `100%`

Estructura tipo árbol para organizar secciones, carpetas y bloques dentro de un proyecto.

- [x] Modelo AuditTreeNode (auditProjectId, parentId, path, depth, type, name, order, refId, isSystemNode)
- [x] Migración SQL para tabla audit_tree_nodes (0012) + FK audit_documents.node_id
- [x] API POST /projects/tree/create — crear nodo (validar profundidad máxima 6)
- [x] API POST /projects/tree/list — listar hijos de un nodo (o raíz) con childrenCount y documentos
- [x] API POST /projects/tree/move — mover nodo (actualizar path/depth de descendientes en transacción)
- [x] API POST /projects/tree/reorder — reordenar nodos dentro del mismo padre
- [x] API POST /projects/tree/delete — eliminar nodo y subárbol (desvincula documentos)
- [x] API POST /projects/tree/breadcrumb — obtener ruta de un nodo a la raíz
- [x] Vincular AuditDocument.nodeId a audit_tree_nodes (asociación belongsTo + FK en migración)
- [x] Creación automática de estructura base al crear proyecto (5 nodos raíz: Archivo Permanente, Planificación, Programas, Hallazgos, Informes) — helper tree-seed.js
- [x] Nodos de sistema (isSystemNode) no se pueden eliminar ni mover
- [x] Permisos: projects.tree.manage (migración 0013)
- [x] Router: rutas tree registradas en routes/projects.js
- [x] Documentación frontend: docs/frontend/api/tree.md

---

## FASE 4 — Archivo Permanente `~33%`

Expediente del cliente: secciones, checklist de ítems, matriz de riesgos, dashboard de cumplimiento.

### 4.1 Secciones e ítems del checklist `100%`

- [x] Modelo PermanentFileSection (auditProjectId, code, name, priority, sortOrder, parentSectionId)
- [x] Modelo ChecklistItem (sectionId, code, description, isRequired, ref, status, documentId, sortOrder, lastReviewedAt)
- [x] Migración 0019 permanent_file_sections + checklist_items; migración 0020 permiso projects.permanentFile.manage
- [x] API POST /projects/permanent-file/sections/create, list, view, update, delete (body.data.auditProjectId)
- [x] API POST /projects/permanent-file/items/create, list, update, delete (body.data.auditProjectId, sectionId/itemId)
- [x] Estados del ítem: pending, in_review, compliant, not_applicable
- [x] Actividad registrada (activityKey + activity-mapping + traducciones activity.permanentFile.*)
- [x] Plantilla por organización: tablas permanent_file_template_sections e permanent_file_template_items (migración 0021), permiso organizations.permanentFileTemplate.manage (0022)
- [x] APIs CRUD plantilla bajo /organizations/permanent-file-template/ (sections e items), load-defaults (carga plantilla NIA estándar si vacía)
- [x] POST /projects/permanent-file/apply-template — aplica plantilla de la org al proyecto
- [x] Seed por defecto para org 1 en migración 0022 (secciones A–D con ítems)

### 4.2 Matriz de riesgos

- [ ] Modelo RiskItem (projectId, riskCode, description, cause, effect, probability, impact, level, linkedItems)
- [ ] Migración SQL
- [ ] API CRUD para riesgos (vincular a ítems del checklist)
- [ ] Cálculo automático de nivel de riesgo (prob × impacto)

### 4.3 Dashboard de cumplimiento

- [ ] API POST /projects/:id/permanent-file/dashboard — KPIs: % cumplimiento, ítems críticos pendientes, resumen por prioridad
- [ ] Alertas: ítems P1 pendientes, ítems sin actualizar > 12 meses, obligatorios sin evidencia

---

## FASE 5 — Planificación `0%`

Cronograma de actividades y cuestionarios de control interno.

### 5.1 Cronograma

- [ ] Modelo Schedule (projectId)
- [ ] Modelo ScheduleActivity (scheduleId, name, startDate, endDate, assignedToUserId, reviewedByUserId, observation, order)
- [ ] Migraciones SQL
- [ ] API CRUD para actividades del cronograma
- [ ] Asignación de responsable y revisor por actividad
- [ ] Seed/plantilla: actividades estándar (Reunión del equipo, Conocimiento de la entidad, Solicitud de EEFF, etc.)

### 5.2 Cuestionarios de control interno

- [ ] Modelo ControlQuestionnaire (projectId, type, evaluationResult)
- [ ] Modelo QuestionnaireQuestion (questionnaireId, question, answer, observation, refWorkingPaper)
- [ ] Migraciones SQL
- [ ] API CRUD para cuestionarios y preguntas
- [ ] Tipos: Actas, Organización, Situación Legal, NIF, Presupuestos, Fiscal, Seguros, Personal, CxC
- [ ] Respuestas: SI / NO / N/A con observación
- [ ] Evaluación final del cuestionario: Alto / Moderado / Bajo
- [ ] Seed/plantilla: preguntas estándar por tipo de cuestionario

---

## FASE 6 — Programas de auditoría y ejecución `0%`

Programas por área contable, procedimientos, papeles de trabajo.

### 6.1 Programas de auditoría

- [ ] Modelo AuditProgram (projectId, areaCode, areaName, objectives, assignedToUserId)
- [ ] Migración SQL
- [ ] API CRUD para programas
- [ ] Seed/plantilla: programas estándar por área (D: Bancos, E: Inversiones, F: CxC, G: Inventarios, H: Pagos anticipados, I: PPE, J: Otros activos, K: Préstamos CP, L: CxP, M: Obligaciones laborales, N: Tributarias, O: Partes relacionadas, Q: Obligaciones LP, R: Patrimonio, S-X: Ingresos y gastos, Z: Contingentes)

### 6.2 Procedimientos

- [ ] Modelo Procedure (programId, description, assertions, refWorkingPaper, doneByUserId, reviewedByUserId, date, observations, status)
- [ ] Migración SQL
- [ ] API CRUD para procedimientos
- [ ] Aseveraciones: T (Totalidad), E (Existencia), A (Exactitud), V (Valuación)
- [ ] Asignación de "hecho por" y "revisado por"
- [ ] Seed/plantilla: procedimientos estándar por área (los listados en fases-auditoria-especifico.md)

### 6.3 Papeles de trabajo

- [ ] Modelo WorkingPaper (procedureId, projectId, title, content, documentId, createdByUserId)
- [ ] Migración SQL
- [ ] API CRUD para papeles de trabajo (acepta documentIds para vincular documentos)
- [ ] Vincular a procedimiento y/o a hallazgo
- [ ] Marcas de auditoría (√, =, X, Ø, ?, ∑, €, etc.) — soporte en el modelo o en contenido libre

---

## FASE 7 — Hallazgos (PCI) `0%`

Registro de hallazgos con estructura Condición-Criterio-Causa-Efecto-Recomendación.

- [ ] Modelo Finding (projectId, number, workingPaperId, areaCode, support, observation, condition, criteria, cause, effect, recommendation, status)
- [ ] Migración SQL
- [ ] API CRUD para hallazgos (acepta documentIds para vincular evidencia)
- [ ] Vincular a papel de trabajo y área del programa
- [ ] Estados: draft, in_review, approved, rejected
- [ ] Listado y filtros por proyecto, área, estado

---

## FASE 8 — Informes `0%`

Plantillas de informe, borradores y generación del informe final.

### 8.1 Plantillas de informe

- [ ] Modelo ReportTemplate (organizationId, name, type, sections JSON, isSystem)
- [ ] Migración SQL
- [ ] API CRUD para plantillas (sistema y por organización)
- [ ] Tipos: dictamen (NIA 700), carta de recomendaciones, informe especial (lavado de activos, precios de transferencia)
- [ ] OrganizationSetting report_template_id como plantilla por defecto

### 8.2 Borradores e informe final

- [ ] Modelo ReportDraft (projectId, templateId, type, content JSON, status, createdByUserId)
- [ ] Modelo Report (projectId, reportDraftId, finalContent, signedByUserId, signedAt, documentId)
- [ ] Migraciones SQL
- [ ] API CRUD para borradores (crear desde plantilla, editar secciones, cambiar estado)
- [ ] API para generar informe final (PDF/Word) a partir de borrador aprobado
- [ ] Flujo de revisión: draft → in_review → approved → signed
- [ ] Vincular informe final a AuditDocument (subido a B2/S3)
- [ ] Firma: registrar firmante y fecha; datos de firma electrónica de Organization

---

## FASE 9 — Réplica de proyecto `0%`

Copiar estructura de un proyecto a uno nuevo (cambio de año) sin duplicar archivos ni hallazgos.

- [ ] API POST /projects/replicate — crear proyecto nuevo a partir de uno existente
- [ ] Copiar: secciones del archivo permanente + ítems (estado = pending, sin documentos)
- [ ] Copiar: actividades del cronograma (fechas vacías, asignaciones vacías o sugeridas)
- [ ] Copiar: cuestionarios (estructura y preguntas; respuestas vacías)
- [ ] Copiar: programas y procedimientos (sin doneBy, reviewedBy, papeles de trabajo)
- [ ] NO copiar: hallazgos, informes, documentos (evidencias)
- [ ] Campo sourceAuditProjectId para trazabilidad
- [ ] Si usa árbol: duplicar estructura de audit_tree_node con nuevos IDs

---

## FASE 10 — Inteligencia Artificial (opcional) `0%`

IA como recurso adicional; el flujo principal funciona sin ella.

### 10.1 Análisis de evidencia

- [ ] Helper helpers/ai-analyst.js (integración con Claude API)
- [ ] Job asíncrono: tras confirm de documento, encolar análisis
- [ ] La IA obtiene el documento vía URL de lectura prefirmada (no desde el API)
- [ ] Actualizar analysisStatus en AuditDocument (pending → processing → completed/failed)
- [ ] Guardar resultado del análisis (hallazgos sugeridos, etiquetas, riesgos)

### 10.2 Sugerencia de hallazgos

- [ ] Endpoint o job: "sugerir hallazgos" a partir de evidencia analizada
- [ ] La IA propone Condición, Criterio, Causa, Efecto
- [ ] El usuario revisa, edita y acepta/descarta

### 10.3 Redacción de informe asistida

- [ ] Endpoint o job: "sugerir contenido" para secciones del borrador de informe
- [ ] La IA usa plantilla + hallazgos + datos del proyecto para proponer párrafos
- [ ] El usuario revisa y ajusta

### 10.4 Archivo Permanente asistido

- [ ] Opcional: IA sugiere valoración de riesgo a partir de documentos subidos
- [ ] Opcional: IA sugiere preguntas de seguimiento o ítems faltantes

---

## FASE 11 — Dashboard y analítica `0%`

Vistas agregadas para monitorear el avance de los proyectos.

- [ ] Dashboard general: proyectos activos, proyectos por estado, próximos a vencer
- [ ] Dashboard por proyecto: % avance (procedimientos completados, ítems verificados), hallazgos por área
- [ ] "Mis tareas": actividades del cronograma y procedimientos donde soy responsable o revisor
- [ ] Avance por colaborador: tareas asignadas vs completadas
- [ ] Políticas de retención: advertencia si se intenta eliminar documentos antes de document_retention_years

---

## Reglas transversales (a partir de Fase 4)

- **Registro de actividad de negocio (ActivityLog)**:
  - Toda API que modifique estado de dominio (crear/actualizar/eliminar entidades, asignar/quitar usuarios, mover nodos, subir/eliminar documentos, etc.) debe:
    - Definir un `activityKey` en la ruta.
    - Poner en `req.activityContext` los datos mínimos (IDs, nombres, flags) que el mapa de actividad espera.
  - Cualquier nueva acción debe añadirse a `helpers/activity-mapping.js` y a `assets/translations/*/activity.*`.
  - El listado `/audit/activity/list` es la fuente de verdad para feeds, dashboards y auditoría funcional.

---

## Resumen de avance global

| Fase | Módulo | Avance |
|------|--------|--------|
| 0 | Infraestructura y base | **100%** |
| 1 | Carga de archivos | **100%** |
| 2 | Entidades base (Client, Project, Assignment) | **100%** |
| 3 | Jerarquía del proyecto (árbol) | **100%** |
| 4 | Archivo Permanente | **0%** |
| 5 | Planificación (cronograma, cuestionarios) | **0%** |
| 6 | Programas de auditoría y ejecución | **0%** |
| 7 | Hallazgos (PCI) | **0%** |
| 8 | Informes (plantillas, borradores, final) | **0%** |
| 9 | Réplica de proyecto | **0%** |
| 10 | Inteligencia Artificial | **0%** |
| 11 | Dashboard y analítica | **0%** |
| | **TOTAL ESTIMADO** | **~33%** |

---

## Orden de implementación sugerido

Seguir el orden de fases (0 → 11). Dentro de cada fase, completar modelos + migraciones → APIs → validaciones → seeds/plantillas. La Fase 10 (IA) puede implementarse en cualquier momento después de la Fase 1 (archivos) y la Fase 7 (hallazgos), ya que es independiente del flujo principal.

**Próximo paso inmediato: Fase 4 — Archivo Permanente (secciones, checklist, matriz de riesgos).**
