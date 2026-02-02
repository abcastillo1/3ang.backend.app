# Lógica de Negocio y Reglas del Dominio

Este documento describe la lógica de negocio, reglas de dominio y flujos de trabajo del sistema. Esta es la fuente de verdad para entender cómo opera el negocio.

**IMPORTANTE:** Antes de implementar nuevas funcionalidades o modificar las existentes, siempre consulta este documento para asegurar el cumplimiento de las reglas de negocio.

## Visión General del Sistema

Este es un sistema multi-tenant de gestión de inventario diseñado para organizaciones (granjas/establecimientos) para gestionar sus productos, stock y usuarios.

## Entidades Principales

### Organizaciones
- Cada organización es independiente y aislada
- Una organización tiene un propietario (`ownerUserId`)
- El propietario tiene acceso completo a todas las funcionalidades sin permisos explícitos (bypass)
- Las organizaciones pueden tener múltiples usuarios, roles, productos y establecimientos

### Usuarios
- Los usuarios pertenecen a una sola organización
- Cada usuario tiene un rol que determina sus permisos
- Los usuarios pueden estar activos o inactivos
- Los usuarios se autentican mediante email/username y contraseña

### Roles y Permisos
- Los roles son específicos de la organización (excepto los roles del sistema)
- Los permisos son granulares y están organizados por módulo
- Los roles del sistema no pueden ser modificados (no se pueden agregar/quitar permisos)
- El propietario omite todas las verificaciones de permisos

### Sistema de Inventario
- Los productos pertenecen a una organización
- Los productos pueden ser categorizados usando `ProductCategory` (específico de la organización)
- Los establecimientos (granjas) pertenecen a una organización
- El stock se rastrea por establecimiento y producto
- Todos los movimientos de inventario se registran en `InventoryLog`

## Reglas de Negocio

### Gestión de Usuarios

#### Creación de Usuarios
- El email debe ser único globalmente en todas las organizaciones
- El username debe ser único globalmente en todas las organizaciones
- El número de documento (`documentNumber`) debe ser único por organización y tipo de documento
- La contraseña se hashea automáticamente antes de guardar
- Los nuevos usuarios se crean como activos por defecto
- Los usuarios solo pueden ser creados dentro de la misma organización que el creador

#### Actualización de Usuarios
- Los usuarios pueden actualizar su propio perfil (si tienen el permiso `users.editInfo`)
- Los usuarios pueden actualizar otros usuarios en la misma organización (si tienen los permisos apropiados)
- Solo el propietario puede desactivar su propia cuenta
- Otros usuarios no pueden desactivar la cuenta del propietario
- Actualizar campos sensibles requiere permisos específicos:
  - `users.editPassword` - para cambiar contraseña
  - `users.editRole` - para cambiar el rol del usuario
  - `users.editStatus` - para activar/desactivar usuario
  - `users.editInfo` - para actualizar nombre, email, teléfono, documento, username
- Los permisos solo se verifican si el nuevo valor difiere del valor actual
- La unicidad del email es global
- La unicidad del username es global
- La unicidad del número de documento es por organización y tipo de documento

#### Listado de Usuarios
- El listado de usuarios excluye al usuario autenticado actualmente
- Los usuarios solo pueden ver usuarios de su propia organización
- Requiere permiso `users.view` (o bypass del propietario)

#### Eliminación de Usuarios
- Usa borrado lógico (soft delete)
- Los usuarios eliminados se marcan con el timestamp `deletedAt`
- Requiere permiso `users.delete` (o bypass del propietario)

### Gestión de Roles

#### Creación de Roles
- Los roles son específicos de la organización
- Los nombres de roles deben ser únicos dentro de una organización
- Los roles pueden ser marcados como roles del sistema (`isSystem: true`)
- Requiere permiso `roles.create` (o bypass del propietario)

#### Actualización de Roles
- Se puede actualizar el nombre y descripción del rol
- Se pueden asignar/quitar permisos a/de un rol
- Los roles del sistema (`isSystem: true`) no pueden ser modificados:
  - No se pueden agregar permisos
  - No se pueden quitar permisos
  - No se puede cambiar el nombre o descripción
