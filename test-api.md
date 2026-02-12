# Guía de Prueba de APIs

## Importante: Todas las APIs usan POST

### 1. Login (NO requiere autenticación)
```bash
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "data": {
    "email": "user@example.com",
    "password": "password123"
  }
}
```

**Respuesta exitosa:**
```json
{
  "statusCode": 200,
  "message": "Operación exitosa",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "organizationId": 1,
      "roleId": 1,
      "fullName": "Juan Pérez",
      "username": "juanperez",
      "email": "user@example.com",
      "phone": "+1234567890",
      "documentType": "cedula",
      "documentNumber": "1234567890",
      "isActive": true,
      "lastLoginAt": "2026-01-22T10:30:00.000Z",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-22T10:30:00.000Z"
    },
    "organization": {
      "id": 1,
      "name": "Mi Empresa",
      "legalName": "Mi Empresa S.A.",
      "taxId": "1234567890001",
      "email": "contacto@miempresa.com",
      "phone": "+1234567890",
      "address": "Calle Principal 123",
      "country": "Ecuador",
      "city": "Quito",
      "isActive": true,
      "isOwner": true
    },
    "role": {
      "id": 1,
      "name": "Administrador",
      "description": "Rol de administrador del sistema",
      "isSystem": false
    },
    "permissions": [
      {
        "id": 1,
        "code": "users.create",
        "description": "Crear usuarios",
        "module": "users"
      },
      {
        "id": 2,
        "code": "users.update",
        "description": "Actualizar usuarios",
        "module": "users"
      },
      {
        "id": 3,
        "code": "roles.create",
        "description": "Crear roles",
        "module": "roles"
      }
    ],
    "isOwner": true
  }
}
```

**Errores posibles:**
- `401` - Credenciales inválidas
- `403` - Usuario inactivo

**Notas:**
- El campo `isOwner` indica si el usuario es el propietario de la organización (tiene acceso completo)
- Los `permissions` contienen todos los permisos del rol asignado al usuario
- Si `isOwner` es `true`, el usuario tiene acceso completo independientemente de los permisos listados

### 2. Refresh Token (requiere token válido)
```bash
POST http://localhost:3000/api/v1/auth/refresh
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {}
}
```

**Respuesta:**
```json
{
  "statusCode": 200,
  "message": "Operation successful",
  "data": {
    "token": "nuevo_token_jwt",
    "expiresAt": "2026-01-23T12:00:00.000Z"
  }
}
```

### 3. Logout (requiere token válido)
```bash
POST http://localhost:3000/api/v1/auth/logout
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {}
}
```

**Respuesta exitosa:**
```json
{
  "statusCode": 200,
  "message": "Operación exitosa",
  "data": {
    "message": "Logged out successfully"
  }
}
```

**Errores posibles:**
- `401` - Token inválido o expirado
- `400` - Token no proporcionado

**Notas:**
- El logout invalida la sesión actual del usuario
- Después del logout, el token ya no será válido para autenticación
- Se registra un audit log de la acción de logout

### 4. Listar Usuarios (requiere token)
```bash
POST http://localhost:3000/api/v1/users/list
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "page": 1,
    "limit": 10
  }
}
```

### 4. Ver Perfil (requiere token)
```bash
POST http://localhost:3000/api/v1/users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {}
}
```

### 5. Actualizar Perfil (requiere token)
```bash
POST http://localhost:3000/api/v1/users/update
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "fullName": "Nuevo Nombre",
    "phone": "+1234567890"
  }
}
```

### 6. Crear Usuario (requiere token y permiso 'users.create')
```bash
POST http://localhost:3000/api/v1/users/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "fullName": "Juan Pérez",
    "email": "juan@example.com",
    "password": "password123",
    "roleId": 1,
    "documentType": "cedula",
    "documentNumber": "1234567890",
    "phone": "+1234567890",
    "username": "juanperez"
  }
}
```

**Ejemplo mínimo (sin phone ni username):**
```json
{
  "data": {
    "fullName": "María García",
    "email": "maria@example.com",
    "password": "password123",
    "roleId": 1,
    "documentType": "cedula",
    "documentNumber": "0987654321"
  }
}
```

**Tipos de documento válidos:**
- `cedula`
- `ruc`
- `pasaporte`

### 7. Ver Organización (requiere token)
```bash
POST http://localhost:3000/api/v1/users/organization
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {}
}
```

### 8. Mi Actividad (requiere token)
```bash
POST http://localhost:3000/api/v1/audit/my-activity
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "page": 1,
    "limit": 20
  }
}
```

## APIs de Roles

**Permisos requeridos:**
- `roles.view` - Ver/listar roles
- `roles.create` - Crear roles
- `roles.update` - Modificar roles (nombre, descripción y permisos)
- `roles.delete` - Eliminar roles

**Nota importante:** El propietario de la organización (`ownerUserId`) tiene acceso completo sin necesidad de permisos específicos.

### 9. Listar Roles (requiere token y permiso 'roles.view')
```bash
POST http://localhost:3000/api/v1/roles/list
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "page": 1,
    "limit": 10,
    "search": "admin"
  }
}
```

**Ejemplo mínimo (sin búsqueda):**
```json
{
  "data": {
    "page": 1,
    "limit": 10
  }
}
```

