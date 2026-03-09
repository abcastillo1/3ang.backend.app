# Cliente API — Configuración base

## Formato de todas las peticiones

```
POST http://localhost:3000/api/v1/{modulo}/{accion}
Content-Type: application/json
Authorization: Bearer <token>

{
  "data": {
    "campo1": "valor1",
    "campo2": "valor2"
  }
}
```

- **Siempre POST**, no importa si es crear, listar, actualizar o eliminar.
- **Siempre `{ "data": { ... } }`** en el body, incluso si no hay parámetros: `{ "data": {} }`.
- **Siempre `Authorization: Bearer <token>`** excepto en `/auth/login`.

---

## Formato de respuestas

### Exitosa (200)

```json
{
  "statusCode": 200,
  "message": "Operación exitosa",
  "data": {
    "user": { "id": 1, "fullName": "..." }
  }
}
```

### Error de validación (400)

```json
{
  "statusCode": 400,
  "message": "Error de validación",
  "errorCode": "validation.error",
  "errors": {
    "data.email": ["validators.email.invalid"],
    "data.fullName": ["validators.name.required"]
  }
}
```

### No autenticado (401)

```json
{
  "statusCode": 401,
  "message": "Token inválido o expirado",
  "errorCode": "auth.unauthorized"
}
```

### Sin permisos (403)

```json
{
  "statusCode": 403,
  "message": "Permisos insuficientes",
  "errorCode": "permissions.insufficientPermissions"
}
```

### No encontrado (404)

```json
{
  "statusCode": 404,
  "message": "Recurso no encontrado",
  "errorCode": "resource.notFound"
}
```

---

## Cliente API reutilizable (React)

```javascript
// src/services/api.js

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getToken() {
    return this.token;
  }

  async post(endpoint, data = {}) {
    const headers = { 'Content-Type': 'application/json' };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ data })
    });

    const json = await response.json();

    if (!response.ok) {
      const error = new Error(json.message || 'Error desconocido');
      error.statusCode = json.statusCode;
      error.errorCode = json.errorCode;
      error.errors = json.errors;
      throw error;
    }

    return json.data;
  }
}

export const api = new ApiClient();
```

### Uso

```javascript
import { api } from '../services/api';

// Login
const loginData = await api.post('/auth/login', {
  email: 'user@example.com',
  password: 'password123'
});
api.setToken(loginData.token);

// Listar usuarios
const usersData = await api.post('/users/list', { page: 1, limit: 20 });

// Crear usuario
const newUser = await api.post('/users/create', {
  fullName: 'Juan Pérez',
  email: 'juan@example.com',
  password: 'pass123',
  roleId: 1,
  documentType: 'cedula',
  documentNumber: '1234567890'
});
```

### Manejo de errores

```javascript
try {
  await api.post('/users/create', { ... });
} catch (error) {
  if (error.statusCode === 401) {
    // Token expirado → redirigir a login
    api.setToken(null);
    navigate('/login');
  } else if (error.statusCode === 403) {
    // Sin permisos
    toast.error('No tienes permisos para esta acción');
  } else if (error.errors) {
    // Errores de validación por campo
    Object.entries(error.errors).forEach(([field, messages]) => {
      setFieldError(field.replace('data.', ''), messages[0]);
    });
  } else {
    toast.error(error.message);
  }
}
```

---

## Refresh automático del token

```javascript
// En el interceptor o wrapper del api client
async postWithRefresh(endpoint, data = {}) {
  try {
    return await this.post(endpoint, data);
  } catch (error) {
    if (error.statusCode === 401 && this.token) {
      try {
        const refreshData = await this.post('/auth/refresh');
        this.setToken(refreshData.token);
        return await this.post(endpoint, data);
      } catch {
        this.setToken(null);
        window.location.href = '/login';
      }
    }
    throw error;
  }
}
```

---

## Endpoints disponibles (todos POST)

| Módulo | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| **Auth** | `/auth/login` | Login (email + password) | No |
| | `/auth/logout` | Cerrar sesión | Sí |
| | `/auth/refresh` | Renovar token | Sí |
| **Users** | `/users/list` | Listar usuarios de la organización | Sí |
| | `/users/create` | Crear usuario | Sí + `users.create` |
| | `/users/update` | Actualizar usuario | Sí + permisos según campo |
| | `/users/profile` | Ver perfil propio | Sí |
| | `/users/organization` | Ver datos de la organización | Sí |
| **Roles** | `/roles/list` | Listar roles | Sí + `roles.view` |
| | `/roles/create` | Crear rol | Sí + `roles.create` |
| | `/roles/update` | Actualizar rol | Sí + `roles.update` |
| | `/roles/delete` | Eliminar rol | Sí + `roles.delete` |
| | `/roles/assign-permissions` | Asignar permisos a rol | Sí + `roles.update` |
| **Permissions** | `/permissions/list` | Listar permisos disponibles | Sí + `permissions.view` |
| **Organizations** | `/organizations/create` | Crear organización | Sí |
| | `/organizations/list` | Listar organizaciones | Sí |
| | `/organizations/view` | Ver organización | Sí |
| | `/organizations/update` | Actualizar organización | Sí |
| **Files** | `/files/upload-url` | Obtener URL firmada para subir | Sí + `files.upload` |
| | `/files/confirm` | Confirmar subida y registrar documento | Sí + `files.upload` |
| | `/files/link` | Vincular documentos a un proyecto | Sí + `files.upload` |
| **Audit** | `/audit/my-activity` | Ver actividad del usuario | Sí |
| **System** | `/system/health` | Health check | No |
