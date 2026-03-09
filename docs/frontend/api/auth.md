# Autenticación — Contratos de API

## Login

```
POST /api/v1/auth/login
Sin Authorization header
```

### Request

```json
{
  "data": {
    "email": "admin@example.com",
    "password": "password123"
  }
}
```

**Campos obligatorios:** `email` (email válido), `password` (mínimo 6 caracteres)

### Response (200)

```json
{
  "statusCode": 200,
  "message": "Operación exitosa",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "fullName": "Admin User",
      "email": "admin@example.com",
      "organizationId": 1,
      "roleId": 1
    },
    "role": {
      "id": 1,
      "name": "Administrador",
      "permissions": ["users.create", "users.view", "roles.create", "..."]
    },
    "organization": {
      "id": 1,
      "name": "3ANG Auditores",
      "isActive": true
    }
  }
}
```

### Qué guardar del login

| Campo | Para qué |
|-------|----------|
| `token` | Enviar en header `Authorization: Bearer <token>` en todas las peticiones siguientes |
| `user` | Datos del usuario autenticado (perfil, menú, etc.) |
| `role.permissions` | Array de strings con los códigos de permiso. Usarlos para mostrar/ocultar funcionalidades en la UI |
| `organization` | Datos de la organización a la que pertenece |

### Errores posibles

| Código | errorCode | Causa |
|--------|-----------|-------|
| 401 | `auth.invalidCredentials` | Email o contraseña incorrectos |
| 403 | `auth.userInactive` | Usuario desactivado |
| 400 | `validation.error` | Campos inválidos (ver `errors`) |

---

## Refresh token

Renueva el token JWT antes de que expire. El token por defecto expira en **24 horas**.

```
POST /api/v1/auth/refresh
Authorization: Bearer <token_actual>
```

### Request

```json
{ "data": {} }
```

### Response (200)

```json
{
  "statusCode": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs..._nuevo",
    "expiresAt": "2026-03-03T14:00:00.000Z"
  }
}
```

El `expiresAt` indica cuándo expira el nuevo token. Se recomienda renovar unos minutos antes de esa hora.

Si el token actual ya expiró o es inválido, retorna `401`.

---

## Logout

```
POST /api/v1/auth/logout
Authorization: Bearer <token>
```

### Request

```json
{ "data": {} }
```

### Response (200)

```json
{
  "statusCode": 200,
  "message": "Operación exitosa",
  "data": null
}
```

Invalida la sesión del token actual en el servidor.

---

## Permisos

Los permisos del usuario se reciben en el login como un array de strings en `role.permissions` (ej: `["users.create", "users.view", "files.upload"]`).

Cada endpoint protegido requiere un permiso específico (ver tabla en `_overview.md`). Si el usuario no tiene el permiso, el backend retorna `403`.

**Excepción:** El owner de la organización siempre tiene acceso total sin importar sus permisos.