**Respuesta exitosa:**
```json
{
  "statusCode": 200,
  "message": "Operación exitosa",
  "data": {
    "roles": [
      {
        "id": 1,
        "name": "Administrador",
        "description": "Rol con todos los permisos",
        "isSystem": true,
        "permissions": [
          {
            "id": 1,
            "code": "users.create",
            "description": "Crear usuarios",
            "module": "users"
          }
        ],
        "createdAt": "2026-01-22T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

### 10. Crear Rol (requiere token y permiso 'roles.create')
```bash
POST http://localhost:3000/api/v1/roles/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "name": "Editor",
    "description": "Rol para editores de contenido",
    "permissionIds": [1, 2, 3]
  }
}
```

**Ejemplo sin permisos iniciales (se puede asignar después):**
```json
{
  "data": {
    "name": "Vendedor",
    "description": "Rol para vendedores"
  }
}
```

**Respuesta exitosa:**
```json
{
  "statusCode": 200,
  "message": "Operación exitosa",
  "data": {
    "role": {
      "id": 5,
      "name": "Editor",
      "description": "Rol para editores de contenido",
      "isSystem": false,
      "permissions": [
        {
          "id": 1,
          "code": "users.view",
          "description": "Ver usuarios",
          "module": "users"
        }
      ],
      "createdAt": "2026-01-22T12:00:00.000Z"
    }
  }
}
```

**Errores posibles:**
- `403` - Permisos insuficientes (no tienes `roles.create`)
- `409` - El nombre del rol ya existe en la organización

### 11. Actualizar Rol (requiere token y permiso 'roles.update')
```bash
POST http://localhost:3000/api/v1/roles/update
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "id": 1,
    "name": "Editor Actualizado",
    "description": "Nueva descripción del rol"
  }
}
```

**Ejemplo solo actualizando nombre:**
```json
{
  "data": {
    "id": 1,
    "name": "Nuevo Nombre"
  }
}
```

**Ejemplo solo actualizando descripción:**
```json
{
  "data": {
    "id": 1,
    "description": "Nueva descripción"
  }
}
```

**Restricciones:**
- No se puede modificar roles del sistema (`isSystem: true`)
- Solo se pueden modificar roles normales

**Errores posibles:**
- `403` - Permisos insuficientes (no tienes `roles.update`)
- `403` - No se puede modificar un rol del sistema
- `404` - Rol no encontrado
- `409` - El nuevo nombre ya existe en la organización

### 12. Asignar Permisos a Rol (requiere token y permiso 'roles.update')
```bash
POST http://localhost:3000/api/v1/roles/assign-permissions
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "roleId": 1,
    "permissionIds": [1, 2, 3, 5, 8]
  }
}
```

**Ejemplo agregando permisos (incluye los existentes):**
```json
{
  "data": {
    "roleId": 2,
    "permissionIds": [1, 2, 3, 4, 5]
  }
}
```

**Ejemplo quitando permisos (solo roles normales):**
```json
{
  "data": {
    "roleId": 2,
    "permissionIds": [1, 2]
  }
}
```

**Restricciones importantes:**
- **NO se pueden modificar permisos de roles del sistema** (`isSystem: true`)
- Solo se pueden modificar permisos de roles normales
- Este endpoint **reemplaza** todos los permisos del rol con los nuevos
- Para agregar permisos sin quitar los existentes, primero obtén los permisos actuales del rol con `/roles/list` y luego inclúyelos en el array

**Respuesta exitosa:**
```json
{
  "statusCode": 200,
  "message": "Operación exitosa",
  "data": {
    "role": {
      "id": 2,
      "name": "Editor",
      "description": "Rol para editores",
      "isSystem": false,
      "permissions": [
        {
          "id": 1,
          "code": "users.view",
          "description": "Ver usuarios",
          "module": "users"
        },
        {
          "id": 2,
          "code": "users.update",
          "description": "Actualizar usuarios",
          "module": "users"
        }
      ]
    }
  }
}
```

**Errores posibles:**
- `403` - Permisos insuficientes (no tienes `roles.update`)
- `403` - No se puede modificar un rol del sistema
- `404` - Rol no encontrado
- `400` - Algunos permisos no fueron encontrados (IDs inválidos)

### 13. Eliminar Rol (requiere token y permiso 'roles.delete')
```bash
POST http://localhost:3000/api/v1/roles/delete
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "id": 1
  }
}
```

**Restricciones:**
- No se puede eliminar roles del sistema (`isSystem: true`)
- No se puede eliminar roles que tienen usuarios asignados
- El borrado es lógico (soft delete) - el rol se marca como eliminado pero se mantiene en la BD

**Respuesta exitosa:**
```json
{
  "statusCode": 204,
  "message": "Operación exitosa"
}
```

**Errores posibles:**
- `403` - Permisos insuficientes (no tienes `roles.delete`)
- `403` - No se puede eliminar un rol del sistema
- `404` - Rol no encontrado
- `409` - No se puede eliminar un rol con usuarios asignados

## APIs de Permisos

**Permisos requeridos:**
- `permissions.view` - Ver/listar permisos disponibles

**Nota importante:** El propietario de la organización (`ownerUserId`) tiene acceso completo sin necesidad de permisos específicos.

### 14. Listar Permisos (requiere token y permiso 'permissions.view')
```bash
POST http://localhost:3000/api/v1/permissions/list
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "module": "users"
  }
}
```

**Ejemplo sin filtro (todos los permisos):**
```json
{
  "data": {}
}
```

**Ejemplo filtrando por módulo:**
```json
{
  "data": {
    "module": "roles"
  }
}
```

**Respuesta exitosa:**
```json
{
  "statusCode": 200,
  "message": "Operación exitosa",
  "data": {
    "permissions": [
      {
        "id": 1,
        "code": "users.create",
        "description": "Crear usuarios",
        "module": "users"
      },
      {
        "id": 2,
        "code": "users.update",
        "description": "Actualizar usuarios",
        "module": "users"
      },
      {
        "id": 5,
        "code": "roles.create",
        "description": "Crear roles",
        "module": "roles"
      }
    ]
  }
}
```

**Nota:** Los permisos vienen ordenados por módulo y código. Si necesitas agruparlos por módulo en el frontend, puedes hacerlo fácilmente usando el campo `module` de cada permiso.

**Errores posibles:**
- `403` - Permisos insuficientes (no tienes `permissions.view`)

## Sistema de Permisos y Roles

### Propietario de la Organización
El usuario que es propietario de la organización (`ownerUserId`) tiene **acceso completo** a todas las funcionalidades sin necesidad de permisos específicos. Esto permite:
- Configurar roles y permisos desde el inicio
- Gestionar completamente la organización
- No depender de permisos para operaciones críticas

### Permisos de Roles
Los permisos están organizados por módulos:

**Módulo `roles`:**
- `roles.view` - Ver/listar roles
- `roles.create` - Crear nuevos roles
- `roles.update` - Modificar roles (nombre, descripción y permisos)
- `roles.delete` - Eliminar roles

**Módulo `users`:**
- `users.create` - Crear usuarios
- `users.view` - Ver/listar usuarios
- `users.update` - Actualizar usuarios
- `users.delete` - Eliminar usuarios

**Módulo `permissions`:**
- `permissions.view` - Ver/listar permisos disponibles

### Roles del Sistema
Los roles marcados como `isSystem: true` tienen restricciones especiales:
- No se pueden modificar (nombre, descripción)
- No se pueden eliminar
- No se pueden cambiar sus permisos

Esto protege roles críticos del sistema que deben mantenerse intactos.

### Flujo Típico de Configuración

1. **Propietario crea roles iniciales:**
   ```bash
   POST /api/v1/roles/create
   # Crea roles como "Administrador", "Editor", "Vendedor"
   ```

2. **Propietario asigna permisos a cada rol:**
   ```bash
   POST /api/v1/roles/assign-permissions
   # Asigna permisos específicos según las necesidades
   ```

3. **Propietario crea usuarios y les asigna roles:**
   ```bash
   POST /api/v1/users/create
   # Crea usuarios con roles específicos
   ```

4. **Usuarios operan según sus permisos:**
   - Solo pueden realizar acciones permitidas por su rol
   - El propietario siempre tiene acceso completo

## Errores Comunes

### "Ruta no encontrada"
- Verifica que uses POST (no GET)
- Verifica la URL completa: `/api/v1/[modulo]/[ruta]`
- Verifica que el body tenga `{ "data": {} }`

### "Body must contain a 'data' object"
- El body debe tener siempre: `{ "data": { ... } }`
- Incluso si no envías parámetros: `{ "data": {} }`

### "Authentication token required"
- Agrega header: `Authorization: Bearer <token>`
- Obtén el token del endpoint `/api/v1/auth/login`

### "Permisos insuficientes" (403)
- Verifica que tu rol tenga el permiso necesario
- Si eres propietario de la organización, deberías tener acceso completo
- Verifica que el permiso esté correctamente asignado a tu rol

### "No se puede modificar un rol del sistema" (403)
- Los roles con `isSystem: true` no se pueden modificar
- Solo se pueden modificar roles normales creados por usuarios

## APIs de Inventario - Productos Veterinarios de Granja

**Permisos requeridos:**
- `inventory.products.create` - Crear productos
- `inventory.products.view` - Ver/listar productos
- `inventory.categories.update` - Gestionar categorías (crear, ver, actualizar, eliminar)
- `inventory.stock.update` - Actualizar stock (entradas, salidas, transferencias, ajustes)

**Nota importante:** El propietario de la organización (`ownerUserId`) tiene acceso completo sin necesidad de permisos específicos.

### 15. Crear Producto Veterinario (requiere token y permiso 'inventory.products.create')

**Ejemplo 1: Vacuna para ganado bovino**
```bash
POST http://localhost:3000/api/v1/inventory/products/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "name": "Vacuna Triple Bovina",
    "sku": "VAC-TB-001",
    "description": "Vacuna para prevenir enfermedades virales en ganado bovino (Fiebre Aftosa, Brucelosis, Carbunco)",
    "unitOfMeasure": "Dosis",
    "categoryId": 1,
    "isActive": true
  }
}
```

**Ejemplo 2: Antibiótico inyectable**
```bash
POST http://localhost:3000/api/v1/inventory/products/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "name": "Penicilina Procaínica 300.000 UI",
    "sku": "ANT-PEN-300",
    "description": "Antibiótico de amplio espectro para tratamiento de infecciones bacterianas en ganado",
    "unitOfMeasure": "Frasco",
    "categoryId": 2,
    "isActive": true
  }
}
```

**Ejemplo 3: Desparasitante oral**
```bash
POST http://localhost:3000/api/v1/inventory/products/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "name": "Ivermectina 1% Oral",
    "sku": "DES-IVM-1",
    "description": "Desparasitante interno y externo para bovinos, porcinos y ovinos",
    "unitOfMeasure": "Litro",
    "categoryId": 3,
    "isActive": true
  }
}
```

**Ejemplo 4: Suplemento vitamínico**
```bash
POST http://localhost:3000/api/v1/inventory/products/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "name": "Complejo Vitamínico B12 + Hierro",
    "sku": "SUP-VIT-B12",
    "description": "Suplemento vitamínico para prevenir anemias y mejorar el estado nutricional del ganado",
    "unitOfMeasure": "Frasco",
    "categoryId": 4,
    "isActive": true
  }
}
```

**Ejemplo 5: Producto sin categoría**
```bash
POST http://localhost:3000/api/v1/inventory/products/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "name": "Jeringas Desechables 5ml",
    "sku": "INS-JER-5ML",
    "description": "Jeringas desechables para aplicación de medicamentos",
    "unitOfMeasure": "Unidad",
    "isActive": true
  }
}
```

**Ejemplo 6: Producto con imagen principal e imágenes de galería**

Los campos `image` y `gallery` deben tener **exactamente el mismo formato** que devuelve el API de subida de archivos (`POST /api/v1/files/upload`). Primero subes los archivos, obtienes el objeto por cada archivo, y luego envías ese objeto (o array) en el create.

Formato de cada archivo devuelto por upload: `{ "path", "originalName", "mimeType", "size", "url", "fileId" }`.

```bash
POST http://localhost:3000/api/v1/inventory/products/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "name": "Vacuna Triple Bovina",
    "sku": "VAC-TB-001",
    "description": "Vacuna para prevenir enfermedades virales en ganado bovino",
    "unitOfMeasure": "Dosis",
    "categoryId": 1,
    "isActive": true,
    "image": {
      "path": "1/inventory/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
      "originalName": "vacuna-portada.jpg",
      "mimeType": "image/jpeg",
      "size": 125000,
      "url": "https://tu-bucket.s3.amazonaws.com/1/inventory/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
      "fileId": "4_ze1a2b3c4d5e6f7890"
    },
    "gallery": [
      {
        "path": "1/inventory/uuid-detalle1.jpg",
        "originalName": "detalle-1.jpg",
        "mimeType": "image/jpeg",
        "size": 98000,
        "url": "https://tu-bucket.s3.amazonaws.com/1/inventory/uuid-detalle1.jpg",
        "fileId": "4_ze1a2b3c4d5e6f7891"
      },
      {
        "path": "1/inventory/uuid-detalle2.jpg",
        "originalName": "detalle-2.jpg",
        "mimeType": "image/jpeg",
        "size": 110000,
        "url": "https://tu-bucket.s3.amazonaws.com/1/inventory/uuid-detalle2.jpg",
        "fileId": "4_ze1a2b3c4d5e6f7892"
      }
    ]
  }
}
```

**Flujo recomendado:** 1) Llamar `POST /api/v1/files/upload` con `category: inventory` y obtener `data.files` (array). 2) Usar `data.files[0]` como `image` y el resto (o todo el array) como `gallery` al crear el producto.

**Ejemplo mínimo (sin SKU ni descripción):**
```json
{
  "data": {
    "name": "Aguja Hipodérmica 18G",
    "unitOfMeasure": "Unidad"
  }
}
```

**Respuesta exitosa (producto con imagen y galería):**
```json
{
  "statusCode": 200,
  "message": "Operación exitosa",
  "data": {
    "product": {
      "id": 1,
      "organizationId": 1,
      "name": "Vacuna Triple Bovina",
      "sku": "VAC-TB-001",
      "description": "Vacuna para prevenir enfermedades virales en ganado bovino",
      "image": {
        "path": "1/inventory/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
        "originalName": "vacuna-portada.jpg",
        "mimeType": "image/jpeg",
        "size": 125000,
        "url": "https://tu-bucket.s3.amazonaws.com/1/inventory/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
        "fileId": "4_ze1a2b3c4d5e6f7890"
      },
      "gallery": [
        {
          "path": "1/inventory/uuid-detalle1.jpg",
          "originalName": "detalle-1.jpg",
          "mimeType": "image/jpeg",
          "size": 98000,
          "url": "https://tu-bucket.s3.amazonaws.com/1/inventory/uuid-detalle1.jpg",
          "fileId": "4_ze1a2b3c4d5e6f7891"
        }
      ],
      "unitOfMeasure": "Dosis",
      "isActive": true,
      "createdAt": "2026-01-22T10:00:00.000Z",
      "updatedAt": "2026-01-22T10:00:00.000Z",
      "category": {
        "id": 1,
        "name": "Vacunas",
        "description": "Productos vacunales para ganado"
      }
    }
  }
}
```

Si el producto no tiene imagen ni galería, `image` será `null` y `gallery` será `[]` (o `null`).

**Errores posibles:**
- `403` - Permisos insuficientes (no tienes `inventory.products.create`)
- `404` - Categoría no encontrada (si `categoryId` no existe o no pertenece a tu organización)
- `400` - Validación fallida (campos requeridos faltantes o inválidos). Para `image`/`gallery`: usar el formato que devuelve `POST /api/v1/files/upload` (objeto con `path`, `originalName`, `mimeType`, `size`, `url`, `fileId`; galería = array de esos objetos).

### 16. Listar Productos Veterinarios (requiere token y permiso 'inventory.products.view')

**Ejemplo básico (primera página):**
```bash
POST http://localhost:3000/api/v1/inventory/products/list
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "page": 1,
    "limit": 20
  }
}
```

**Ejemplo con búsqueda por nombre:**
```bash
POST http://localhost:3000/api/v1/inventory/products/list
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "page": 1,
    "limit": 20,
    "search": "vacuna"
  }
}
```

**Ejemplo filtrando por categoría (solo vacunas):**
```bash
POST http://localhost:3000/api/v1/inventory/products/list
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "page": 1,
    "limit": 20,
    "categoryId": 1
  }
}
```

**Ejemplo combinando búsqueda y filtros:**
```bash
POST http://localhost:3000/api/v1/inventory/products/list
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "page": 1,
    "limit": 20,
    "search": "antibiótico",
    "categoryId": 2,
    "isActive": true
  }
}
```

**Respuesta exitosa:**

Cada producto incluye `image` (objeto del upload o `null`) y `gallery` (array de objetos del upload).

```json
{
  "statusCode": 200,
  "message": "Operación exitosa",
  "data": {
    "products": [
      {
        "id": 1,
        "organizationId": 1,
        "name": "Vacuna Triple Bovina",
        "sku": "VAC-TB-001",
        "description": "Vacuna para prevenir enfermedades virales en ganado bovino",
        "image": {
          "path": "1/inventory/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
          "originalName": "vacuna-portada.jpg",
          "mimeType": "image/jpeg",
          "size": 125000,
          "url": "https://tu-bucket.s3.amazonaws.com/1/inventory/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
          "fileId": "4_ze1a2b3c4d5e6f7890"
        },
        "gallery": [
          {
            "path": "1/inventory/uuid-detalle1.jpg",
            "originalName": "detalle-1.jpg",
            "mimeType": "image/jpeg",
            "size": 98000,
            "url": "https://tu-bucket.s3.amazonaws.com/1/inventory/uuid-detalle1.jpg",
            "fileId": "4_ze1a2b3c4d5e6f7891"
          }
        ],
        "unitOfMeasure": "Dosis",
        "isActive": true,
        "createdAt": "2026-01-22T10:00:00.000Z",
        "updatedAt": "2026-01-22T10:00:00.000Z",
        "category": {
          "id": 1,
          "name": "Vacunas",
          "description": "Productos vacunales para ganado"
        }
      },
      {
        "id": 2,
        "organizationId": 1,
        "name": "Penicilina Procaínica 300.000 UI",
        "sku": "ANT-PEN-300",
        "description": "Antibiótico de amplio espectro",
        "image": null,
        "gallery": [],
        "unitOfMeasure": "Frasco",
        "isActive": true,
        "createdAt": "2026-01-22T10:05:00.000Z",
        "updatedAt": "2026-01-22T10:05:00.000Z",
        "category": {
          "id": 2,
          "name": "Antibióticos",
          "description": "Medicamentos antibacterianos"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "totalPages": 1
    }
  }
}
```

**Errores posibles:**
- `403` - Permisos insuficientes (no tienes `inventory.products.view`)

### 16.1. Ver un producto (detalle) – requiere token y permiso `inventory.products.view`

Obtiene un solo producto por ID. Las imágenes vienen con `url` con token (lista para usar en el front) y opcionalmente `originalName`.

**Request:**
```bash
POST http://localhost:3000/api/v1/inventory/products/view
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "id": 1
  }
}
```

**Respuesta exitosa (200):**
```json
{
  "statusCode": 200,
  "message": "Operación exitosa",
  "data": {
    "product": {
      "id": 1,
      "organizationId": 1,
      "name": "Vacuna Triple Bovina",
      "sku": "VAC-TB-001",
      "description": "Vacuna para prevenir enfermedades virales en ganado bovino",
      "image": {
        "url": "https://f005.backblazeb2.com/file/mi-bucket/1%2Finventory%2Fabc.jpg?Authorization=...",
        "originalName": "vacuna-portada.jpg"
      },
      "gallery": [
        {
          "url": "https://f005.backblazeb2.com/file/mi-bucket/1%2Finventory%2Fdetalle1.jpg?Authorization=...",
          "originalName": "detalle-1.jpg"
        }
      ],
      "unitOfMeasure": "Dosis",
      "isActive": true,
      "createdAt": "2026-01-22T10:00:00.000Z",
      "updatedAt": "2026-01-22T10:00:00.000Z",
      "category": {
        "id": 1,
        "name": "Vacunas",
        "description": "Productos vacunales para ganado"
      }
    }
  }
}
```

**Errores posibles:**
- `404` - Producto no encontrado o no pertenece a tu organización (`inventory.products.notFound`)
- `400` - `data.id` faltante o no es un entero válido (`validators.product.id.required` / `validators.product.id.invalid`)
- `403` - Permisos insuficientes (no tienes `inventory.products.view`)

**Ejemplo en JavaScript (fetch):**
```javascript
const token = 'eyJhbGciOiJIUzI1NiIs...'; // token del login

