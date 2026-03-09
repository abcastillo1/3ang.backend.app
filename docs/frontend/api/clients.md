# Clientes — Contratos de API

Un cliente es la empresa o entidad a la que la firma de auditoría le realiza una auditoría.

---

## Crear cliente

```
POST /api/v1/clients/create
Authorization: Bearer <token>
Requiere permiso: clients.create
```

### Request

```json
{
  "data": {
    "name": "Empresa ABC S.A.",
    "legalName": "Empresa ABC Sociedad Anónima",
    "ruc": "1790012345001",
    "email": "contacto@empresaabc.com",
    "phone": "0221234567",
    "address": "Av. Amazonas N36-152, Quito"
  }
}
```

| Campo | Tipo | Obligatorio | Validaciones |
|-------|------|-------------|--------------|
| `name` | string | Sí | 2–255 caracteres |
| `legalName` | string | No | Máximo 255 caracteres |
| `ruc` | string | No | Máximo 13 caracteres. Único por organización. |
| `email` | string | No | Email válido |
| `phone` | string | No | Teléfono |
| `address` | string | No | Dirección |

### Response (200)

```json
{
  "data": {
    "client": {
      "id": 1,
      "organizationId": 1,
      "name": "Empresa ABC S.A.",
      "legalName": "Empresa ABC Sociedad Anónima",
      "ruc": "1790012345001",
      "email": "contacto@empresaabc.com",
      "phone": "0221234567",
      "address": "Av. Amazonas N36-152, Quito",
      "isActive": true,
      "createdAt": "2026-03-02T..."
    }
  }
}
```

### Errores posibles

| Código | errorCode | Causa |
|--------|-----------|-------|
| 409 | `clients.rucExists` | Ya existe un cliente con ese RUC en la organización |
| 400 | `validation.error` | Campos inválidos |

---

## Listar clientes

```
POST /api/v1/clients/list
Authorization: Bearer <token>
Requiere permiso: clients.view
```

### Request

```json
{
  "data": {
    "page": 1,
    "limit": 20,
    "search": "abc",
    "isActive": true
  }
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `page` | int | No | Página (default 1) |
| `limit` | int | No | Registros por página (default 20, max 100) |
| `search` | string | No | Buscar por nombre, razón social o RUC |
| `isActive` | boolean | No | Filtrar por estado activo/inactivo |

### Response (200)

```json
{
  "data": {
    "clients": [
      {
        "id": 1,
        "name": "Empresa ABC S.A.",
        "legalName": "Empresa ABC Sociedad Anónima",
        "ruc": "1790012345001",
        "email": "contacto@empresaabc.com",
        "phone": "0221234567",
        "isActive": true,
        "createdAt": "2026-03-02T..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 8,
      "totalPages": 1
    }
  }
}
```

Ordenados alfabéticamente por nombre. Solo retorna clientes de la organización del usuario autenticado.

---

## Ver detalle de cliente

```
POST /api/v1/clients/view
Authorization: Bearer <token>
Requiere permiso: clients.view
```

### Request

```json
{
  "data": {
    "id": 1
  }
}
```

### Response (200)

```json
{
  "data": {
    "client": {
      "id": 1,
      "organizationId": 1,
      "name": "Empresa ABC S.A.",
      "legalName": "Empresa ABC Sociedad Anónima",
      "ruc": "1790012345001",
      "email": "contacto@empresaabc.com",
      "phone": "0221234567",
      "address": "Av. Amazonas N36-152, Quito",
      "isActive": true,
      "createdAt": "2026-03-02T...",
      "auditProjects": [
        {
          "id": 5,
          "name": "Auditoría 2024",
          "auditType": "financial",
          "status": "in_progress",
          "periodStart": "2024-01-01",
          "periodEnd": "2024-12-31"
        }
      ]
    }
  }
}
```

Incluye los proyectos de auditoría asociados al cliente.

### Errores posibles

| Código | errorCode | Causa |
|--------|-----------|-------|
| 404 | `clients.notFound` | Cliente no encontrado o no pertenece a la organización |

---

## Actualizar cliente

```
POST /api/v1/clients/update
Authorization: Bearer <token>
Requiere permiso: clients.update
```

### Request

```json
{
  "data": {
    "id": 1,
    "name": "Empresa ABC Corp.",
    "phone": "0229876543",
    "isActive": false
  }
}
```

Solo enviar los campos que se quieran actualizar, junto con el `id`.

| Campo | Tipo | Obligatorio |
|-------|------|-------------|
| `id` | int | Sí |
| `name` | string | No |
| `legalName` | string | No |
| `ruc` | string | No (valida unicidad si cambia) |
| `email` | string | No |
| `phone` | string | No |
| `address` | string | No |
| `isActive` | boolean | No |

### Errores posibles

| Código | errorCode | Causa |
|--------|-----------|-------|
| 404 | `clients.notFound` | Cliente no encontrado |
| 409 | `clients.rucExists` | Otro cliente ya tiene ese RUC |

---

## Eliminar cliente

```
POST /api/v1/clients/delete
Authorization: Bearer <token>
Requiere permiso: clients.delete
```

### Request

```json
{
  "data": {
    "id": 1
  }
}
```

### Response (200)

```json
{
  "statusCode": 204,
  "message": "Operación exitosa",
  "data": null
}
```

Soft delete (el registro no se borra físicamente).

### Errores posibles

| Código | errorCode | Causa |
|--------|-----------|-------|
| 404 | `clients.notFound` | Cliente no encontrado |
| 409 | `clients.hasActiveProjects` | No se puede eliminar un cliente que tiene proyectos de auditoría activos (no cerrados) |
