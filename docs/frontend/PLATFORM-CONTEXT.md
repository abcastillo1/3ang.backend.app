# Contexto de la Plataforma — Para el Frontend

> **Última actualización:** 2026-03-02 — Archivo permanente (secciones e ítems del checklist)

Este documento describe qué es la plataforma, qué entidades maneja, cómo se relacionan y qué datos de prueba existen. Copiar este archivo al proyecto frontend para que sirva como contexto permanente.

**REGLA DE MANTENIMIENTO:** Este archivo se actualiza en el backend al cerrar cada fase o cambio relevante (nuevas entidades, endpoints, flujos, datos de prueba). Después de cada actualización, copiar la versión nueva al proyecto frontend para mantener el contexto sincronizado.

---

## Qué es la plataforma

Sistema multi-tenant para **firmas de auditoría contable** (Ecuador, normas NIA/NIIF). Cada firma (organización) gestiona:
- Sus usuarios y roles
- Sus clientes (empresas auditadas)
- Sus proyectos de auditoría (encargos por cliente y período)
- La estructura interna de cada proyecto (árbol de secciones, programas, procedimientos)
- Documentos y evidencia (subidos directo a Backblaze B2 vía URLs firmadas)

La plataforma NO es un ERP ni un sistema contable. Es la herramienta de trabajo del auditor: organiza el expediente, planifica el trabajo, documenta la ejecución y genera informes.

---

## Entidades principales y relaciones

```
Organization (firma auditora)
  ├── Users (colaboradores de la firma)
  │     └── cada uno tiene un Role con Permissions
  ├── Clients (empresas que la firma audita)
  ├── OrganizationSettings (configuración: límites, tipos permitidos, plantilla del árbol)
  └── AuditProjects (encargos/proyectos de auditoría)
        ├── ProjectAssignments → Users (equipo: partner, manager, member)
        ├── AuditTreeNodes (estructura jerárquica del proyecto)
        │     ├── Archivo Permanente → secciones → ítems
        │     ├── Planificación → cronograma, cuestionarios
        │     ├── Programas → áreas contables → procedimientos
        │     ├── Hallazgos → hallazgos PCI
        │     └── Informes → dictamen, carta a gerencia
        └── AuditDocuments (archivos subidos, vinculados a proyecto y/o nodo)
```

---

## Roles de usuario

La plataforma tiene un sistema de permisos granular. Cada rol tiene un conjunto de permisos (codes como `projects.view`, `clients.create`). El frontend debe:
- Leer `role.permissions` del login
- Mostrar/ocultar funcionalidades según los permisos del usuario
- El **owner** de la organización siempre tiene acceso total (el backend ignora permisos para él)

| Rol | Acceso típico |
|-----|---------------|
| Administrador | Todo |
| Socio | Proyectos, clientes, equipo, archivos. No gestiona usuarios/roles |
| Supervisor | Proyectos, clientes, equipo, árbol. No elimina proyectos |
| Auditor | Ve proyectos/clientes, gestiona árbol, sube archivos |
| Asistente | Solo lectura + subir archivos |

---

## Proyecto de auditoría — ciclo de vida

Un proyecto tiene estados con transición lineal (no se puede retroceder ni saltar):

```
draft → planning → in_progress → review → closed
```

- `draft`: recién creado, se puede eliminar
- `planning`: planificación del trabajo
- `in_progress`: ejecución (el equipo trabaja)
- `review`: revisión del socio/supervisor
- `closed`: cerrado, archivado

---

## Árbol del proyecto

Cada proyecto tiene una estructura jerárquica (árbol) que se crea automáticamente al crear el proyecto. Los nodos raíz son configurables por organización (plantilla), por defecto:

1. **Archivo Permanente** — expediente del cliente. Tiene **secciones** (jerárquicas: code, name, priority) e **ítems de checklist** por sección (code, description, status: pending / in_review / compliant / not_applicable, documento opcional). **Plantilla por organización:** cada firma define su plantilla estándar (secciones e ítems) en Configuración (`POST /organizations/permanent-file-template/sections/*` y `items/*`, permiso `organizations.permanentFileTemplate.manage`). Opción "Cargar valores por defecto" (`/organizations/permanent-file-template/load-defaults`) inserta la plantilla NIA estándar si la plantilla está vacía. Para crear el contenido en un proyecto a partir de la plantilla: `POST /projects/permanent-file/apply-template` con `data.auditProjectId`. CRUD por proyecto: `POST /projects/permanent-file/sections/*` y `items/*` con `data.auditProjectId`. Permiso proyecto: `projects.permanentFile.manage`; ver: `projects.view`. Ver `docs/frontend/api/permanent-file.md`.
2. **Planificación** — cronograma, cuestionarios de control interno
3. **Programas de Auditoría** — un programa por área contable (Bancos, CxC, Inventarios...), cada uno con procedimientos
4. **Hallazgos** — problemas encontrados (PCI: Condición, Criterio, Causa, Efecto)
5. **Informes** — dictamen, carta a la gerencia, informes especiales

El frontend muestra esto como un árbol expandible (sidebar o panel). Se carga con `POST /projects/tree/full` en una sola llamada.

Los documentos se listan por nodo en `node-detail` (el árbol `tree/full` no devuelve conteo por nodo por rendimiento).

Los nodos raíz (sistema) no se pueden eliminar ni mover. Los nodos hijos sí.

---

## Historial de actividad

Hay dos niveles de registro:

1. **AuditLog** (request-level): cada request HTTP exitoso se registra (método, path, IP, body sanitizado). Sirve para seguridad y auditoría técnica. El endpoint `/audit/my-activity` devuelve solo la actividad del usuario logueado en ese formato.

2. **ActivityLog** (negocio): cada acción relevante del usuario se registra como un evento con quién, cuándo, qué hizo y en qué proyecto (si aplica). Permite mostrar en el frontend un historial legible: "María sacó a Carlos del equipo", "Luis creó el proyecto X", "Ana subió el documento Y". Se consulta con `POST /audit/activity/list`.

**Request** `POST /audit/activity/list` (permiso `activity.view`):

- `data.page`, `data.limit`: paginación.
- `data.auditProjectId`: opcional. Si se envía, solo se devuelve actividad de ese proyecto (y se valida que el proyecto sea de la organización).
- `data.userId`, `data.action`, `data.entity`: filtros opcionales.

**Response**: `{ activity: [ { id, userId, userFullName, userEmail, auditProjectId, action, entity, entityId, description, metadata, createdAt } ], pagination: { page, limit, total, totalPages } }`.

El campo `description` es texto listo para mostrar (ej. "Sacó a Carlos Mendoza del equipo"). El `action` es un código estable (ej. `assignment.removed`) por si el frontend prefiere traducir por i18n. `metadata` trae contexto adicional (nombres de proyecto, documento, etc.).

Uso típico: feed de actividad en el dashboard (org), y panel "Historial" o "Actividad" dentro de la vista de un proyecto (filtrando por `auditProjectId`).

---

## Subida de archivos

Los archivos NO pasan por el backend. Flujo:

1. Frontend pide URL firmada → `POST /files/upload-url`
2. Frontend sube el archivo directo a Backblaze B2 → `PUT <uploadUrl>` (única excepción a api.service.js)
3. Para archivos de auditoría: confirmar → `POST /files/confirm` → obtiene `document.id`
4. Para imágenes de perfil: guardar el `key` en la entidad, usar `POST /files/download-url` para mostrar

---

## Pantallas principales a construir

### Autenticación
- Login
- Recuperar contraseña (futuro)

### Dashboard
- Resumen: proyectos activos, actividad reciente (feed desde `/audit/activity/list`)

### Usuarios y Roles
- Lista de usuarios (búsqueda, paginación)
- Crear/editar usuario
- Lista de roles
- Crear/editar rol con asignación de permisos

### Clientes
- Lista de clientes (búsqueda, filtro activo/inactivo)
- Crear/editar cliente
- Detalle del cliente (con sus proyectos)