const res = await fetch('http://localhost:3000/api/v1/inventory/products/view', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ data: { id: 1 } })
});

const json = await res.json();
if (res.ok) {
  const product = json.data.product;
  console.log(product.name, product.image?.url, product.gallery);
} else {
  console.error(json.message); // ej. inventory.products.notFound
}
```

## APIs de Categorías de Productos

**Permisos requeridos:**
- `inventory.categories.update` - Gestionar categorías (crear, ver, actualizar, eliminar)

**Nota importante:** El propietario de la organización (`ownerUserId`) tiene acceso completo sin necesidad de permisos específicos.

### 17. Crear Categoría de Producto (requiere token y permiso 'inventory.categories.update')

**Ejemplo 1: Crear categoría básica**
```bash
POST http://localhost:3000/api/v1/inventory/categories/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "name": "Vacunas",
    "description": "Biológicos para la prevención de enfermedades (Parvovirus, Erisipela, Mycoplasma, etc.)"
  }
}
```

**Ejemplo 2: Crear categoría sin descripción**
```bash
POST http://localhost:3000/api/v1/inventory/categories/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "name": "Antibióticos"
  }
}
```

**Respuesta exitosa:**
```json
{
  "statusCode": 200,
  "message": "Operación exitosa",
  "data": {
    "category": {
      "id": 1,
      "organizationId": 1,
      "name": "Vacunas",
      "description": "Biológicos para la prevención de enfermedades",
      "createdAt": "2026-01-22T10:00:00.000Z",
      "updatedAt": "2026-01-22T10:00:00.000Z"
    }
  }
}
```

**Errores posibles:**
- `403` - Permisos insuficientes (no tienes `inventory.categories.update`)
- `409` - El nombre de la categoría ya existe en la organización
- `400` - Validación fallida (nombre requerido o inválido)

### 18. Listar Categorías de Productos (requiere token y permiso 'inventory.categories.update')

**Ejemplo básico (primera página):**
```bash
POST http://localhost:3000/api/v1/inventory/categories/list
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "page": 1,
    "limit": 20
  }
}
```

**Ejemplo con búsqueda:**
```bash
POST http://localhost:3000/api/v1/inventory/categories/list
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "page": 1,
    "limit": 20,
    "search": "vacuna"
  }
}
```

**Ejemplo mínimo (sin parámetros):**
```json
{
  "data": {}
}
```

**Respuesta exitosa:**
```json
{
  "statusCode": 200,
  "message": "Operación exitosa",
  "data": {
    "categories": [
      {
        "id": 1,
        "organizationId": 1,
        "name": "Vacunas",
        "description": "Biológicos para la prevención de enfermedades",
        "createdAt": "2026-01-22T10:00:00.000Z",
        "updatedAt": "2026-01-22T10:00:00.000Z"
      },
      {
        "id": 2,
        "organizationId": 1,
        "name": "Antibióticos",
        "description": "Medicamentos para el tratamiento de infecciones bacterianas",
        "createdAt": "2026-01-22T10:05:00.000Z",
        "updatedAt": "2026-01-22T10:05:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 10,
      "totalPages": 1
    }
  }
}
```

**Errores posibles:**
- `403` - Permisos insuficientes (no tienes `inventory.categories.update`)

### 19. Actualizar Categoría de Producto (requiere token y permiso 'inventory.categories.update')

**Ejemplo actualizando nombre y descripción:**
```bash
POST http://localhost:3000/api/v1/inventory/categories/update
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "id": 1,
    "name": "Vacunas Actualizadas",
    "description": "Nueva descripción para vacunas"
  }
}
```

**Ejemplo solo actualizando nombre:**
```bash
POST http://localhost:3000/api/v1/inventory/categories/update
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "id": 1,
    "name": "Vacunas y Biológicos"
  }
}
```

**Ejemplo solo actualizando descripción:**
```bash
POST http://localhost:3000/api/v1/inventory/categories/update
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "id": 1,
    "description": "Descripción actualizada"
  }
}
```

**Respuesta exitosa:**
```json
{
  "statusCode": 200,
  "message": "Operación exitosa",
  "data": {
    "category": {
      "id": 1,
      "organizationId": 1,
      "name": "Vacunas Actualizadas",
      "description": "Nueva descripción para vacunas",
      "createdAt": "2026-01-22T10:00:00.000Z",
      "updatedAt": "2026-01-22T11:00:00.000Z"
    }
  }
}
```

**Errores posibles:**
- `403` - Permisos insuficientes (no tienes `inventory.categories.update`)
- `404` - Categoría no encontrada
- `409` - El nuevo nombre ya existe en la organización
- `400` - Validación fallida (ID requerido o campos inválidos)

### 20. Eliminar Categoría de Producto (requiere token y permiso 'inventory.categories.update')

**Ejemplo:**
```bash
POST http://localhost:3000/api/v1/inventory/categories/delete
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "id": 1
  }
}
```

**Respuesta exitosa:**
```json
{
  "statusCode": 200,
  "message": "Operación exitosa",
  "data": {
    "message": "Category deleted successfully"
  }
}
```

**Errores posibles:**
- `403` - Permisos insuficientes (no tienes `inventory.categories.update`)
- `404` - Categoría no encontrada
- `409` - No se puede eliminar una categoría con productos asignados

**Notas importantes:**
- El borrado es lógico (soft delete) - la categoría se marca como eliminada pero se mantiene en la BD
- No se puede eliminar una categoría que tenga productos asignados
- Para eliminar una categoría con productos, primero debes cambiar o eliminar los productos asociados

## APIs de Carga de Archivos

**Permisos requeridos:**
- `files.upload` - Subir archivos

**Nota importante:** El propietario de la organización (`ownerUserId`) tiene acceso completo sin necesidad de permisos específicos.

**Configuración de Backblaze B2:**
Para usar este API necesitas configurar las siguientes variables de entorno:
- `B2_APPLICATION_KEY_ID` - Key ID de tu "Master Application Key" en Backblaze B2
- `B2_APPLICATION_KEY` - Key (secreto) de tu "Master Application Key" en Backblaze B2
- `B2_BUCKET_ID` - ID del bucket (se encuentra en la configuración del bucket)
- `B2_BUCKET_NAME` - Nombre del bucket que creaste
- `STORAGE_BUCKET_PRIVATE` - `true` si el bucket es privado, `false` si es público (default: `false`)
- `STORAGE_SIGNED_URL_EXPIRY` - Tiempo de expiración de URLs firmadas en segundos (default: 3600 = 1 hora)

**Cómo obtener las credenciales:**
1. Ve a tu cuenta de Backblaze B2
2. Ve a "App Keys" > "Master Application Key"
3. Copia el "Key ID" → va en `B2_APPLICATION_KEY_ID`
4. Copia el "Key" (el secreto) → va en `B2_APPLICATION_KEY`
5. Ve a tu bucket y copia el "Bucket ID" → va en `B2_BUCKET_ID`
6. El nombre del bucket → va en `B2_BUCKET_NAME`

**Categorías permitidas:**
- `profiles` - Imágenes de perfil de usuarios (JPEG, PNG, WebP - máx 5MB)
- `documents` - Documentos (PDF, JPEG, PNG - máx 10MB)
- `inventory` - Imágenes de productos de inventario (JPEG, PNG, WebP - máx 5MB)
- `establishments` - Imágenes de establecimientos (JPEG, PNG, WebP - máx 5MB)

### 21. Subir Archivos (requiere token y permiso 'files.upload')

**Ejemplo 1: Subir un solo archivo**
```bash
POST http://localhost:3000/api/v1/files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

