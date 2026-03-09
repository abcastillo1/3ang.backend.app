# Autenticación — Guía Frontend

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
      "permissions": ["users.create", "users.view", "roles.create", ...]
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

```javascript
// src/services/auth.js
import { api } from './api';

export async function login(email, password) {
  const data = await api.post('/auth/login', { email, password });

  // Guardar token para futuras peticiones
  api.setToken(data.token);

  // Guardar perfil en estado global (Context, Zustand, Redux, etc.)
  return {
    user: data.user,
    role: data.role,
    organization: data.organization,
    permissions: data.role.permissions  // array de strings
  };
}
```

### Errores posibles

| Código | errorCode | Causa |
|--------|-----------|-------|
| 401 | `auth.invalidCredentials` | Email o contraseña incorrectos |
| 403 | `auth.userInactive` | Usuario desactivado |
| 400 | `validation.error` | Campos inválidos |

---

## Refresh token

Renueva el token JWT antes de que expire (por defecto expira en 24h).

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

### Auto-refresh recomendado

```javascript
// src/services/api.js — agregar al ApiClient

scheduleRefresh(expiresAt) {
  const expiresMs = new Date(expiresAt).getTime();
  const refreshAt = expiresMs - (5 * 60 * 1000); // 5 min antes
  const delay = refreshAt - Date.now();

  if (delay > 0) {
    this._refreshTimer = setTimeout(async () => {
      try {
        const data = await this.post('/auth/refresh');
        this.setToken(data.token);
        this.scheduleRefresh(data.expiresAt);
      } catch {
        this.setToken(null);
        window.location.href = '/login';
      }
    }, delay);
  }
}
```

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

### En el frontend

```javascript
export async function logout() {
  try {
    await api.post('/auth/logout');
  } finally {
    api.setToken(null);
    // Limpiar estado global
    window.location.href = '/login';
  }
}
```

---

## Protección de rutas (React Router)

```jsx
// src/components/ProtectedRoute.jsx

function ProtectedRoute({ children, requiredPermission }) {
  const { user, permissions } = useAuth(); // tu hook de auth

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission && !permissions.includes(requiredPermission)) {
    return <Navigate to="/403" replace />;
  }

  return children;
}

// Uso en rutas:
<Route
  path="/users"
  element={
    <ProtectedRoute requiredPermission="users.view">
      <UsersPage />
    </ProtectedRoute>
  }
/>
```

---

## Verificar permisos en componentes

```jsx
// src/hooks/useAuth.js
export function useHasPermission(code) {
  const { permissions } = useAuth();
  return permissions.includes(code);
}

// En cualquier componente:
function UserActions() {
  const canCreate = useHasPermission('users.create');
  const canDelete = useHasPermission('users.delete');

  return (
    <div>
      {canCreate && <button>Nuevo usuario</button>}
      {canDelete && <button>Eliminar</button>}
    </div>
  );
}
```