### Proyectos de Auditoría
- Lista de proyectos (filtros: cliente, estado, búsqueda)
- Crear proyecto (seleccionar cliente, tipo, período)
- **Vista principal del proyecto** — la pantalla más importante:
  - Panel lateral: árbol del proyecto (expandible, con drag & drop para reordenar)
  - Panel central: contenido del nodo seleccionado (documentos, formularios según el tipo)
  - Header: datos del proyecto, estado, equipo asignado
  - Breadcrumb: ruta del nodo actual
  - Opcional: panel o pestaña "Actividad" / "Historial" con `/audit/activity/list` filtrado por `auditProjectId`

### Gestión del equipo
- Asignar/quitar miembros al proyecto
- Selección de rol (partner, manager, member)

### Configuración de la organización
- Datos de la firma
- Settings (límites, tipos de auditoría)
- Plantilla del árbol (personalizar secciones raíz)

---

## Datos de prueba

### Backend
- **URL:** `http://localhost:3000/api/v1`
- **Método:** Siempre POST
- **Body:** `{ "data": { ... } }`

### Usuarios (password: `Demo2026!` para todos)

| Email | Rol |
|-------|-----|
| andres.garcia@3angauditores.com | Administrador (owner) |
| maria.castillo@3angauditores.com | Socio |
| carlos.mendoza@3angauditores.com | Supervisor |
| laura.vega@3angauditores.com | Auditor |
| roberto.flores@3angauditores.com | Auditor |
| ana.paredes@3angauditores.com | Asistente |

### Organización
- 3ANG Auditores & Consultores Cía. Ltda.
- RUC: 1792345678001
- Quito, Ecuador

### Clientes
- Comercial La Guayaquilita S.A. (Guayaquil)
- TechNova Ecuador Cía. Ltda. (Quito)
- Agrícola del Pacífico S.A. (Guayaquil)

### Proyectos
- Auditoría Financiera 2025 - Guayaquilita (`in_progress`, equipo de 5, árbol completo)
- Auditoría Tributaria 2025 - TechNova (`planning`, equipo de 3)
- Auditoría de Cumplimiento 2025 - Agrícola (`draft`, sin equipo)

---

## Referencia de APIs

Los contratos completos de cada endpoint están en la carpeta `api-reference/` del proyecto frontend. Archivos por módulo:

| Archivo | Contenido |
|---------|-----------|
| `_overview.md` | Convenciones generales, formato request/response, tabla de todos los endpoints |
| `auth.md` | Login, logout, refresh token |
| `users-roles.md` | CRUD usuarios, roles, permisos |
| `organizations.md` | Datos de organización, settings |
| `clients.md` | CRUD clientes |
| `projects.md` | CRUD proyectos, asignaciones de equipo |
| `tree.md` | Árbol del proyecto: crear, listar, mover, reordenar, eliminar, breadcrumb, full |
| `permanent-file.md` | Archivo permanente: secciones e ítems del checklist (CRUD) |
| `files.md` | Listar, eliminar, vincular documentos, download URL |
| `activity.md` | Listar historial de actividad (org y por proyecto) |
| `file-upload.md` (en flows/) | Flujo completo de subida de archivos |

Si un archivo no existe en `api-reference/`, copiarlo desde la documentación del backend (`docs/frontend/api/` y `docs/frontend/flows/`).

---

## Historial de cambios

| Fecha | Fase | Cambios |
|-------|------|---------|
| 2026-03-02 | FASE 1-2 | Auth, usuarios, roles, permisos, organizaciones, clientes, archivos |
| 2026-03-02 | FASE 3 | Proyectos, asignaciones, árbol jerárquico, plantilla configurable, datos demo |
| 2026-03-09 | — | ActivityLog: historial de acciones por proyecto/org, endpoint `/audit/activity/list`, permiso `activity.view` |
| 2026-03-02 | FASE 4.1 | Archivo permanente: modelos PermanentFileSection y ChecklistItem, APIs CRUD secciones e ítems, permiso `projects.permanentFile.manage`, actividad registrada |