# Form data:
# files: [archivo]
# category: profiles
```

**Ejemplo con cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/files/upload \
  -H "Authorization: Bearer <token>" \
  -F "files=@/ruta/a/foto.jpg" \
  -F "category=profiles"
```

**Ejemplo 2: Subir múltiples archivos (hasta 10)**
```bash
POST http://localhost:3000/api/v1/files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

# Form data:
# files: [archivo1]
# files: [archivo2]
# files: [archivo3]
# category: inventory
```

**Ejemplo con JavaScript (un archivo):**
```javascript
const formData = new FormData();
formData.append('files', fileInput.files[0]);
formData.append('category', 'profiles');

const response = await fetch('http://localhost:3000/api/v1/files/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
console.log('Archivo subido:', result.data.file.path);
```

**Ejemplo con JavaScript (múltiples archivos):**
```javascript
const formData = new FormData();
const files = fileInput.files;

// Agregar todos los archivos con el mismo nombre de campo
for (let i = 0; i < files.length; i++) {
  formData.append('files', files[i]);
}
formData.append('category', 'inventory');

const response = await fetch('http://localhost:3000/api/v1/files/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
console.log(`Subidos ${result.data.count} archivos`);
result.data.files.forEach(file => {
  console.log(`Path: ${file.path}`);
  // Guardar cada file.path en tu base de datos
});
```

