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

**Ejemplo mínimo (sin SKU ni descripción):**
```json
{
  "data": {
    "name": "Aguja Hipodérmica 18G",
    "unitOfMeasure": "Unidad"
  }
}
```

**Respuesta exitosa:**
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
- `403` - Permisos insuficientes (no tienes `inventory.products.create`)
- `404` - Categoría no encontrada (si `categoryId` no existe o no pertenece a tu organización)
- `400` - Validación fallida (campos requeridos faltantes o inválidos)

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

### 17. Actualizar Stock de Productos Veterinarios (requiere token y permiso 'inventory.stock.update')

**Tipos de movimiento disponibles:**
- `entry` - Entrada de stock (compra, recepción)
- `exit` - Salida de stock (venta, consumo)
- `transfer` - Transferencia entre establecimientos
- `adjustment` - Ajuste de inventario (conteo físico)

**Ejemplo 1: Entrada de stock (compra de vacunas)**
```bash
POST http://localhost:3000/api/v1/inventory/stock/update
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "establishmentId": 1,
    "productId": 1,
    "type": "entry",
    "quantity": 500,
    "minStockLevel": 100,
    "reason": "Compra de vacunas para campaña de vacunación",
    "metadata": {
      "supplier": "Laboratorios Veterinarios S.A.",
      "invoice": "FAC-2026-001",
      "batch": "LOT-2026-01"
    }
  }
}
```

**Ejemplo 2: Salida de stock (venta a cliente)**
```bash
POST http://localhost:3000/api/v1/inventory/stock/update
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "establishmentId": 1,
    "productId": 2,
    "type": "exit",
    "quantity": 10,
    "reason": "Venta a cliente: Finca Los Alamos",
    "metadata": {
      "customer": "Finca Los Alamos",
      "saleId": 1234,
      "invoice": "VTA-2026-045"
    }
  }
}
```

**Ejemplo 3: Transferencia entre establecimientos (automática)**
```bash
POST http://localhost:3000/api/v1/inventory/stock/update
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "establishmentId": 1,
    "productId": 3,
    "type": "transfer",
    "quantity": 50,
    "targetEstablishmentId": 2,
    "reason": "Transferencia a Establecimiento 2 - Finca Norte",
    "metadata": {
      "transferId": "TRF-2026-012"
    }
  }
}
```

**Nota importante:** Las transferencias son operaciones atómicas que automáticamente:
- Restan stock del establecimiento origen (`establishmentId`)
- Suman stock al establecimiento destino (`targetEstablishmentId`)
- Crean logs en ambos establecimientos
- Todo en una sola transacción (si falla algo, se revierte todo)

**Ejemplo 4: Ajuste de inventario (conteo físico)**
```bash
POST http://localhost:3000/api/v1/inventory/stock/update
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "establishmentId": 1,
    "productId": 4,
    "type": "adjustment",
    "currentStock": 75,
    "minStockLevel": 50,
    "reason": "Ajuste por conteo físico - Diferencia encontrada",
    "metadata": {
      "physicalCount": 75,
      "systemCount": 80,
      "difference": -5,
      "countDate": "2026-01-22"
    }
  }
}
```

**Ejemplo 5: Entrada simple (sin metadata)**
```bash
POST http://localhost:3000/api/v1/inventory/stock/update
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "establishmentId": 1,
    "productId": 5,
    "type": "entry",
    "quantity": 200,
    "reason": "Recepción de mercancía"
  }
}
```

**Ejemplo 6: Establecer nivel mínimo de stock**
```bash
POST http://localhost:3000/api/v1/inventory/stock/update
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "establishmentId": 1,
    "productId": 1,
    "type": "adjustment",
    "currentStock": 500,
    "minStockLevel": 150,
    "reason": "Actualización de nivel mínimo de stock"
  }
}
```

