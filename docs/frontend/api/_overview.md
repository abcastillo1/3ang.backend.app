# Contratos de API — Convenciones generales

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
- **Siempre `Authorization: Bearer <token>`** excepto en `/auth/login` y `/system/health`.

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

Los keys de `errors` usan el formato `data.campo`, correspondiente al path dentro del body.

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

## Endpoints disponibles (todos POST)

| Módulo | Endpoint | Descripción | Auth | Permiso |
|--------|----------|-------------|------|---------|
| **Auth** | `/auth/login` | Login (email + password) | No | — |
| | `/auth/logout` | Cerrar sesión | Sí | — |
| | `/auth/refresh` | Renovar token JWT | Sí | — |
| **Users** | `/users/list` | Listar usuarios de la organización | Sí | — |
| | `/users/create` | Crear usuario | Sí | `users.create` |
| | `/users/update` | Actualizar usuario | Sí | varía |
| | `/users/profile` | Ver perfil propio | Sí | — |
| | `/users/organization` | Ver datos de la organización | Sí | — |
| **Roles** | `/roles/list` | Listar roles | Sí | `roles.view` |
| | `/roles/create` | Crear rol | Sí | `roles.create` |
| | `/roles/update` | Actualizar rol | Sí | `roles.update` |
| | `/roles/delete` | Eliminar rol | Sí | `roles.delete` |
| | `/roles/assign-permissions` | Asignar permisos a rol | Sí | `roles.update` |
| **Permissions** | `/permissions/list` | Listar permisos disponibles | Sí | `permissions.view` |
| **Organizations** | `/organizations/create` | Crear organización | Sí | — |
| | `/organizations/list` | Listar organizaciones | Sí | — |
| | `/organizations/view` | Ver organización | Sí | — |
| | `/organizations/update` | Actualizar organización | Sí | — |
| | `/organizations/tree-template/view` | Ver plantilla de árbol de la organización | Sí | — |
| | `/organizations/tree-template/update` | Personalizar plantilla de árbol (solo owner) | Sí | — |
| | `/organizations/tree-template/reset` | Restaurar plantilla por defecto (solo owner) | Sí | — |
| | `/organizations/permanent-file-template/sections/list` | Listar secciones de la plantilla de archivo permanente | Sí | `organizations.permanentFileTemplate.manage` |
| | `/organizations/permanent-file-template/sections/create` | Crear sección en la plantilla | Sí | `organizations.permanentFileTemplate.manage` |
| | `/organizations/permanent-file-template/sections/view` | Ver sección de plantilla con ítems | Sí | `organizations.permanentFileTemplate.manage` |
| | `/organizations/permanent-file-template/sections/update` | Actualizar sección de plantilla | Sí | `organizations.permanentFileTemplate.manage` |
| | `/organizations/permanent-file-template/sections/delete` | Eliminar sección de plantilla | Sí | `organizations.permanentFileTemplate.manage` |
| | `/organizations/permanent-file-template/items/list` | Listar ítems de una sección de plantilla | Sí | `organizations.permanentFileTemplate.manage` |
| | `/organizations/permanent-file-template/items/create` | Crear ítem en la plantilla | Sí | `organizations.permanentFileTemplate.manage` |
| | `/organizations/permanent-file-template/items/update` | Actualizar ítem de plantilla | Sí | `organizations.permanentFileTemplate.manage` |
| | `/organizations/permanent-file-template/items/delete` | Eliminar ítem de plantilla | Sí | `organizations.permanentFileTemplate.manage` |
| | `/organizations/permanent-file-template/load-defaults` | Cargar plantilla por defecto (solo si está vacía) | Sí | `organizations.permanentFileTemplate.manage` |
| **Files** | `/files/upload-url` | Obtener URL firmada para subir archivo | Sí | `files.upload` |
| | `/files/confirm` | Confirmar subida y registrar documento (solo categorías de auditoría) | Sí | `files.upload` |
| | `/files/link` | Vincular documentos a un proyecto existente | Sí | `files.upload` |
| | `/files/list` | Listar documentos | Sí | `files.upload` |
| | `/files/delete` | Eliminar documento | Sí | `files.upload` |
| | `/files/download-url` | Obtener URL firmada de descarga para un archivo existente | Sí | — |
| **Clients** | `/clients/create` | Crear cliente (auditado) | Sí | `clients.create` |
| | `/clients/list` | Listar clientes (paginación, búsqueda) | Sí | `clients.view` |
| | `/clients/view` | Ver detalle de un cliente (con proyectos) | Sí | `clients.view` |
| | `/clients/update` | Actualizar cliente | Sí | `clients.update` |
| | `/clients/delete` | Eliminar cliente (soft delete) | Sí | `clients.delete` |
| **Projects** | `/projects/create` | Crear proyecto de auditoría | Sí | `projects.create` |
| | `/projects/list` | Listar proyectos (filtros: cliente, estado, búsqueda) | Sí | `projects.view` |
| | `/projects/view` | Ver detalle del proyecto (equipo, cliente, docs) | Sí | `projects.view` |
| | `/projects/update` | Actualizar proyecto (transición de estados) | Sí | `projects.update` |
| | `/projects/delete` | Eliminar proyecto (solo draft) | Sí | `projects.delete` |
| | `/projects/assignments/add` | Asignar usuario al proyecto | Sí | `projects.assignments.manage` |
| | `/projects/assignments/remove` | Quitar usuario del proyecto | Sí | `projects.assignments.manage` |
| | `/projects/assignments/list` | Listar miembros del proyecto | Sí | `projects.view` |
| | `/projects/tree/create` | Crear nodo en el árbol del proyecto | Sí | `projects.tree.manage` |
| | `/projects/tree/list` | Listar hijos de un nodo (o raíz) | Sí | `projects.view` |
| | `/projects/tree/breadcrumb` | Ruta de un nodo a la raíz | Sí | `projects.view` |
| | `/projects/tree/move` | Mover nodo (y descendientes) | Sí | `projects.tree.manage` |
| | `/projects/tree/reorder` | Reordenar nodos dentro del mismo padre | Sí | `projects.tree.manage` |
| | `/projects/tree/delete` | Eliminar nodo y subárbol | Sí | `projects.tree.manage` |
| | `/projects/tree/full` | Obtener árbol completo del proyecto (1 query) | Sí | `projects.view` |
| | `/projects/permanent-file/sections/create` | Crear sección del archivo permanente | Sí | `projects.permanentFile.manage` |
| | `/projects/permanent-file/sections/list` | Listar secciones (por proyecto y opcionalmente padre) | Sí | `projects.view` |
| | `/projects/permanent-file/sections/view` | Ver sección con ítems | Sí | `projects.view` |
| | `/projects/permanent-file/sections/update` | Actualizar sección | Sí | `projects.permanentFile.manage` |
| | `/projects/permanent-file/sections/delete` | Eliminar sección (y ítems) | Sí | `projects.permanentFile.manage` |
| | `/projects/permanent-file/items/create` | Crear ítem del checklist | Sí | `projects.permanentFile.manage` |
| | `/projects/permanent-file/items/list` | Listar ítems de una sección | Sí | `projects.view` |
| | `/projects/permanent-file/items/update` | Actualizar ítem (estado, documento, etc.) | Sí | `projects.permanentFile.manage` |
| | `/projects/permanent-file/items/delete` | Eliminar ítem | Sí | `projects.permanentFile.manage` |
| | `/projects/permanent-file/apply-template` | Aplicar plantilla de la organización al proyecto | Sí | `projects.permanentFile.manage` |
| **Comments** | `/comments/list` | Listar comentarios del ítem (paginado) | Sí | `projects.view` |
| | `/comments/create` | Crear comentario en un ítem | Sí | `projects.view` |
| | `/comments/update` | Actualizar comentario (autor o manage) | Sí | — |
| | `/comments/delete` | Eliminar comentario (soft, autor o manage) | Sí | — |
| **Audit** | `/audit/my-activity` | Ver actividad del usuario (request-level) | Sí | — |
| | `/audit/activity/list` | Listar historial de actividad (org o por proyecto) | Sí | `activity.view` |
| **System** | `/system/health` | Health check | No | — |

---

## Nota sobre el owner

El usuario que creó la organización (`organization.ownerUserId`) tiene acceso total sin importar su rol o permisos asignados. El backend omite la verificación de permisos para este usuario.