**Respuesta exitosa (un archivo):**
```json
{
  "statusCode": 200,
  "message": "Operación exitosa",
  "data": {
    "file": {
      "path": "1/profiles/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
      "category": "profiles",
      "originalName": "foto.jpg",
      "fileName": "a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
      "mimeType": "image/jpeg",
      "size": 123456
    },
    "files": [
      {
        "path": "1/profiles/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
        "category": "profiles",
        "originalName": "foto.jpg",
        "fileName": "a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
        "mimeType": "image/jpeg",
        "size": 123456
      }
    ],
    "count": 1
  }
}
```

**Respuesta exitosa (múltiples archivos):**
```json
{
  "statusCode": 200,
  "message": "Operación exitosa",
  "data": {
    "files": [
      {
        "path": "1/inventory/uuid1.jpg",
        "category": "inventory",
        "originalName": "producto1.jpg",
        "fileName": "uuid1.jpg",
        "mimeType": "image/jpeg",
        "size": 123456
      },
      {
        "path": "1/inventory/uuid2.jpg",
        "category": "inventory",
        "originalName": "producto2.jpg",
        "fileName": "uuid2.jpg",
        "mimeType": "image/jpeg",
        "size": 234567
      }
    ],
    "count": 2
  }
}
```

**Errores posibles:**
- `403` - Permisos insuficientes (no tienes `files.upload`)
- `400` - Validación fallida:
  - Categoría requerida o inválida
  - Tipo de archivo no permitido para la categoría
  - Tamaño de archivo excede el límite
  - Archivo requerido

