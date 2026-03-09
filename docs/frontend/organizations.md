# Organizaciones y Settings — Guía Frontend

Cada usuario pertenece a una organización. La organización se obtiene automáticamente en el login y se puede consultar con endpoints dedicados.

---

## Datos de la organización del usuario

Se obtiene en el login dentro del campo `organization` de la respuesta. También se puede consultar directamente:

```
POST /api/v1/users/organization
Authorization: Bearer <token>
```

```json
{ "data": {} }
```

**Respuesta:**

```json
{
  "data": {
    "organization": {
      "id": 1,
      "name": "3ANG Auditores S.A.",
      "slug": "3ang-auditores",
      "isActive": true,
      "ownerUserId": 1
    }
  }
}
```

---

## Crear organización

```
POST /api/v1/organizations/create
Authorization: Bearer <token>
```

```json
{
  "data": {
    "name": "Nueva Firma Auditora",
    "slug": "nueva-firma"
  }
}
```

---

## Listar organizaciones

```
POST /api/v1/organizations/list
Authorization: Bearer <token>
```

```json
{ "data": {} }
```

---

## Ver organización

```
POST /api/v1/organizations/view
Authorization: Bearer <token>
```

```json
{
  "data": {
    "id": 1
  }
}
```

---

## Actualizar organización

```
POST /api/v1/organizations/update
Authorization: Bearer <token>
```

```json
{
  "data": {
    "id": 1,
    "name": "3ANG Auditores & Asociados"
  }
}
```

---

## OrganizationSetting (configuración por organización)

Cada organización puede tener settings personalizados que controlan límites y comportamiento de la plataforma. Estos settings se usan en validaciones del backend.

### Settings esperados (por implementar junto con FASE 2)

| Key | Tipo | Default | Descripción |
|-----|------|---------|-------------|
| `max_users` | int | `10` | Máximo de usuarios que la organización puede crear |
| `max_audit_projects` | int | `50` | Máximo de proyectos de auditoría |
| `allowed_audit_types` | json | `["financial","tax","compliance"]` | Tipos de auditoría habilitados |
| `storage_limit_mb` | int | `5120` | Límite de almacenamiento en MB |

### Cómo usar en el frontend

El frontend no necesita consultar los settings directamente en la mayoría de los casos. El backend valida automáticamente los límites. Si el usuario intenta exceder un límite, el backend retorna un error como:

```json
{
  "statusCode": 400,
  "errorCode": "organization.maxUsersReached",
  "message": "Se alcanzó el límite máximo de usuarios para esta organización"
}
```

El frontend solo necesita manejar estos errores mostrando el mensaje al usuario.

### Si necesitas mostrar los límites en la UI

Cuando se implemente el endpoint, se podrá consultar:

```
POST /api/v1/organizations/settings
Authorization: Bearer <token>
```

```json
{ "data": {} }
```

Retornará los settings como un objeto key-value, útil para mostrar en dashboards:

```json
{
  "data": {
    "settings": {
      "max_users": 10,
      "max_audit_projects": 50,
      "allowed_audit_types": ["financial", "tax", "compliance"],
      "storage_limit_mb": 5120
    }
  }
}
```