- Requiere permiso `roles.update` (o bypass del propietario)

#### Eliminación de Roles
- Los roles del sistema no pueden ser eliminados
- Usa borrado lógico (soft delete)
- Requiere permiso `roles.delete` (o bypass del propietario)

### Sistema de Permisos

#### Estructura de Permisos
- Los permisos están organizados por módulos (ej: `users`, `roles`, `inventory`)
- Los códigos de permisos siguen el patrón: `{module}.{action}`
- Ejemplos:
  - `users.create` - Crear usuarios
  - `users.view` - Ver/listar usuarios
  - `users.editInfo` - Editar información del usuario
  - `users.editPassword` - Cambiar contraseña del usuario
  - `users.editRole` - Cambiar rol del usuario
  - `users.editStatus` - Activar/desactivar usuario
  - `users.delete` - Eliminar usuarios
  - `roles.view` - Ver/listar roles
  - `roles.create` - Crear roles
  - `roles.update` - Actualizar roles y asignar permisos
  - `roles.delete` - Eliminar roles
  - `permissions.view` - Ver permisos disponibles

#### Verificación de Permisos
- Los permisos se verifican mediante el middleware `requirePermission`
- El propietario de la organización (`ownerUserId`) omite todas las verificaciones de permisos
- Los usuarios deben tener el permiso requerido en su rol
- Los permisos se verifican dinámicamente según qué campos se están actualizando

### Gestión de Inventario

#### Categorías de Productos
- Las categorías son específicas de la organización
- Las categorías permiten a las organizaciones personalizar sus tipos de productos
- Las categorías pueden ser eliminadas lógicamente (soft delete)
- Los productos pueden pertenecer opcionalmente a una categoría
- Si se elimina una categoría, el `categoryId` de los productos se establece en `NULL` (SET NULL on delete)

#### Productos (`InventoryProduct`)
- Los productos pertenecen a una organización
- Los productos pueden pertenecer opcionalmente a una categoría
- Los productos tienen:
  - Nombre (requerido)
  - SKU (opcional, identificador único)
  - Descripción (opcional)
  - Unidad de medida (requerido, ej: "kg", "litros", "unidades")
  - Estado activo (`isActive`, por defecto `true`)
- Los productos usan borrado lógico (soft delete)
- Los productos pueden tener stock en múltiples establecimientos

#### Establecimientos
- Los establecimientos (granjas) pertenecen a una organización
- Cada establecimiento puede tener:
  - Nombre (requerido)
  - Código (identificador opcional)
  - Dirección (opcional)
  - Teléfono (opcional)
  - Estado activo (`isActive`, por defecto `true`)
- Los establecimientos usan borrado lógico (soft delete)
- Cada establecimiento puede tener stock de múltiples productos

#### Stock (`InventoryStock`)
- El stock se rastrea por establecimiento y producto
- Cada registro de stock tiene:
  - Cantidad de stock actual (`currentStock`, decimal 12,4)
  - Nivel mínimo de stock (`minStockLevel`, decimal 12,4, opcional)
- Restricción única: un registro de stock por combinación (establecimiento, producto)
- El stock se actualiza automáticamente cuando ocurren movimientos de inventario
- La tabla de stock no usa borrado lógico (solo timestamp `updatedAt`)

#### Logs de Inventario (`InventoryLog`)
- Todos los movimientos de inventario se registran
- Tipos de log:
  - `entry` - Entrada de producto (aumenta stock)
  - `exit` - Salida de producto (disminuye stock)
  - `transfer` - Transferencia entre establecimientos
  - `adjustment` - Ajuste manual de stock
- Cada entrada de log registra:
  - Establecimiento y producto
  - Usuario que realizó la acción
  - Tipo de movimiento
  - Cantidad (puede ser positiva o negativa)
  - Stock anterior y stock nuevo
  - Razón (texto opcional)
  - Metadatos (JSON opcional para datos adicionales)
- Los logs son inmutables (solo `createdAt`, sin actualizaciones ni eliminaciones)
- Los logs se usan para auditoría e historial de stock

### Autenticación y Sesiones