**Notas importantes:**
- El campo del formulario debe llamarse `files` (plural), incluso para un solo archivo
- Todos los archivos en una misma request deben ser de la misma categoría
- El API retorna solo el `path`, NO la URL
- Guarda el `path` en tu base de datos (ej: `users.profileImagePath`, `inventory_products.imagePath`)
- El path tiene formato: `{organizationId}/{category}/{fileName}`
- Las URLs se generan automáticamente en otros endpoints cuando se retornan datos (ej: `/users/list`, `/inventory/products/list`)

### Flujo completo de uso:

**1. Subir archivo:**
```javascript
// Subir imagen de perfil
const formData = new FormData();
formData.append('files', profileImageFile);
formData.append('category', 'profiles');

const uploadResponse = await fetch('/api/v1/files/upload', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});

const uploadResult = await uploadResponse.json();
const imagePath = uploadResult.data.file.path; // "1/profiles/uuid.jpg"
```

**2. Guardar path en base de datos:**
```javascript
// Actualizar usuario con el path
await fetch('/api/v1/users/update', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    data: {
      id: userId,
      profileImagePath: imagePath // Guardar solo el path
    }
  })
});
```

**3. Las URLs se generan automáticamente:**
```javascript
// Cuando obtengas datos del usuario/producto/etc, las URLs ya vienen generadas
const userResponse = await fetch('/api/v1/users/list', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ data: {} })
});

const userResult = await userResponse.json();
// El usuario ya viene con profileImageUrl generada automáticamente
const imageUrl = userResult.data.users[0].profileImageUrl;
```