**Respuesta exitosa:**
```json
{
  "statusCode": 200,
  "message": "Operación exitosa",
  "data": {
    "stock": {
      "id": 1,
      "establishmentId": 1,
      "productId": 1,
      "currentStock": 500,
      "minStockLevel": 100,
      "updatedAt": "2026-01-22T10:30:00.000Z",
      "establishment": {
        "id": 1,
        "name": "Bodega Central",
        "code": "BOD-001"
      },
      "product": {
        "id": 1,
        "name": "Vacuna Triple Bovina",
        "sku": "VAC-TB-001",
        "unitOfMeasure": "Dosis"
      }
    }
  }
}
```

**Respuesta exitosa para transferencias:**
```json
{
  "statusCode": 200,
  "message": "Operación exitosa",
  "data": {
    "stock": {
      "id": 1,
      "establishmentId": 1,
      "productId": 3,
      "currentStock": 450,
      "minStockLevel": 50,
      "updatedAt": "2026-01-22T10:30:00.000Z",
      "establishment": {
        "id": 1,
        "name": "Bodega Central",
        "code": "BOD-001"
      },
      "product": {
        "id": 3,
        "name": "Ivermectina 1% Oral",
        "sku": "DES-IVM-1",
        "unitOfMeasure": "Litro"
      }
    },
    "targetStock": {
      "establishmentId": 2,
      "productId": 3,
      "currentStock": 50,
      "minStockLevel": null,
      "updatedAt": "2026-01-22T10:30:00.000Z",
      "establishment": {
        "id": 2,
        "name": "Finca Norte",
        "code": "FIN-002"
      }
    }
  }
}
```

**Errores posibles:**
- `403` - Permisos insuficientes (no tienes `inventory.stock.update`)
- `404` - Establecimiento no encontrado
- `404` - Establecimiento destino no encontrado (para transferencias)
- `404` - Producto no encontrado
- `400` - Stock insuficiente (para salidas o transferencias)
- `400` - Cantidad requerida para movimientos entry/exit/transfer
- `400` - Establecimiento destino requerido para transferencias (`targetEstablishmentId`)
- `400` - No se puede transferir al mismo establecimiento
- `400` - Stock actual requerido para ajustes

**Notas importantes:**
- Para `entry`, `exit` y `transfer`: se requiere `quantity` (cantidad a agregar/quitar)
- Para `adjustment`: se requiere `currentStock` (stock final después del ajuste)
- Para `transfer`: se requiere `targetEstablishmentId` (establecimiento destino)
- El sistema calcula automáticamente el nuevo stock basado en el tipo de movimiento
- Todas las operaciones generan un registro en `inventory_logs` automáticamente
- **Las transferencias son operaciones atómicas:** automáticamente restan del origen y suman al destino en una sola transacción
- Si la transferencia falla en cualquier punto, toda la operación se revierte (rollback)

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
POST /api/v1/inventory/stock/update
{
  "data": {
    "establishmentId": 1,
    "productId": 1,
    "type": "entry",
    "quantity": 1000,
    "minStockLevel": 200,
    "reason": "Compra inicial de vacunas"
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
POST /api/v1/inventory/stock/update
{
  "data": {
    "establishmentId": 1,
    "productId": 1,
    "type": "exit",
    "quantity": 150,
    "reason": "Venta a cliente: Ganadería San José"
  }
}
```

5. **Ajuste de inventario (conteo físico):**
```bash
POST /api/v1/inventory/stock/update
{
  "data": {
    "establishmentId": 1,
    "productId": 1,
    "type": "adjustment",
    "currentStock": 840,
    "reason": "Conteo físico mensual"
  }
}
```

**Escenario: Transferencia entre establecimientos**

**Transferencia completa en una sola llamada:**
```bash
POST /api/v1/inventory/stock/update
{
  "data": {
    "establishmentId": 1,
    "productId": 2,
    "type": "transfer",
    "quantity": 50,
    "targetEstablishmentId": 2,
    "reason": "Transferencia a Establecimiento Norte",
    "metadata": {
      "transferId": "TRF-2026-012"
    }
  }
}
```

**Nota:** Esta operación automáticamente:
- Resta 50 unidades del establecimiento 1 (origen)
- Suma 50 unidades al establecimiento 2 (destino)
- Crea logs en ambos establecimientos
- Todo en una sola transacción atómica
