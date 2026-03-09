# Proyectos de Auditoría y Asignaciones — Contratos de API

Un proyecto de auditoría es un encargo (engagement) que la firma realiza a un cliente para un período determinado.

---

## Crear proyecto

```
POST /api/v1/projects/create
Authorization: Bearer <token>
Requiere permiso: projects.create
```

### Request

```json
{
  "data": {
    "name": "Auditoría 2025 - Empresa ABC",
    "clientId": 1,
    "auditType": "financial",
    "periodStart": "2025-01-01",
    "periodEnd": "2025-12-31",
    "documentIds": [42, 43]
  }
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `name` | string | Sí | Nombre del proyecto (2–255 caracteres) |
| `clientId` | int | Sí | ID del cliente (debe pertenecer a la organización) |
| `auditType` | string | No | Tipo de auditoría (ej: `financial`, `tax`, `compliance`). Se valida contra `allowed_audit_types` de OrganizationSetting si existe. |
| `periodStart` | date | No | Inicio del período auditado (formato `YYYY-MM-DD`) |
| `periodEnd` | date | No | Fin del período auditado |
| `documentIds` | int[] | No | IDs de documentos previamente subidos (huérfanos) a vincular al proyecto |

### Response (200)

```json
{
  "data": {
    "project": {
      "id": 5,
      "organizationId": 1,
      "clientId": 1,
      "name": "Auditoría 2025 - Empresa ABC",
      "auditType": "financial",
      "periodStart": "2025-01-01",
      "periodEnd": "2025-12-31",
      "status": "draft",
      "sourceAuditProjectId": null,
      "createdAt": "2026-03-02T...",
      "client": {
        "id": 1,
        "name": "Empresa ABC S.A.",
        "ruc": "1790012345001"
      }
    }
  }
}
```

El proyecto siempre se crea con `status: "draft"`.

### Errores posibles

| Código | errorCode | Causa |
|--------|-----------|-------|
| 400 | `projects.clientNotFound` | Cliente no existe o no pertenece a la organización |
| 400 | `projects.maxReached` | Se alcanzó el límite de proyectos (según `max_audit_projects` de OrganizationSetting) |
| 400 | `projects.auditTypeNotAllowed` | Tipo de auditoría no permitido (según `allowed_audit_types` de OrganizationSetting) |

---

## Listar proyectos

```
POST /api/v1/projects/list
Authorization: Bearer <token>
Requiere permiso: projects.view
```

### Request

```json
{
  "data": {
    "page": 1,
    "limit": 20,
    "clientId": 1,
    "status": "in_progress",
    "search": "auditoría 2025"
  }
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `page` | int | No | Página (default 1) |
| `limit` | int | No | Registros por página (default 20, max 100) |
| `clientId` | int | No | Filtrar por cliente |
| `status` | string | No | Filtrar por estado: `draft`, `planning`, `in_progress`, `review`, `closed` |
| `search` | string | No | Buscar por nombre del proyecto |

### Response (200)

```json
{
  "data": {
    "projects": [
      {
        "id": 5,
        "name": "Auditoría 2025 - Empresa ABC",
        "auditType": "financial",
        "periodStart": "2025-01-01",
        "periodEnd": "2025-12-31",
        "status": "in_progress",
        "clientId": 1,
        "createdAt": "2026-03-02T...",
        "client": {
          "id": 1,
          "name": "Empresa ABC S.A.",
          "ruc": "1790012345001"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 12,
      "totalPages": 1
    }
  }
}
```

Ordenados por fecha de creación (más recientes primero).

---

## Ver detalle de proyecto

```
POST /api/v1/projects/view
Authorization: Bearer <token>
Requiere permiso: projects.view
```

### Request

```json
{
  "data": {
    "id": 5
  }
}
```

### Response (200)

```json
{
  "data": {
    "project": {
      "id": 5,
      "organizationId": 1,
      "clientId": 1,
      "name": "Auditoría 2025 - Empresa ABC",
      "auditType": "financial",
      "periodStart": "2025-01-01",
      "periodEnd": "2025-12-31",
      "status": "in_progress",
      "sourceAuditProjectId": null,
      "createdAt": "2026-03-02T...",
      "client": {
        "id": 1,
        "name": "Empresa ABC S.A.",
        "legalName": "Empresa ABC Sociedad Anónima",
        "ruc": "1790012345001",
        "email": "contacto@empresaabc.com",
        "phone": "0221234567",
        "address": "Av. Amazonas N36-152, Quito",
        "isActive": true
      },
      "assignments": [
        {
          "id": 1,
          "auditProjectId": 5,
          "userId": 2,
          "role": "partner",
          "user": { "id": 2, "fullName": "Carlos Méndez", "email": "carlos@firma.com" }
        },
        {
          "id": 2,
          "auditProjectId": 5,
          "userId": 3,
          "role": "member",
          "user": { "id": 3, "fullName": "Ana López", "email": "ana@firma.com" }
        }
      ],
      "documents": [
        {
          "id": 42,
          "originalName": "balance_2024.pdf",
          "mimeType": "application/pdf",
          "size": 2048000,
          "category": "audit_evidences",
          "createdAt": "2026-03-02T..."
        }
      ]
    }
  }
}
```

Incluye: datos completos del cliente, miembros asignados al equipo, y documentos vinculados.

---

## Actualizar proyecto

```
POST /api/v1/projects/update
Authorization: Bearer <token>
Requiere permiso: projects.update
```

### Request

```json
{
  "data": {
    "id": 5,
    "name": "Auditoría Financiera 2025 - ABC",
    "status": "planning"
  }
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `id` | int | Sí | ID del proyecto |
| `name` | string | No | Nuevo nombre |
| `auditType` | string | No | Nuevo tipo |
| `periodStart` | date | No | Nueva fecha inicio |
| `periodEnd` | date | No | Nueva fecha fin |
| `status` | string | No | Nuevo estado (debe ser una transición válida) |

### Transiciones de estado válidas

```
draft → planning → in_progress → review → closed
```

Solo se puede avanzar al siguiente estado inmediato. No se puede saltar estados ni retroceder.

| Desde | Hacia permitidos |
|-------|-----------------|
| `draft` | `planning` |
| `planning` | `in_progress` |
| `in_progress` | `review` |
| `review` | `closed` |
| `closed` | (ninguno) |

### Errores posibles

| Código | errorCode | Causa |
|--------|-----------|-------|
| 404 | `projects.notFound` | Proyecto no encontrado |
| 400 | `projects.invalidStatusTransition` | Transición de estado no permitida |

---

## Eliminar proyecto

```
POST /api/v1/projects/delete
Authorization: Bearer <token>
Requiere permiso: projects.delete
```

### Request

```json
{
  "data": {
    "id": 5
  }
}
```

Solo se puede eliminar un proyecto con `status: "draft"`. Si el proyecto ya avanzó de estado, no se puede eliminar.

### Errores posibles

| Código | errorCode | Causa |
|--------|-----------|-------|
| 404 | `projects.notFound` | Proyecto no encontrado |
| 400 | `projects.canOnlyDeleteDraft` | Solo se pueden eliminar proyectos en estado draft |

---

## Asignaciones de equipo

### Agregar miembro al proyecto

```
POST /api/v1/projects/assignments/add
Authorization: Bearer <token>
Requiere permiso: projects.assignments.manage
```

#### Request

```json
{
  "data": {
    "auditProjectId": 5,
    "userId": 3,
    "role": "member"
  }
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `auditProjectId` | int | Sí | ID del proyecto |
| `userId` | int | Sí | ID del usuario a asignar (debe pertenecer a la misma organización y estar activo) |
| `role` | string | No | `partner`, `manager` o `member` (default: `member`) |

Roles: `partner` = socio, `manager` = encargado, `member` = miembro del equipo.

#### Response (200)

```json
{
  "data": {
    "assignment": {
      "id": 3,
      "auditProjectId": 5,
      "userId": 3,
      "role": "member",
      "user": { "id": 3, "fullName": "Ana López", "email": "ana@firma.com" }
    }
  }
}
```

#### Errores posibles

| Código | errorCode | Causa |
|--------|-----------|-------|
| 404 | `projects.notFound` | Proyecto no encontrado |
| 400 | `projects.assignments.userNotFound` | Usuario no encontrado, inactivo, o de otra organización |
| 409 | `projects.assignments.alreadyAssigned` | El usuario ya está asignado a este proyecto |

---

### Quitar miembro del proyecto

```
POST /api/v1/projects/assignments/remove
Authorization: Bearer <token>
Requiere permiso: projects.assignments.manage
```

#### Request

```json
{
  "data": {
    "auditProjectId": 5,
    "userId": 3
  }
}
```

#### Response (200)

```json
{
  "statusCode": 204,
  "message": "Operación exitosa",
  "data": null
}
```

#### Errores posibles

| Código | errorCode | Causa |
|--------|-----------|-------|
| 404 | `projects.notFound` | Proyecto no encontrado |
| 404 | `projects.assignments.notFound` | El usuario no está asignado a este proyecto |

---

### Listar miembros del proyecto

```
POST /api/v1/projects/assignments/list
Authorization: Bearer <token>
Requiere permiso: projects.view
```

#### Request

```json
{
  "data": {
    "auditProjectId": 5
  }
}
```

#### Response (200)

```json
{
  "data": {
    "assignments": [
      {
        "id": 1,
        "auditProjectId": 5,
        "userId": 2,
        "role": "partner",
        "user": { "id": 2, "fullName": "Carlos Méndez", "email": "carlos@firma.com" }
      },
      {
        "id": 2,
        "auditProjectId": 5,
        "userId": 3,
        "role": "member",
        "user": { "id": 3, "fullName": "Ana López", "email": "ana@firma.com" }
      }
    ]
  }
}
```

Ordenados por rol (partner primero) y luego por fecha de asignación.