### 17. Cambios de stock: Movimientos (requiere token y permiso 'inventory.stock.update')

**Todos los cambios de stock** (entradas, salidas, transferencias, ajustes) se realizan mediante **movimientos**. Un movimiento puede tener uno o varios ítems (varios productos). Ver sección **Movimientos** más abajo para ejemplos completos.

**Ejemplo rápido – un solo producto:**
```bash
POST http://localhost:3000/api/v1/inventory/movements/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "establishmentId": 1,
    "description": "Entrada de vacunas",
    "items": [
      {
        "productId": 1,
        "type": "entry",
        "quantity": 500,
        "minStockLevel": 100,
        "reason": "Compra de vacunas para campaña"
      }
    ]
  }
}
```

---

### Movimientos (uno o varios productos en una sola transacción)

Un **movimiento** agrupa uno o más cambios de stock (ingresos/egresos de uno o varios productos) en una sola operación. Envías un array `items` y todo se aplica atómicamente.

**Requisitos:** Header `Authorization: Bearer <token>`, permiso `inventory.stock.update`.

#### 1. Crear movimiento (varios productos)

```bash
POST http://localhost:3000/api/v1/inventory/movements/create
Content-Type: application/json
Authorization: Bearer <tu_token>

{
  "data": {
    "establishmentId": 1,
    "description": "Recepción de compra #123 - múltiples productos",
    "items": [
      {
        "productId": 1,
        "type": "entry",
        "quantity": 100,
        "reason": "Ingreso producto A"
      },
      {
        "productId": 2,
        "type": "entry",
        "quantity": 50,
        "reason": "Ingreso producto B"
      },
      {
        "productId": 3,
        "type": "exit",
        "quantity": 10,
        "reason": "Salida para venta"
      }
    ]
  }
}
```

**Respuesta exitosa:**
```json
{
  "statusCode": 200,
  "message": "Operación exitosa",
  "data": {
    "movement": {
      "id": 1,
      "establishmentId": 1,
      "userId": 1,
      "sequenceNumber": 1,
      "description": "Recepción de compra #123 - múltiples productos",
      "createdAt": "2026-02-11T12:00:00.000Z",
      "establishment": {
        "id": 1,
        "name": "Bodega Central",
        "code": "BOD-001"
      },
      "user": {
        "id": 1,
        "fullName": "Juan Pérez"
      },
      "itemsCount": 3
    }
  }
}
```

#### 2. Movimiento con transferencia (un ítem transfiere a otro establecimiento)

```bash
POST http://localhost:3000/api/v1/inventory/movements/create
Content-Type: application/json
Authorization: Bearer <tu_token>

{
  "data": {
    "establishmentId": 1,
    "description": "Entradas + transferencia a sucursal",
    "items": [
      {
        "productId": 1,
        "type": "entry",
        "quantity": 200,
        "reason": "Compra"
      },
      {
        "productId": 2,
        "type": "transfer",
        "quantity": 30,
        "targetEstablishmentId": 2,
        "reason": "Envío a Finca Norte"
      }
    ]
  }
}
```

#### 3. Ajuste en un ítem (stock final fijo)

```bash
POST http://localhost:3000/api/v1/inventory/movements/create
Content-Type: application/json
Authorization: Bearer <tu_token>

{
  "data": {
    "establishmentId": 1,
    "description": "Conteo físico y ajuste",
    "items": [
      {
        "productId": 1,
        "type": "adjustment",
        "currentStock": 85.5,
        "reason": "Conteo físico"
      }
    ]
  }
}
```

#### 4. Editar un movimiento

**Comportamiento:** Al editar un movimiento, el sistema hace todo en una sola transacción:

1. **Reverso:** Por cada ítem vigente del movimiento, se deshace el efecto en stock (el stock vuelve al valor anterior) y se crean registros de kardex de reverso.
2. **Marcar no vigentes:** Los registros de kardex anteriores de ese movimiento se marcan como no vigentes (`isCurrent: false`); los reversos también quedan como no vigentes (histórico).
3. **Aplicar lo nuevo:** Se aplican los nuevos `items` que envías: se actualiza stock y se crean los nuevos registros de kardex vigentes.

Así el historial se mantiene (reversos + registros viejos) y el estado actual de stock refleja solo la última versión del movimiento.

**Request:**
```bash
POST http://localhost:3000/api/v1/inventory/movements/update
Content-Type: application/json
Authorization: Bearer <tu_token>

{
  "data": {
    "movementId": 1,
    "description": "Recepción de compra #123 - corregido",
    "items": [
      {
        "productId": 1,
        "type": "entry",
        "quantity": 120,
        "reason": "Ingreso producto A corregido"
      },
      {
        "productId": 2,
        "type": "entry",
        "quantity": 50,
        "reason": "Ingreso producto B"
      }
    ]
  }
}
```

#### 5. Ver un movimiento (detalle con ítems)

Obtiene un movimiento por ID con todos sus ítems vigentes (para mostrar el formulario de edición). Puedes enviar `data.id` o `data.movementId`.

```bash
POST http://localhost:3000/api/v1/inventory/movements/view
Content-Type: application/json
Authorization: Bearer <tu_token>

{
  "data": {
    "id": 1
  }
}
```

O con `movementId`:
```json
{
  "data": {
    "movementId": 1
  }
}
```