#### Login
- Los usuarios se autentican con email/username y contraseña
- En login exitoso:
  - Se genera un token JWT
  - Se crea una sesión de usuario
  - Se actualiza `lastLoginAt`
  - Se retorna el perfil completo del usuario:
    - Datos del usuario (sin contraseña)
    - Datos de la organización
    - Datos del rol
    - Lista de permisos
    - Bandera `isOwner`

#### Logout
- Invalida la sesión actual del usuario
- La sesión se marca como inactiva
- Requiere autenticación

#### Gestión de Sesiones
- Las sesiones se rastrean por usuario
- Las sesiones pueden ser invalidadas en logout
- Los tokens JWT se validan en cada petición

### Auditoría y Logging

#### Logs de Auditoría
- Las acciones de los usuarios se registran en `AuditLog`
- Los logs incluyen:
  - Usuario que realizó la acción
  - Contexto de la organización
  - Tipo de acción y detalles
  - Timestamp

#### Logs de Aplicación
- Los logs de la aplicación se escriben en archivos en el directorio `logs/`
- Los logs están organizados por fecha
- Niveles de log: error, warn, info, debug
- Los logs rotan por fecha

## Reglas de Integridad de Datos

### Restricciones de Unicidad

1. **Email**: Único globalmente en todas las organizaciones
2. **Username**: Único globalmente en todas las organizaciones
3. **Número de Documento**: Único por organización y tipo de documento
4. **Nombre de Rol**: Único por organización
5. **Stock**: Único por combinación (establecimiento, producto)

### Restricciones de Claves Foráneas

- Usuarios → Organización (CASCADE on delete)
- Usuarios → Rol (restringido)
- Roles → Organización (CASCADE on delete)
- Productos → Organización (CASCADE on delete)
- Productos → Categoría (SET NULL on delete)
- Establecimientos → Organización (CASCADE on delete)
- Stock → Establecimiento (CASCADE on delete)
- Stock → Producto (CASCADE on delete)
- Logs → Establecimiento (restringido)
- Logs → Producto (restringido)
- Logs → Usuario (restringido)

### Comportamiento de Borrado Lógico

- Los modelos con `paranoid: true` usan borrado lógico:
  - User
  - Organization
  - Role
  - ProductCategory
  - InventoryProduct
  - Establishment
- Los registros eliminados lógicamente se marcan con el timestamp `deletedAt`
- Los registros eliminados lógicamente se excluyen de las consultas por defecto
- El borrado físico no se usa (excepto para logs y stock, que no usan borrado lógico)

## Flujos de Trabajo

### Flujo de Registro de Usuario
1. El propietario crea la organización
2. El propietario crea el primer usuario (él mismo)
3. El propietario crea roles y asigna permisos
4. El propietario crea usuarios adicionales y asigna roles
5. Los usuarios pueden entonces operar dentro de sus permisos

### Flujo de Movimiento de Inventario
1. El usuario selecciona establecimiento y producto
2. El usuario especifica el tipo de movimiento (entrada/salida/transferencia/ajuste)
3. El sistema calcula el nuevo stock:
   - Entrada: `newStock = previousStock + quantity`
   - Salida: `newStock = previousStock - quantity`
   - Transferencia: Disminuye en origen, aumenta en destino
   - Ajuste: `newStock = previousStock + quantity` (puede ser negativo)
4. El sistema crea una entrada de log con:
   - Stock anterior
   - Cantidad
   - Stock nuevo
   - Usuario, establecimiento, producto, tipo, razón, metadatos
5. El sistema actualiza o crea el registro de stock

### Flujo de Validación de Permisos
1. La petición llega con token JWT
2. El token se valida y se carga el usuario
3. Se determina la organización del usuario
4. Si el usuario es propietario → omite todas las verificaciones
5. De lo contrario, verifica si el rol del usuario tiene el permiso requerido
6. Si falta el permiso → retorna 403 Forbidden
7. Si existe el permiso → procede con la petición

## Reglas de Validación

### Campos de Usuario
- `fullName`: Requerido, string
- `email`: Requerido, formato de email válido, único globalmente
- `username`: Opcional, único globalmente si se proporciona
- `phone`: Opcional, string
- `documentType`: Requerido, enum: 'cedula', 'ruc', 'pasaporte'
- `documentNumber`: Requerido, único por organización y tipo de documento
- `password`: Requerido en creación, hasheado antes de guardar
- `isActive`: Boolean, por defecto `true`
- `roleId`: Requerido, debe existir y pertenecer a la misma organización

