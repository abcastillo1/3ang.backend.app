# Documentación de la plataforma de auditoría contable

Índice categorizado de toda la documentación del proyecto. Usar como punto de entrada para entender el sistema.

---

## 1. Dominio — Conocimiento del negocio (`domain/`)

Documentos que describen **qué hace el cliente hoy** en el mundo real (firmas auditoras en Ecuador). Son la fuente de verdad del proceso de auditoría que la plataforma digitaliza.

| Documento | Contenido |
|-----------|-----------|
| [`domain/fases-auditoria-general.md`](domain/fases-auditoria-general.md) | Resumen general del flujo de auditoría: fases (Archivo Permanente → Planificación → Ejecución → Reportes), grupos funcionales y componentes por fase. Basado en `ideamodulos.xls`. |
| [`domain/fases-auditoria-especifico.md`](domain/fases-auditoria-especifico.md) | Extracción detallada de `ideamodulos.xls`: normativa NIA/NIIF, checklist del archivo permanente ítem por ítem, cuestionarios de control interno, programas de auditoría por área (Bancos, CxC, Inventarios, etc.), marcas, hallazgos PCI, plantillas de informe. Es el "manual de construcción" completo. |
| `ideamodulos.xls` (raíz de `docs/`) | Archivo Excel original del cliente con las 56 hojas de trabajo. Los dos archivos anteriores son su transcripción a texto. |

**Cuándo leer:** Al diseñar un módulo nuevo, para entender cómo funciona en el mundo real antes de traducirlo a código.

---

## 2. Diseño de plataforma — Decisiones de producto (`design/`)

Documentos que traducen el dominio en **entidades, flujos y reglas** de la plataforma. Definen *qué* construir y *por qué*.

| Documento | Contenido |
|-----------|-----------|
| [`design/business-logic.md`](design/business-logic.md) | Fuente de verdad de la lógica de negocio: entidades (Organization, User, Client, AuditProject, etc.), reglas de validación, flujos de trabajo (login, permisos, creación de proyectos), OrganizationSetting con ejemplos, notas para desarrolladores. |
| [`design/audit-project-structure-and-assignments.md`](design/audit-project-structure-and-assignments.md) | Estructura interna de un proyecto de auditoría: secciones (Archivo Permanente, Planificación, Programas por área, Hallazgos, Informes), asignaciones de colaboradores (proyecto, cronograma, procedimientos) y esquema de entidades. |
| [`design/platform-flows.md`](design/platform-flows.md) | Decisiones transversales: (1) carga de documentos solo por URL directa a B2/S3; (2) IA como extra opcional; (3) jerarquía en árbol (`audit_tree_node`); (4) réplica de proyecto (qué copiar/resetear); (5) orden sugerido de implementación. |

**Cuándo leer:** Antes de implementar o modificar cualquier funcionalidad, para alinear con las reglas de negocio y decisiones de diseño.

---

## 3. Referencia técnica — Arquitectura y APIs (`technical/`)

Documentos sobre **cómo** está construido el backend: patrones, convenciones, endpoints, configuración.

| Documento | Contenido |
|-----------|-----------|
| [`technical/architecture.md`](technical/architecture.md) | Arquitectura del backend: stack (Express, Sequelize, MySQL), estructura de directorios, patrones (controladores, validación, manejo de errores, modelos, middlewares, i18n, logging), convenciones de código, flujo de una petición. |
| [`technical/file-upload.md`](technical/file-upload.md) | Flujo de carga de archivos con URLs prefirmadas (Backblaze B2): endpoints `upload-url` y `confirm`, respuestas, ejemplo frontend, estructura del key, configuración (env vars), categorías y MIME types. |
| [`technical/api-reference.md`](technical/api-reference.md) | Referencia de APIs existentes: Auth (login, refresh, logout), Users (list, create, update, profile), Roles (CRUD, assign-permissions), Permissions (list), Organizations. Incluye ejemplos de request/response y errores. |

**Cuándo leer:** Al implementar endpoints, revisar convenciones o configurar el entorno.

---

## 4. Roadmap y avance

| Documento | Contenido |
|-----------|-----------|
| [`ROADMAP.md`](ROADMAP.md) | **Lista completa de tareas** por fase (0–11), con estado (hecho/pendiente), porcentaje de avance por fase y avance global. Actualizar conforme se implemente. |

---

## 5. Configuración del proyecto (raíz)

| Archivo | Ubicación | Contenido |
|---------|-----------|-----------|
| `.cursorrules` | Raíz del proyecto | Reglas obligatorias para el AI: stack, estructura, convenciones, alcance. **Leer siempre primero.** |
| `.env` | Raíz del proyecto | Variables de entorno (no commitear). |

---

## Relaciones entre documentos

```
.cursorrules (reglas obligatorias)
    └── referencia → design/business-logic.md

design/business-logic.md (fuente de verdad del dominio)
    ├── referencia → domain/fases-auditoria-general.md
    ├── referencia → domain/fases-auditoria-especifico.md
    ├── referencia → design/audit-project-structure-and-assignments.md
    └── referencia → design/platform-flows.md

design/platform-flows.md (decisiones transversales)
    ├── referencia → technical/file-upload.md
    ├── referencia → design/business-logic.md
    └── referencia → design/audit-project-structure-and-assignments.md

design/audit-project-structure-and-assignments.md (estructura del proyecto)
    ├── referencia → domain/fases-auditoria-general.md
    ├── referencia → domain/fases-auditoria-especifico.md
    └── referencia → design/business-logic.md
```

---

## Orden de lectura sugerido

1. `.cursorrules` — reglas técnicas obligatorias
2. `design/business-logic.md` — lógica del dominio
3. `design/audit-project-structure-and-assignments.md` — estructura del proyecto
4. `design/platform-flows.md` — decisiones transversales
5. `technical/architecture.md` — cómo está construido
6. `domain/fases-auditoria-*` — solo si necesitas entender el proceso real del cliente