**Respuesta exitosa (200):**
```json
{
  "statusCode": 200,
  "message": "Operación exitosa",
  "data": {
    "movement": {
      "id": 1,
      "establishmentId": 1,
      "userId": 1,
      "sequenceNumber": 1,
      "description": "Recepción de compra #123",
      "createdAt": "2026-02-11T12:00:00.000Z",
      "updatedAt": "2026-02-11T12:00:00.000Z",
      "establishment": { "id": 1, "name": "Bodega Central", "code": "BOD-001" },
      "user": { "id": 1, "fullName": "Juan Pérez" },
      "items": [
        {
          "productId": 1,
          "productName": "Vacuna Triple Bovina",
          "sku": "VAC-TB-001",
          "type": "entry",
          "quantity": 100,
          "previousStock": 0,
          "newStock": 100,
          "reason": "Ingreso producto A",
          "metadata": null,
          "targetEstablishmentId": null,
          "minStockLevel": 10
        },
        {
          "productId": 2,
          "productName": "Penicilina 300.000 UI",
          "sku": "ANT-PEN-300",
          "type": "exit",
          "quantity": 5,
          "previousStock": 50,
          "newStock": 45,
          "reason": "Venta",
          "metadata": null,
          "targetEstablishmentId": null,
          "minStockLevel": 5
        }
      ]
    }
  }
}
```

**Errores:** `404` `inventory.movements.notFound` si no existe o no es de tu organización; `400` si falta `data.id` o `data.movementId`.

**Flujo típico para editar:** 1) `POST /inventory/movements/list` (con `establishmentId`) para listar. 2) `POST /inventory/movements/view` con `data.id` del movimiento elegido para cargar ítems. 3) `POST /inventory/movements/update` con `movementId` y los `items` (modificados o iguales).

#### 6. Listar movimientos de un establecimiento

```bash
POST http://localhost:3000/api/v1/inventory/movements/list
Content-Type: application/json
Authorization: Bearer <tu_token>

{
  "data": {
    "establishmentId": 1,
    "page": 1,
    "limit": 20
  }
}
```

**Respuesta:**
```json
{
  "statusCode": 200,
  "message": "Operación exitosa",
  "data": {
    "movements": [
      {
        "id": 2,
        "establishmentId": 1,
        "userId": 1,
        "sequenceNumber": 2,
        "description": "Recepción de compra #124",
        "createdAt": "2026-02-11T14:00:00.000Z",
        "updatedAt": "2026-02-11T14:00:00.000Z",
        "establishment": { "id": 1, "name": "Bodega Central", "code": "BOD-001" },
        "user": { "id": 1, "fullName": "Juan Pérez" },
        "itemsCount": 2
      },
      {
        "id": 1,
        "establishmentId": 1,
        "userId": 1,
        "sequenceNumber": 1,
        "description": "Recepción de compra #123",
        "createdAt": "2026-02-11T12:00:00.000Z",
        "updatedAt": "2026-02-11T12:00:00.000Z",
        "establishment": { "id": 1, "name": "Bodega Central", "code": "BOD-001" },
        "user": { "id": 1, "fullName": "Juan Pérez" },
        "itemsCount": 3
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 2,
      "totalPages": 1
    }
  }
}
```

**Campos por ítem en `items`:**

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `productId` | Sí | ID del producto (debe existir en tu organización). |
| `type` | Opcional (default: `adjustment`) | `entry`, `exit`, `transfer`, `adjustment`. |
| `quantity` | Sí para entry/exit/transfer | Cantidad (decimal > 0). |
| `currentStock` | Sí para adjustment | Stock final deseado (o usar `quantity` en adjustment). |
| `reason` | No | Texto libre (máx 255). |
| `metadata` | No | Objeto JSON. |
| `targetEstablishmentId` | Sí si type=transfer | Establecimiento destino (distinto al del movimiento). |
| `minStockLevel` | No | Nivel mínimo de stock para ese producto en ese establecimiento. |

**Errores posibles (movements):**
- `400` - `validators.items.required` si `items` está vacío o no es array.
- `404` - `establishments.notFound` / `inventory.products.notFound`.
- `400` - `inventory.stock.insufficientStock` en exit/transfer si no hay stock suficiente.
- `404` - `inventory.movements.notFound` al actualizar si el movimiento no existe o es de otra organización.

---

### Ejemplos de Flujo Completo: Gestión de Inventario Veterinario

**Escenario: Recepción y venta de vacunas**

1. **Crear el producto (si no existe):**
```bash
POST /api/v1/inventory/products/create
{
  "data": {
    "name": "Vacuna Fiebre Aftosa",
    "sku": "VAC-FA-001",
    "unitOfMeasure": "Dosis",
    "categoryId": 1
  }
}
```

2. **Registrar entrada de stock (compra):**
```bash
POST /api/v1/inventory/movements/create
{
  "data": {
    "establishmentId": 1,
    "description": "Compra inicial de vacunas",
    "items": [
      {
        "productId": 1,
        "type": "entry",
        "quantity": 1000,
        "minStockLevel": 200,
        "reason": "Compra inicial de vacunas"
      }
    ]
  }
}
```

3. **Verificar stock actual:**
```bash
POST /api/v1/inventory/products/list
{
  "data": {
    "search": "Vacuna Fiebre Aftosa"
  }
}
```

4. **Registrar salida de stock (venta):**
```bash
POST /api/v1/inventory/movements/create
{
  "data": {
    "establishmentId": 1,
    "description": "Venta a cliente",
    "items": [
      {
        "productId": 1,
        "type": "exit",
        "quantity": 150,
        "reason": "Venta a cliente: Ganadería San José"
      }
    ]
  }
}
```

5. **Ajuste de inventario (conteo físico):**
```bash
POST /api/v1/inventory/movements/create
{
  "data": {
    "establishmentId": 1,
    "description": "Conteo físico mensual",
    "items": [
      {
        "productId": 1,
        "type": "adjustment",
        "currentStock": 840,
        "reason": "Conteo físico mensual"
      }
    ]
  }
}
```

**Escenario: Transferencia entre establecimientos**

**Transferencia completa en una sola llamada:**
```bash
POST /api/v1/inventory/movements/create
{
  "data": {
    "establishmentId": 1,
    "description": "Transferencia a Establecimiento Norte",
    "items": [
      {
        "productId": 2,
        "type": "transfer",
        "quantity": 50,
        "targetEstablishmentId": 2,
        "reason": "Transferencia a Establecimiento Norte",
        "metadata": { "transferId": "TRF-2026-012" }
      }
    ]
  }
}
```

**Nota:** Esta operación automáticamente:
- Resta 50 unidades del establecimiento 1 (origen)
- Suma 50 unidades al establecimiento 2 (destino)
- Crea logs en ambos establecimientos
- Todo en una sola transacción atómica