### Campos de Producto
- `name`: Requerido, string (máx 255)
- `sku`: Opcional, string (máx 100)
- `description`: Opcional, text
- `unitOfMeasure`: Requerido, string (máx 50)
- `isActive`: Boolean, por defecto `true`
- `categoryId`: Opcional, debe existir y pertenecer a la misma organización

### Campos de Establecimiento
- `name`: Requerido, string (máx 255)
- `code`: Opcional, string (máx 50)
- `address`: Opcional, text
- `phone`: Opcional, string (máx 50)
- `isActive`: Boolean, por defecto `true`

### Campos de Stock
- `currentStock`: Requerido, decimal(12,4), por defecto 0.0000
- `minStockLevel`: Opcional, decimal(12,4), por defecto 0.0000

### Campos de Log de Inventario
- `type`: Requerido, enum: 'entry', 'exit', 'transfer', 'adjustment'
- `quantity`: Requerido, decimal(12,4), puede ser positivo o negativo
- `previousStock`: Requerido, decimal(12,4)
- `newStock`: Requerido, decimal(12,4)
- `reason`: Opcional, string (máx 255)
- `metadata`: Opcional, JSON válido

## Reglas de Seguridad

### Bypass del Propietario
- El propietario de la organización (`ownerUserId`) omite todas las verificaciones de permisos
- Esto permite la configuración inicial y previene escenarios de bloqueo
- El propietario puede realizar cualquier acción sin permisos explícitos

### Aislamiento de Datos
- Los usuarios solo pueden acceder a datos de su propia organización
- Las consultas siempre deben filtrar por `organizationId`
- El acceso entre organizaciones está prevenido

### Seguridad de Contraseñas
- Las contraseñas se hashean usando bcryptjs
- Rondas de salt: 10
- Las contraseñas nunca se retornan en las respuestas de la API
- La verificación de contraseñas usa comparación segura

### Seguridad JWT
- Los tokens expiran después del tiempo configurado
- Los tokens se validan en cada petición
- Los tokens inválidos o expirados resultan en 401 Unauthorized

## Manejo de Errores

### Formato de Respuesta de Error
```json
{
  "statusCode": 400,
  "message": "Mensaje de error traducido",
  "errorCode": "error.code.key",
  "errors": {
    "campo": ["Mensaje de error 1", "Mensaje de error 2"]
  }
}
```

### Códigos de Error Comunes
- `permissions.userNotAuthenticated` - Usuario no autenticado
- `permissions.userNotFound` - Usuario no encontrado
- `permissions.insufficientPermissions` - Permisos insuficientes
- `users.emailExists` - El email ya existe
- `users.usernameExists` - El username ya existe
- `users.documentExists` - El número de documento ya existe
- `users.notFound` - Usuario no encontrado
- `roles.notFound` - Rol no encontrado
- `roles.cannotModifySystem` - No se puede modificar rol del sistema
- `validation.invalid` - Error de validación

## Notas para Desarrolladores

1. **Siempre filtrar por organización**: Al consultar datos, siempre incluir filtro `organizationId`
2. **Verificar bypass del propietario**: Antes de verificar permisos, verificar si el usuario es propietario
3. **Usar borrado lógico**: Siempre usar métodos de borrado lógico, nunca borrado físico
4. **Registrar movimientos de inventario**: Todos los cambios de stock deben crear entradas de log
5. **Validar unicidad**: Verificar restricciones de unicidad antes de crear/actualizar
6. **Usar transacciones**: Para operaciones complejas que involucren múltiples modelos, usar transacciones de base de datos
7. **Traducir errores**: Todos los mensajes de error deben usar claves de traducción
8. **Respetar permisos**: Siempre verificar permisos a menos que el usuario sea propietario
9. **Rastrear cambios**: Usar `previousStock` y `newStock` en los logs de inventario
10. **Mantener auditoría**: Registrar acciones importantes en los logs de auditoría
