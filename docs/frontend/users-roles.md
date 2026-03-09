# Usuarios, Roles y Permisos — Contratos de API

---

## Usuarios

### Listar usuarios

```
POST /api/v1/users/list
Authorization: Bearer <token>
```

#### Request

```json
{
  "data": {
    "page": 1,
    "limit": 20,
    "search": "juan"
  }
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `page` | int | No | Página (default 1) |
| `limit` | int | No | Registros por página (default 20) |
| `search` | string | No | Buscar por nombre o email |

#### Response (200)

```json
{
  "data": {
    "users": [
      {
        "id": 1,
        "fullName": "Juan Pérez",
        "email": "juan@example.com",
        "documentType": "cedula",
        "documentNumber": "1234567890",
        "phone": "0991234567",
        "isActive": true,
        "role": {
          "id": 2,
          "name": "Auditor"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

Solo retorna usuarios de la misma organización del autenticado.

---

### Crear usuario

```
POST /api/v1/users/create
Authorization: Bearer <token>
Requiere permiso: users.create
```

#### Request

```json
{
  "data": {
    "fullName": "María López",
    "email": "maria@example.com",
    "password": "pass123456",
    "roleId": 2,
    "documentType": "cedula",
    "documentNumber": "0912345678",
    "phone": "0998765432",
    "username": "mlopez"
  }
}
```

| Campo | Tipo | Obligatorio | Validaciones |
|-------|------|-------------|--------------|
| `fullName` | string | Sí | 2–255 caracteres |
| `email` | string | Sí | Email válido, único en la organización |
| `password` | string | Sí | Mínimo 6 caracteres |
| `roleId` | int | Sí | ID de un rol existente |
| `documentType` | string | Sí | `cedula`, `ruc` o `pasaporte` |
| `documentNumber` | string | Sí | Número del documento |
| `phone` | string | No | Teléfono |
| `username` | string | No | Username |

#### Response (200)

```json
{
  "data": {
    "user": {
      "id": 5,
      "fullName": "María López",
      "email": "maria@example.com",
      "documentType": "cedula",
      "documentNumber": "0912345678",
      "phone": "0998765432",
      "isActive": true,
      "roleId": 2,
      "organizationId": 1
    }
  }
}
```

#### Errores posibles

| Código | errorCode | Causa |
|--------|-----------|-------|
| 400 | `validation.error` | Campos inválidos |
| 400 | `users.emailExists` | Email ya registrado |
| 400 | `users.documentExists` | Documento ya registrado |

---

### Actualizar usuario

```
POST /api/v1/users/update
Authorization: Bearer <token>
```

#### Request

```json
{
  "data": {
    "id": 3,
    "fullName": "María López García",
    "phone": "0991111111",
    "isActive": false
  }
}
```

Solo enviar los campos que se quieran actualizar, junto con el `id`.

---

### Ver perfil propio

```
POST /api/v1/users/profile
Authorization: Bearer <token>
```

#### Request

```json
{ "data": {} }
```

#### Response (200)

Retorna los datos completos del usuario autenticado, incluyendo rol, permisos y organización (mismo formato que el login).

---

## Roles

### Listar roles

```
POST /api/v1/roles/list
Authorization: Bearer <token>
Requiere permiso: roles.view
```

#### Request

```json
{ "data": {} }
```

#### Response (200)

```json
{
  "data": {
    "roles": [
      {
        "id": 1,
        "name": "Administrador",
        "description": "Acceso total",
        "permissions": [
          { "id": 1, "code": "users.create", "description": "Crear usuarios" },
          { "id": 2, "code": "users.view", "description": "Ver usuarios" }
        ]
      },
      {
        "id": 2,
        "name": "Auditor",
        "description": "...",
        "permissions": ["..."]
      }
    ]
  }
}
```

---

### Crear rol

```
POST /api/v1/roles/create
Authorization: Bearer <token>
Requiere permiso: roles.create
```

#### Request

```json
{
  "data": {
    "name": "Supervisor",
    "description": "Supervisa proyectos de auditoría"
  }
}
```

| Campo | Tipo | Obligatorio |
|-------|------|-------------|
| `name` | string | Sí |
| `description` | string | No |

---

### Actualizar rol

```
POST /api/v1/roles/update
Authorization: Bearer <token>
Requiere permiso: roles.update
```

#### Request

```json
{
  "data": {
    "id": 3,
    "name": "Supervisor Senior",
    "description": "Supervisa y aprueba"
  }
}
```

---

### Eliminar rol

```
POST /api/v1/roles/delete
Authorization: Bearer <token>
Requiere permiso: roles.delete
```

#### Request

```json
{
  "data": {
    "id": 3
  }
}
```

---

### Asignar permisos a un rol

```
POST /api/v1/roles/assign-permissions
Authorization: Bearer <token>
Requiere permiso: roles.update
```

#### Request

```json
{
  "data": {
    "roleId": 2,
    "permissionIds": [1, 2, 5, 8, 12]
  }
}
```

**Reemplaza todos** los permisos del rol con los IDs enviados. Si se quiere quitar un permiso, no incluirlo en el array.

---

## Permisos

### Listar permisos disponibles

```
POST /api/v1/permissions/list
Authorization: Bearer <token>
Requiere permiso: permissions.view
```

#### Request

```json
{ "data": {} }
```

#### Response (200)

```json
{
  "data": {
    "permissions": [
      { "id": 1, "code": "users.create", "module": "users", "description": "Crear usuarios" },
      { "id": 2, "code": "users.view", "module": "users", "description": "Ver usuarios" },
      { "id": 3, "code": "users.update", "module": "users", "description": "Actualizar usuarios" },
      { "id": 4, "code": "users.delete", "module": "users", "description": "Eliminar usuarios" },
      { "id": 5, "code": "roles.create", "module": "roles", "description": "Crear roles" },
      { "id": 6, "code": "roles.view", "module": "roles", "description": "Ver roles" },
      { "id": 7, "code": "roles.update", "module": "roles", "description": "Actualizar roles" },
      { "id": 8, "code": "roles.delete", "module": "roles", "description": "Eliminar roles" },
      { "id": 9, "code": "files.upload", "module": "files", "description": "Subir archivos" },
      { "id": 10, "code": "permissions.view", "module": "permissions", "description": "Ver permisos" }
    ]
  }
}
```

Los permisos se pueden agrupar por `module` (o por el prefijo antes del `.` en `code`) para mostrarlos organizados en la UI.
